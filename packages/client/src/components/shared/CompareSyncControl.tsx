import { useAppStore } from '../../store/useAppStore';

type Props = {
  slotId: string;
  locked: boolean;
  synced: boolean;
  onToggleLock: () => void;
  onToggleSync: (synced: boolean) => void;
  compact?: boolean;
  lockToggleDisabled?: boolean;
  lockToggleDisabledReason?: string | null;
};

export const CompareSyncControl = ({
  slotId,
  locked,
  synced,
  onToggleLock,
  onToggleSync,
  compact = false,
  lockToggleDisabled = false,
  lockToggleDisabledReason = null,
}: Props) => {
  const isCompareActive = useAppStore((state) => state.compareWorkspace.slotOrder.length > 1);
  if (!isCompareActive) {
    return null;
  }

  const iconSize = compact ? 12 : 14;
  const iconStroke = 1.8;

  const lockIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth={iconStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth={iconStroke}
      />
    </svg>
  );

  const unlockIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 10V7a5 5 0 0 0-9.2-2.7"
        stroke="currentColor"
        strokeWidth={iconStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth={iconStroke}
      />
    </svg>
  );

  const commonClass = `inline-flex items-center justify-center rounded border transition ${compact ? 'h-6 w-6' : 'h-7 w-7'}`;

  if (slotId === 'A') {
    return (
      <button
        type="button"
        onClick={onToggleLock}
        disabled={lockToggleDisabled}
        className={`${commonClass} ${
          locked
            ? 'border-brand-navy bg-brand-navy text-white'
            : 'border-brand-border bg-white text-slate-600'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        title={
          lockToggleDisabled && lockToggleDisabledReason
            ? lockToggleDisabledReason
            : locked
              ? 'Unlock this parameter from A master sync'
              : 'Lock this parameter to A master sync'
        }
        aria-label={locked ? 'Unlock from A master sync' : 'Lock to A master sync'}
      >
        {locked ? lockIcon : unlockIcon}
      </button>
    );
  }

  if (!locked) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onToggleSync(!synced)}
      className={`${commonClass} ${
        synced
          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
          : 'border-amber-600 bg-amber-50 text-amber-700'
      }`}
      title={synced ? 'Unsync from A so this slot becomes editable' : 'Resync from A and overwrite local value'}
      aria-label={synced ? 'Synced to A. Click to unsync' : 'Unsynced from A. Click to resync'}
    >
      {synced ? lockIcon : unlockIcon}
    </button>
  );
};
