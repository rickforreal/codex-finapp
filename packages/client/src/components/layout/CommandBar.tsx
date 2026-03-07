import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import {
  AppMode,
  DrawdownStrategyType,
  SimulationMode,
  ThemeAppearance,
  type BookmarkRecord,
  type ActualMonthOverride,
  type ActualOverridesByMonth,
} from '@finapp/shared';

import { runSimulation } from '../../api/simulationApi';
import {
  applyBookmark,
  createBookmark,
  deleteBookmark,
  listBookmarks,
  migrateLocalStorageToDatabase,
  BookmarkStorageError,
} from '../../store/bookmarks';
import { SnapshotLoadError, parseSnapshot, serializeSnapshot } from '../../store/snapshot';
import {
  getTrackingActualOverridesForRun,
  getCompareConfigs,
  getCurrentConfig,
  useIsCompareActive,
  useAppStore,
} from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';

const mergeRowsWithPreservedBoundary = <
  T extends {
    endBalances: { stocks: number; bonds: number; cash: number };
  },
>(
  nextRows: T[],
  preservedRows: T[],
  boundaryMonthIndex: number,
): { rows: T[]; terminalPortfolioValue: number | null } => {
  const mergedRows = [...nextRows];
  if (boundaryMonthIndex > 0 && preservedRows.length === mergedRows.length) {
    for (let index = 0; index < boundaryMonthIndex; index += 1) {
      mergedRows[index] = preservedRows[index] ?? mergedRows[index]!;
    }
  }

  const terminal = mergedRows[mergedRows.length - 1]?.endBalances;
  return {
    rows: mergedRows,
    terminalPortfolioValue: terminal ? terminal.stocks + terminal.bonds + terminal.cash : null,
  };
};

type RowWithBalancesAndWithdrawals = {
  startBalances: { stocks: number; bonds: number; cash: number };
  marketChange: { stocks: number; bonds: number; cash: number };
  withdrawals: { byAsset: { stocks: number; bonds: number; cash: number } };
  endBalances: { stocks: number; bonds: number; cash: number };
};

const deriveBoundaryEndBalances = (
  row: RowWithBalancesAndWithdrawals,
  override: ActualMonthOverride | undefined,
): { stocks: number; bonds: number; cash: number } => {
  const startStocks = override?.startBalances?.stocks ?? row.startBalances.stocks;
  const startBonds = override?.startBalances?.bonds ?? row.startBalances.bonds;
  const startCash = override?.startBalances?.cash ?? row.startBalances.cash;

  const deltaStocks =
    override?.startBalances?.stocks !== undefined
      ? override.startBalances.stocks - row.startBalances.stocks
      : 0;
  const deltaBonds =
    override?.startBalances?.bonds !== undefined
      ? override.startBalances.bonds - row.startBalances.bonds
      : 0;
  const deltaCash =
    override?.startBalances?.cash !== undefined
      ? override.startBalances.cash - row.startBalances.cash
      : 0;

  const moveStocks = row.marketChange.stocks + deltaStocks;
  const moveBonds = row.marketChange.bonds + deltaBonds;
  const moveCash = row.marketChange.cash + deltaCash;

  const wdStocks = override?.withdrawalsByAsset?.stocks ?? row.withdrawals.byAsset.stocks;
  const wdBonds = override?.withdrawalsByAsset?.bonds ?? row.withdrawals.byAsset.bonds;
  const wdCash = override?.withdrawalsByAsset?.cash ?? row.withdrawals.byAsset.cash;

  return {
    stocks: Math.max(0, Math.round(startStocks + moveStocks - wdStocks)),
    bonds: Math.max(0, Math.round(startBonds + moveBonds - wdBonds)),
    cash: Math.max(0, Math.round(startCash + moveCash - wdCash)),
  };
};

