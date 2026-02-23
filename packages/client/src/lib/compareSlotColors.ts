import type { CompareSlotId } from '../store/useAppStore';

const compareSlotColorVars: Record<CompareSlotId, string> = {
  A: 'var(--theme-chart-compare-slot-a)',
  B: 'var(--theme-chart-compare-slot-b)',
  C: 'var(--theme-chart-compare-slot-c)',
  D: 'var(--theme-chart-compare-slot-d)',
  E: 'var(--theme-chart-compare-slot-e)',
  F: 'var(--theme-chart-compare-slot-f)',
  G: 'var(--theme-chart-compare-slot-g)',
  H: 'var(--theme-chart-compare-slot-h)',
};

export const getCompareSlotColorVar = (slotId: CompareSlotId): string => compareSlotColorVars[slotId];
