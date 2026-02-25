import { getCompareSlotColorVar } from '../../../lib/compareSlotColors';
import { useAppStore, type CompareSlotId } from '../../../store/useAppStore';

type CompareSlotTabsProps = {
  slotOrder: CompareSlotId[];
  activeLedgerSlotId: string;
};

export const CompareSlotTabs = ({ slotOrder, activeLedgerSlotId }: CompareSlotTabsProps) => {
  const compareBaselineSlotId = useAppStore((state) => state.compareWorkspace.baselineSlotId);
  const setCompareActiveSlot = useAppStore((state) => state.setCompareActiveSlot);

  return (
    <div className="border-b border-brand-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {slotOrder.map((slotId) => {
          const slotColor = getCompareSlotColorVar(slotId);
          const isActive = activeLedgerSlotId === slotId;
          const isBaseline = compareBaselineSlotId === slotId;
          const chipShadows: string[] = [];
          if (isBaseline) {
            chipShadows.push(
              '0 0 0 2px var(--theme-color-surface-primary)',
              `0 0 0 4px ${slotColor}`,
            );
          }
          if (isActive) {
            chipShadows.push(`0 0 0 2px color-mix(in srgb, ${slotColor} 26%, transparent)`);
          }
          return (
            <div key={`ledger-tab-${slotId}`} className="flex flex-col items-center gap-1 pb-0.5">
              <button
                type="button"
                onClick={() => setCompareActiveSlot(slotId)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition"
                style={{
                  borderColor: slotColor,
                  backgroundColor: isActive
                    ? slotColor
                    : `color-mix(in srgb, ${slotColor} 22%, var(--theme-color-surface-primary))`,
                  color: isActive
                    ? 'var(--theme-color-text-inverse)'
                    : `color-mix(in srgb, ${slotColor} 72%, var(--theme-color-text-primary))`,
                  boxShadow: chipShadows.length > 0 ? chipShadows.join(', ') : undefined,
                }}
              >
                {slotId}
              </button>
              {isBaseline ? (
                <span className="pointer-events-none text-[10px] font-normal leading-none text-[var(--theme-color-text-secondary)]">
                  Base
                </span>
              ) : (
                <span className="pointer-events-none text-[10px] leading-none opacity-0" aria-hidden>
                  Base
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