const withBoundaryStartAnchor = (
  overrides: ActualOverridesByMonth | undefined,
  boundaryMonthIndex: number | null,
  preservedRows: RowWithBalancesAndWithdrawals[],
): ActualOverridesByMonth | undefined => {
  if (boundaryMonthIndex === null || boundaryMonthIndex <= 0) {
    return overrides;
  }

  const boundaryRow = preservedRows[boundaryMonthIndex - 1];
  if (!boundaryRow) {
    return overrides;
  }

  const nextMonthIndex = boundaryMonthIndex + 1;
  const boundaryOverride = overrides?.[boundaryMonthIndex];
  const anchoredStartBalances = deriveBoundaryEndBalances(boundaryRow, boundaryOverride);
  const nextOverrides = { ...(overrides ?? {}) };
  const nextMonthOverride = nextOverrides[nextMonthIndex] ?? {};

  nextOverrides[nextMonthIndex] = {
    ...nextMonthOverride,
    startBalances: {
      ...(nextMonthOverride.startBalances ?? {}),
      stocks: anchoredStartBalances.stocks,
      bonds: anchoredStartBalances.bonds,
      cash: anchoredStartBalances.cash,
    },
  };

  return nextOverrides;
};

const resolveCompareParallelism = (maxRequestedRuns: number): number => {
  if (maxRequestedRuns >= 10_000) {
    return 2;
  }
  if (maxRequestedRuns >= 5_000) {
    return 3;
  }
  if (maxRequestedRuns >= 2_500) {
    return 4;
  }
  return 8;
};

export const CommandBar = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedThemeRowRef = useRef<HTMLButtonElement | null>(null);
  const bookmarksMenuRef = useRef<HTMLDivElement | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [bookmarksMenuOpen, setBookmarksMenuOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [commandMessage, setCommandMessage] = useState<string | null>(null);
  const mode = useAppStore((state) => state.mode);
  const isCompareActive = useIsCompareActive();
  const status = useAppStore((state) => state.simulationResults.status);
  const setMode = useAppStore((state) => state.setMode);
  const setSimulationStatus = useAppStore((state) => state.setSimulationStatus);
  const setSimulationResult = useAppStore((state) => state.setSimulationResult);
  const setCompareSlotSimulationStatus = useAppStore(
    (state) => state.setCompareSlotSimulationStatus,
  );
  const setCompareSlotSimulationResult = useAppStore(
    (state) => state.setCompareSlotSimulationResult,
  );
  const drawdownType = useAppStore((state) => state.drawdownStrategy.type);
  const targetAllocation = useAppStore(
    (state) => state.drawdownStrategy.rebalancing.targetAllocation,
  );
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const startDate = useAppStore((state) => state.coreParams.retirementStartDate);
  const clearAllActualOverrides = useAppStore((state) => state.clearAllActualOverrides);
  const theme = useAppStore((state) => state.theme);
  const setSelectedThemeFamilyId = useAppStore((state) => state.setSelectedThemeFamilyId);
  const setThemeAppearanceForFamily = useAppStore((state) => state.setThemeAppearanceForFamily);
  const setThemeState = useAppStore((state) => state.setThemeState);
  const setStateFromSnapshot = useAppStore((state) => state.setStateFromSnapshot);
  const compareWorkspace = useAppStore((state) => state.compareWorkspace);
  const canRunActiveWorkspace =
    drawdownType !== DrawdownStrategyType.Rebalancing ||
    Math.abs(targetAllocation.stocks + targetAllocation.bonds + targetAllocation.cash - 1) <
      0.000001;

  const refreshBookmarks = useCallback(async () => {
    try {
      const list = await listBookmarks();
      setBookmarks(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load bookmarks.';
      setCommandMessage(message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await migrateLocalStorageToDatabase();
      await refreshBookmarks();
    };
    void init();
  }, [refreshBookmarks]);

  useEffect(() => {
    if (!themeMenuOpen) {
      return;
    }
    selectedThemeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [themeMenuOpen, theme.selectedThemeFamilyId]);

  useEffect(() => {
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (themeMenuOpen && themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setThemeMenuOpen(false);
      }
      if (
        bookmarksMenuOpen &&
        bookmarksMenuRef.current &&
        !bookmarksMenuRef.current.contains(target)
      ) {
        setBookmarksMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [bookmarksMenuOpen, themeMenuOpen]);

  const orderedThemeFamilies = useMemo(() => {
    const pinnedOrder = [
      'default',
      'highContrast',
      'moneyNeverSleeps',
      'patagoniaVest',
      'stayTheCourse',
    ] as const;
    const forcedLastId = 'nineteen29Vibes';
    const pinnedRank = new Map<string, number>(pinnedOrder.map((id, index) => [id, index]));

    return [...theme.families].sort((left, right) => {
      const leftRank = pinnedRank.get(left.id);
      const rightRank = pinnedRank.get(right.id);
      if (leftRank !== undefined || rightRank !== undefined) {
        if (leftRank === undefined) {
          return 1;
        }
        if (rightRank === undefined) {
          return -1;
        }
        return leftRank - rightRank;
      }

      if (left.id === forcedLastId || right.id === forcedLastId) {
        if (left.id === forcedLastId && right.id !== forcedLastId) {
          return 1;
        }
        if (right.id === forcedLastId && left.id !== forcedLastId) {
          return -1;
        }
      }

      return left.name.localeCompare(right.name);
    });
  }, [theme.families]);

  const getDefaultSnapshotName = () => {
    const now = new Date();
    const date = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Snapshot ${date} ${time}`;
  };

  const getDefaultBookmarkName = () => {
    const now = new Date();
    const date = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Bookmark ${date} ${time}`;
  };

  const handleSaveSnapshot = () => {
    const requestedName = window.prompt('Snapshot name', getDefaultSnapshotName());
    const name = requestedName?.trim();
    if (!name) {
      return;
    }

    const { json, filename } = serializeSnapshot(name);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setCommandMessage(`Saved snapshot: ${name}`);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSnapshot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }

    if (!window.confirm('Loading a snapshot will replace your current state. Continue?')) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = parseSnapshot(raw);
      setStateFromSnapshot(parsed.data);
      // Theme catalog is server-authoritative; force refresh so older snapshots
      // pick up newly added built-in themes while keeping selected family selection.
      setThemeState({
        variants: [],
        families: [],
        legacyThemes: [],
        legacyCatalog: [],
        slotCatalog: [],
        validationIssues: [],
        status: 'idle',
        errorMessage: null,
      });
      setCommandMessage(`Loaded snapshot: ${parsed.name}`);
    } catch (error) {
      if (error instanceof SnapshotLoadError) {
        window.alert(error.message);
        return;
      }
      window.alert("This file doesn't appear to be a valid snapshot.");
    }
  };

  const handleOpenCreateBookmark = () => {
    setBookmarkName(getDefaultBookmarkName());
    setBookmarkModalOpen(true);
    setBookmarksMenuOpen(false);
    setThemeMenuOpen(false);
  };

  const handleCreateBookmark = async () => {
    const name = bookmarkName.trim();
    if (!name) {
      return;
    }

    const description = bookmarkDescription.trim();
    try {
      await createBookmark(name, { description });
      await refreshBookmarks();
      setBookmarkModalOpen(false);
      setBookmarkName('');
      setBookmarkDescription('');
      setCommandMessage(`Saved bookmark: ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save bookmark.';
      setCommandMessage(message);
    }
  };

  const handleLoadBookmark = async (bookmarkId: string) => {
    try {
      const { bookmark, data } = await applyBookmark(bookmarkId);
      setStateFromSnapshot(data);
      setThemeState({
        variants: [],
        families: [],
        legacyThemes: [],
        legacyCatalog: [],
        slotCatalog: [],
        validationIssues: [],
        status: 'idle',
        errorMessage: null,
      });
      setBookmarksMenuOpen(false);
      setCommandMessage(`Loaded bookmark: ${bookmark.name}`);
    } catch (error) {
      if (error instanceof BookmarkStorageError || error instanceof SnapshotLoadError) {
        setCommandMessage(error.message);
        return;
      }
      setCommandMessage('Failed to load bookmark.');
    }
  };

  const handleDeleteBookmark = async (bookmark: BookmarkRecord) => {
    if (!window.confirm(`Delete bookmark "${bookmark.name}"?`)) {
      return;
    }

    try {
      const removed = await deleteBookmark(bookmark.id);
      if (removed) {
        await refreshBookmarks();
        setCommandMessage(`Deleted bookmark: ${bookmark.name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete bookmark.';
      setCommandMessage(message);
    }
  };

  const handleRunSimulation = async () => {
    if (!canRunActiveWorkspace) {
      setSimulationStatus('error', 'Rebalancing target allocation must sum to 100%.');
      return;
    }
    try {
      if (isCompareActive) {
        const compareConfigs = getCompareConfigs();
        if (compareConfigs.length <= 1) {
          setSimulationStatus(
            'error',
            'Multi-portfolio run requires at least two configured portfolios.',
          );
          return;
        }
        const hasInvalidAllocation = compareConfigs.some(({ config }) => {
          if (config.drawdownStrategy.type !== DrawdownStrategyType.Rebalancing) {
            return false;
          }
          const allocation = config.drawdownStrategy.rebalancing.targetAllocation;
          const sum = allocation.stocks + allocation.bonds + allocation.cash;
          return Math.abs(sum - 1) >= 0.000001;
        });
        if (hasInvalidAllocation) {
          setSimulationStatus(
            'error',
            'Rebalancing target allocation must sum to 100% for all compare portfolios.',
          );
          return;
        }

        const seed = Math.floor(Math.random() * 2_147_483_000);
        const trackingActualOverrides =
          mode === AppMode.Tracking ? getTrackingActualOverridesForRun() : undefined;
        const canonicalBoundary =
          mode === AppMode.Tracking
            ? (compareWorkspace.slots.A?.lastEditedMonthIndex ?? null)
            : null;
        compareConfigs.forEach(({ slotId }) => setCompareSlotSimulationStatus(slotId, 'running'));
        const queue = [...compareConfigs];
        const maxRequestedRuns = compareConfigs.reduce((max, { config }) => {
          if (config.simulationMode !== SimulationMode.MonteCarlo) {
            return max;
          }
          const runs = Math.max(1, Math.min(Math.round(config.simulationRuns ?? 1000), 10000));
          return Math.max(max, runs);
        }, 1);
        const maxParallel = resolveCompareParallelism(maxRequestedRuns);
        const failures: string[] = [];
        const workers = Array.from({ length: Math.min(maxParallel, queue.length) }, async () => {
          while (queue.length > 0) {
            const next = queue.shift();
            if (!next) {
              break;
            }
            const { slotId, config } = next;
            try {
              const requestedMode = config.simulationMode;
              const existingResultForSlot = (() => {
                const workspace = compareWorkspace.slots[slotId];
                if (!workspace) {
                  return null;
                }
                const preferred =
                  requestedMode === SimulationMode.Manual
                    ? workspace.simulationResults.manual
                    : workspace.simulationResults.monteCarlo;
                return (
                  preferred ??
                  workspace.simulationResults.manual ??
                  workspace.simulationResults.monteCarlo
                );
              })();
              const effectiveOverrides =
                mode === AppMode.Tracking
                  ? withBoundaryStartAnchor(
                      trackingActualOverrides,
                      canonicalBoundary,
                      (existingResultForSlot?.result.rows ?? []) as RowWithBalancesAndWithdrawals[],
                    )
                  : trackingActualOverrides;
              const response = await runSimulation({
                config,
                seed,
                actualOverridesByMonth: effectiveOverrides,
              });
              if (
                mode === AppMode.Tracking &&
                canonicalBoundary !== null &&
                canonicalBoundary > 0 &&
                existingResultForSlot
              ) {
                const merged = mergeRowsWithPreservedBoundary(
                  response.result.rows,
                  existingResultForSlot.result.rows,
                  canonicalBoundary,
                );
                const mergedResponse = {
                  ...response,
                  result: {
                    ...response.result,
                    rows: merged.rows,
                    summary: {
                      ...response.result.summary,
                      terminalPortfolioValue:
                        merged.terminalPortfolioValue ??
                        response.result.summary.terminalPortfolioValue,
                    },
                  },
                };
                setCompareSlotSimulationResult(slotId, response.simulationMode, mergedResponse);
              } else {
                setCompareSlotSimulationResult(slotId, response.simulationMode, response);
              }
            } catch (error) {
              const message =
                error instanceof Error ? error.message : `Compare ${slotId} simulation failed`;
              setCompareSlotSimulationStatus(slotId, 'error', message);
              failures.push(`${slotId}: ${message}`);
            }
          }
        });
        await Promise.all(workers);
        if (failures.length > 0) {
          setSimulationStatus('error', failures.join(' | '));
        }
        return;
      }

      setSimulationStatus('running');
      const config = getCurrentConfig();
      const trackingActualOverrides =
        mode === AppMode.Tracking ? getTrackingActualOverridesForRun() : undefined;
      if (
        mode === AppMode.Tracking &&
        lastEditedMonthIndex !== null
      ) {
        const state = useAppStore.getState();
        const visibleRows =
          (
            state.simulationResults.reforecast ??
            state.simulationResults.manual ??
            state.simulationResults.monteCarlo
          )?.result.rows ?? [];
        const effectiveOverrides = withBoundaryStartAnchor(
          trackingActualOverrides,
          lastEditedMonthIndex,
          visibleRows as RowWithBalancesAndWithdrawals[],
        );
        const result = await runSimulation({ config, actualOverridesByMonth: effectiveOverrides });
        const merged = mergeRowsWithPreservedBoundary(
          result.result.rows,
          visibleRows,
          lastEditedMonthIndex,
        );

        const mergedResult = {
          ...result,
          result: {
            ...result.result,
            rows: merged.rows,
            summary: {
              ...result.result.summary,
              terminalPortfolioValue:
                merged.terminalPortfolioValue ?? result.result.summary.terminalPortfolioValue,
            },
          },
        };
        setSimulationResult(result.simulationMode, mergedResult);
        return;
      }

      const result = await runSimulation({
        config,
        actualOverridesByMonth: trackingActualOverrides,
      });
      setSimulationResult(result.simulationMode, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown simulation error';
      setSimulationStatus('error', message);
    }
  };

  return (
    <header className="theme-commandbar-shell sticky top-0 z-10 border-b px-4 py-2 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-[220px] shrink-0 items-center gap-3 border-r border-brand-border pr-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue text-lg font-bold text-white">
            F
          </div>
          <p className="theme-commandbar-logo-text text-[2rem] font-semibold leading-none">
            FinApp
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="flex min-w-[160px] flex-col gap-1">
              <p className="theme-commandbar-section-label px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                View Mode
              </p>
              <SegmentedToggle
                value={mode}
                onChange={setMode}
                options={[
                  { label: 'Planning', value: AppMode.Planning },
                  { label: 'Tracking', value: AppMode.Tracking },
                ]}
              />
            </div>

            {mode === AppMode.Tracking ? (
              <div className="flex min-w-[180px] flex-col gap-1">
                <p className="theme-commandbar-section-label px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Tracking
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {lastEditedMonthIndex !== null ? (
                    <button
                      type="button"
                      onClick={clearAllActualOverrides}
                      className="theme-commandbar-action-btn rounded border px-2.5 py-1 text-xs font-medium"
                    >
                      Clear Actuals
                    </button>
                  ) : null}
                  <p className="theme-commandbar-muted text-xs">
                    {lastEditedMonthIndex === null
                      ? 'No actuals entered'
                      : `Actuals through: ${new Date(
                          startDate.year,
                          startDate.month - 1 + (lastEditedMonthIndex - 1),
                          1,
                        ).toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })}`}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {commandMessage ? (
            <p className="theme-commandbar-muted mt-1 text-xs">{commandMessage}</p>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="group relative">
            <button
              type="button"
              onClick={handleOpenCreateBookmark}
              className="theme-commandbar-action-btn grid h-9 w-9 place-items-center rounded-md border transition"
              aria-label="Create bookmark"
              title="Create Bookmark"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h10" />
                <path d="M4 12h10" />
                <path d="M4 17h7" />
                <path d="M16 11v8" />
                <path d="M12 15h8" />
              </svg>
            </button>
            <span className="theme-commandbar-tooltip pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium opacity-0 transition group-hover:opacity-100">
              Create Bookmark
            </span>
          </div>
          <div ref={bookmarksMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setBookmarksMenuOpen((open) => !open);
                setThemeMenuOpen(false);
              }}
              className="theme-commandbar-action-btn flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition"
              aria-label="Bookmarks"
              title="Bookmarks"
            >
              <span>Bookmarks</span>
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m5 8 5 5 5-5" />
              </svg>
            </button>
            {bookmarksMenuOpen ? (
              <div className="theme-commandbar-popover absolute right-0 top-11 z-30 w-80 rounded-md border p-2 shadow-lg">
                <p className="theme-commandbar-popover-title px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide">
                  Bookmarks
                </p>
                <div className="theme-commandbar-scrollbar max-h-72 overflow-y-auto">
                  {bookmarks.length === 0 ? (
                    <p className="theme-commandbar-muted px-2 py-2 text-xs">
                      No bookmarks saved yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {bookmarks.map((bookmark) => (
                        <button
                          key={bookmark.id}
                          type="button"
                          onClick={() => handleLoadBookmark(bookmark.id)}
                          className="theme-commandbar-popover-item group flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition"
                          title={bookmark.description || undefined}
                        >
                          <span className="min-w-0">
                            <span className="theme-commandbar-popover-item-name block truncate text-sm">
                              {bookmark.name}
                            </span>
                            <span className="theme-commandbar-muted block text-[11px]">
                              {new Date(bookmark.savedAt).toLocaleString()}
                              {bookmark.description ? ` · ${bookmark.description}` : null}
                            </span>
                          </span>
                          <span className="shrink-0">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleDeleteBookmark(bookmark);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') {
                                  return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                handleDeleteBookmark(bookmark);
                              }}
                              className="theme-commandbar-delete-btn grid h-7 w-7 place-items-center rounded opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                              aria-label={`Delete bookmark ${bookmark.name}`}
                              title="Delete bookmark"
                            >
                              <svg
                                viewBox="0 0 20 20"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <path d="M3.5 5.5h13" />
                                <path d="M7.5 5.5V4A1.5 1.5 0 0 1 9 2.5h2A1.5 1.5 0 0 1 12.5 4v1.5" />
                                <path d="m6.5 5.5.7 10a1.5 1.5 0 0 0 1.5 1.4h2.6a1.5 1.5 0 0 0 1.5-1.4l.7-10" />
                              </svg>
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div ref={themeMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setThemeMenuOpen((open) => !open);
                setBookmarksMenuOpen(false);
              }}
              className="theme-commandbar-action-btn grid h-9 w-9 place-items-center rounded-md border transition"
              aria-label="Select theme"
              title="Select Theme"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3a9 9 0 1 0 9 9c0-1.7-1.3-3-3-3h-1.2a2.8 2.8 0 0 1-2.8-2.8V5.5A2.5 2.5 0 0 0 12 3Z" />
                <circle cx="7.5" cy="11.5" r=".8" />
                <circle cx="9.8" cy="7.7" r=".8" />
                <circle cx="14.4" cy="7.6" r=".8" />
              </svg>
            </button>
            {themeMenuOpen ? (
              <div className="theme-commandbar-popover absolute right-0 top-11 z-30 w-64 rounded-md border p-2 shadow-lg">
                <p className="theme-commandbar-popover-title px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide">
                  Theme
                </p>
                <div className="theme-commandbar-scrollbar max-h-80 space-y-1 overflow-y-auto pr-1">
                  {orderedThemeFamilies.map((family) => {
                    const selected = family.id === theme.selectedThemeFamilyId;
                    const supportsLight = family.supportedAppearances.includes(
                      ThemeAppearance.Light,
                    );
                    const supportsDark = family.supportedAppearances.includes(ThemeAppearance.Dark);
                    const selectedAppearance = theme.selectedAppearanceByFamily[family.id];
                    return (
                      <button
                        key={family.id}
                        ref={(element) => {
                          if (selected) {
                            selectedThemeRowRef.current = element;
                          }
                        }}
                        type="button"
                        onClick={() => {
                          setSelectedThemeFamilyId(family.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`theme-commandbar-popover-item flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition ${
                          selected ? 'theme-commandbar-popover-item-active' : ''
                        }`}
                      >
                        <span>{family.name}</span>
                        {family.isHighContrast ? (
                          <span className="theme-commandbar-tag rounded px-1.5 py-0.5 text-[10px]">
                            A11y
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (!supportsLight) {
                                  return;
                                }
                                setSelectedThemeFamilyId(family.id);
                                setThemeAppearanceForFamily(family.id, ThemeAppearance.Light);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') {
                                  return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                if (!supportsLight) {
                                  return;
                                }
                                setSelectedThemeFamilyId(family.id);
                                setThemeAppearanceForFamily(family.id, ThemeAppearance.Light);
                              }}
                              className={`grid h-6 w-6 place-items-center rounded ${
                                selectedAppearance === ThemeAppearance.Light
                                  ? 'theme-commandbar-popover-item-active'
                                  : ''
                              } ${supportsLight ? '' : 'opacity-40'}`}
                              aria-label={`${family.name} light`}
                              title="Light appearance"
                            >
                              <svg
                                viewBox="0 0 20 20"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <circle cx="10" cy="10" r="3.2" />
                                <path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.1 4.1l1.5 1.5M14.4 14.4l1.5 1.5M15.9 4.1l-1.5 1.5M5.6 14.4l-1.5 1.5" />
                              </svg>
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (!supportsDark) {
                                  return;
                                }
                                setSelectedThemeFamilyId(family.id);
                                setThemeAppearanceForFamily(family.id, ThemeAppearance.Dark);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') {
                                  return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                if (!supportsDark) {
                                  return;
                                }
                                setSelectedThemeFamilyId(family.id);
                                setThemeAppearanceForFamily(family.id, ThemeAppearance.Dark);
                              }}
                              className={`grid h-6 w-6 place-items-center rounded ${
                                selectedAppearance === ThemeAppearance.Dark
                                  ? 'theme-commandbar-popover-item-active'
                                  : ''
                              } ${supportsDark ? '' : 'opacity-40'}`}
                              aria-label={`${family.name} dark`}
                              title="Dark appearance"
                            >
                              <svg
                                viewBox="0 0 20 20"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <path d="M12.7 2.5a6.8 6.8 0 1 0 4.8 10.8A6.2 6.2 0 0 1 12.7 2.5Z" />
                              </svg>
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {orderedThemeFamilies.length === 0 ? (
                    <p className="theme-commandbar-muted px-2 py-1 text-xs">
                      {theme.status === 'error'
                        ? (theme.errorMessage ?? 'Failed to load themes')
                        : 'Loading themes...'}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="group relative">
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="theme-commandbar-action-btn grid h-9 w-9 place-items-center rounded-md border transition"
              aria-label="Save snapshot"
              title="Save Snapshot"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v10" />
                <path d="m8 9 4 4 4-4" />
                <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
              </svg>
            </button>
            <span className="theme-commandbar-tooltip pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium opacity-0 transition group-hover:opacity-100">
              Save Snapshot
            </span>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={handleLoadClick}
              className="theme-commandbar-action-btn grid h-9 w-9 place-items-center rounded-md border transition"
              aria-label="Load snapshot"
              title="Load Snapshot"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21V11" />
                <path d="m8 15 4-4 4 4" />
                <path d="M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
              </svg>
            </button>
            <span className="theme-commandbar-tooltip pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium opacity-0 transition group-hover:opacity-100">
              Load Snapshot
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleRunSimulation()}
            disabled={!canRunActiveWorkspace}
            className="theme-commandbar-primary-btn rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed"
          >
            {status === 'running' ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => void handleLoadSnapshot(event)}
        />
      </div>

      {bookmarkModalOpen ? (
        <div className="theme-commandbar-modal-backdrop fixed inset-0 z-40 grid place-items-center px-4">
          <div className="theme-commandbar-modal w-full max-w-md rounded-lg border p-4 shadow-lg">
            <h2 className="theme-commandbar-modal-title text-base font-semibold">
              Create Bookmark
            </h2>
            <p className="theme-commandbar-modal-text mt-1 text-sm">
              Save the current full app state to browser bookmarks.
            </p>
            <label
              className="theme-commandbar-section-label mt-3 block text-xs font-semibold uppercase tracking-wide"
              htmlFor="bookmark-name-input"
            >
              Bookmark Name
            </label>
            <input
              id="bookmark-name-input"
              value={bookmarkName}
              onChange={(event) => setBookmarkName(event.target.value)}
              className="theme-input-control mt-1 h-10 w-full rounded border px-3 text-sm"
              autoFocus
            />
            <label
              className="theme-commandbar-section-label mt-3 block text-xs font-semibold uppercase tracking-wide"
              htmlFor="bookmark-description-input"
            >
              Description (optional)
            </label>
            <input
              id="bookmark-description-input"
              value={bookmarkDescription}
              onChange={(event) => setBookmarkDescription(event.target.value)}
              className="theme-input-control mt-1 h-10 w-full rounded border px-3 text-sm"
              placeholder="Add a note about this bookmark..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBookmarkModalOpen(false);
                  setBookmarkName('');
                  setBookmarkDescription('');
                }}
                className="theme-commandbar-action-btn rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBookmark}
                disabled={bookmarkName.trim().length === 0}
                className="theme-commandbar-primary-btn rounded-md px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
