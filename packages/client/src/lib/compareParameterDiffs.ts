import { AssetClass, DrawdownStrategyType, WithdrawalStrategyType, type SimulationConfig } from '@finapp/shared';

import { formatCurrency, formatPercent } from './format';

type SlotId = string;

type DiffValue = {
  display: string;
  normalized: string;
};

export type CompareParameterDiffRow = {
  key: string;
  label: string;
  group?: string;
  valuesBySlot: Record<SlotId, string>;
  isDifferent: boolean;
  differsFromBaselineBySlot: Record<SlotId, boolean>;
};

export type CompareParameterDiffResult = {
  rows: CompareParameterDiffRow[];
  differenceCount: number;
};

type BuildCompareParameterDiffsInput = {
  slotOrder: SlotId[];
  baselineSlotId: SlotId;
  slotConfigsById: Partial<Record<SlotId, SimulationConfig>>;
};

type WithdrawalParamKey =
  | 'initialWithdrawalRate'
  | 'annualWithdrawalRate'
  | 'expectedRealReturn'
  | 'drawdownTarget'
  | 'expectedRateOfReturn'
  | 'fallbackExpectedRateOfReturn'
  | 'lookbackMonths'
  | 'smoothingEnabled'
  | 'smoothingBlend'
  | 'baseWithdrawalRate'
  | 'extrasWithdrawalRate'
  | 'minimumFloor'
  | 'capitalPreservationTrigger'
  | 'capitalPreservationCut'
  | 'prosperityTrigger'
  | 'prosperityRaise'
  | 'guardrailsSunset'
  | 'ceiling'
  | 'floor'
  | 'spendingRate'
  | 'smoothingWeight'
  | 'pmtExpectedReturn'
  | 'priorYearWeight'
  | 'capeWeight'
  | 'startingCape';

type ValueKind = 'currency' | 'percent' | 'integer' | 'number' | 'text' | 'boolean';

const NOT_APPLICABLE: DiffValue = {
  display: 'N/A',
  normalized: '__NA__',
};

const MISSING: DiffValue = {
  display: '—',
  normalized: '__MISSING__',
};

const WITHDRAWAL_STRATEGY_LABELS: Record<WithdrawalStrategyType, string> = {
  [WithdrawalStrategyType.ConstantDollar]: 'Constant Dollar',
  [WithdrawalStrategyType.PercentOfPortfolio]: 'Percent of Portfolio',
  [WithdrawalStrategyType.OneOverN]: '1/N',
  [WithdrawalStrategyType.Vpw]: 'VPW',
  [WithdrawalStrategyType.DynamicSwr]: 'Dynamic SWR',
  [WithdrawalStrategyType.DynamicSwrAdaptive]: 'Dynamic SWR (Adaptive TWR)',
  [WithdrawalStrategyType.SensibleWithdrawals]: 'Sensible Withdrawals',
  [WithdrawalStrategyType.NinetyFivePercent]: '95% Rule',
  [WithdrawalStrategyType.GuytonKlinger]: 'Guyton-Klinger',
  [WithdrawalStrategyType.VanguardDynamic]: 'Vanguard Dynamic',
  [WithdrawalStrategyType.Endowment]: 'Endowment',
  [WithdrawalStrategyType.HebelerAutopilot]: 'Hebeler Autopilot II',
  [WithdrawalStrategyType.CapeBased]: 'CAPE-Based',
};

const DRAWDOWN_STRATEGY_LABELS: Record<DrawdownStrategyType, string> = {
  [DrawdownStrategyType.Bucket]: 'Bucket',
  [DrawdownStrategyType.Rebalancing]: 'Rebalancing',
};

const withdrawalParamCatalog: Array<{ key: WithdrawalParamKey; label: string; kind: ValueKind }> = [
  { key: 'initialWithdrawalRate', label: 'Initial Withdrawal Rate', kind: 'percent' },
  { key: 'annualWithdrawalRate', label: 'Annual Withdrawal Rate', kind: 'percent' },
  { key: 'expectedRealReturn', label: 'Expected Real Return', kind: 'percent' },
  { key: 'drawdownTarget', label: 'Drawdown Target', kind: 'number' },
  { key: 'expectedRateOfReturn', label: 'Expected Rate of Return', kind: 'percent' },
  { key: 'fallbackExpectedRateOfReturn', label: 'Fallback Expected Rate of Return', kind: 'percent' },
  { key: 'lookbackMonths', label: 'Lookback Months', kind: 'integer' },
  { key: 'smoothingEnabled', label: 'Withdrawal Smoothing Enabled', kind: 'boolean' },
  { key: 'smoothingBlend', label: 'Smoothing Blend (Prior Weight)', kind: 'percent' },
  { key: 'baseWithdrawalRate', label: 'Base Withdrawal Rate', kind: 'percent' },
  { key: 'extrasWithdrawalRate', label: 'Extras Withdrawal Rate', kind: 'percent' },
  { key: 'minimumFloor', label: 'Minimum Floor', kind: 'percent' },
  { key: 'capitalPreservationTrigger', label: 'Capital Preservation Trigger', kind: 'percent' },
  { key: 'capitalPreservationCut', label: 'Capital Preservation Cut', kind: 'percent' },
  { key: 'prosperityTrigger', label: 'Prosperity Trigger', kind: 'percent' },
  { key: 'prosperityRaise', label: 'Prosperity Raise', kind: 'percent' },
  { key: 'guardrailsSunset', label: 'Guardrails Sunset (Years)', kind: 'integer' },
  { key: 'ceiling', label: 'Ceiling', kind: 'percent' },
  { key: 'floor', label: 'Floor', kind: 'percent' },
  { key: 'spendingRate', label: 'Spending Rate', kind: 'percent' },
  { key: 'smoothingWeight', label: 'Smoothing Weight', kind: 'percent' },
  { key: 'pmtExpectedReturn', label: 'PMT Expected Return', kind: 'percent' },
  { key: 'priorYearWeight', label: 'Prior Year Weight', kind: 'percent' },
  { key: 'capeWeight', label: 'CAPE Weight', kind: 'percent' },
  { key: 'startingCape', label: 'Starting CAPE', kind: 'number' },
];

const asMoney = (value: number): DiffValue => ({
  display: formatCurrency(Math.round(value)),
  normalized: `${Math.round(value)}`,
});

const asPercent = (value: number): DiffValue => ({
  display: formatPercent(value, 2),
  normalized: value.toFixed(6),
});

const asInteger = (value: number): DiffValue => ({
  display: `${Math.round(value)}`,
  normalized: `${Math.round(value)}`,
});

const asNumber = (value: number): DiffValue => {
  const rounded = Number(value.toFixed(2));
  return {
    display: `${rounded}`,
    normalized: value.toFixed(6),
  };
};

const asText = (value: string): DiffValue => ({
  display: value,
  normalized: value,
});

const asBoolean = (value: boolean): DiffValue => ({
  display: value ? 'On' : 'Off',
  normalized: value ? 'true' : 'false',
});

const byKind = (kind: ValueKind, value: number | string | boolean): DiffValue => {
  if (typeof value === 'string') {
    return asText(value);
  }
  if (typeof value === 'boolean') {
    return asBoolean(value);
  }
  if (kind === 'boolean') {
    return asBoolean(Boolean(value));
  }
  switch (kind) {
    case 'currency':
      return asMoney(value);
    case 'percent':
      return asPercent(value);
    case 'integer':
      return asInteger(value);
    case 'number':
      return asNumber(value);
    case 'text':
      return asText(`${value}`);
    default:
      return asText(`${value}`);
  }
};

const retirementStartText = (month: number, year: number): string =>
  `${String(month).padStart(2, '0')}/${year}`;

const eventEndText = (end: { month: number; year: number } | string): string =>
  typeof end === 'string' ? 'EOR' : retirementStartText(end.month, end.year);

const formatBucketOrder = (order: AssetClass[]): DiffValue => {
  const display = order.join(' > ');
  return { display, normalized: order.join('|') };
};

const formatGlidePathSummary = (config: SimulationConfig): DiffValue => {
  if (config.drawdownStrategy.type !== DrawdownStrategyType.Rebalancing) {
    return NOT_APPLICABLE;
  }
  const { glidePathEnabled, glidePath } = config.drawdownStrategy.rebalancing;
  if (!glidePathEnabled) {
    return asText('Disabled');
  }
  const sorted = [...glidePath].sort((left, right) => left.year - right.year);
  const display = sorted
    .map((point) => {
      const stocks = Math.round(point.allocation.stocks * 100);
      const bonds = Math.round(point.allocation.bonds * 100);
      const cash = Math.round(point.allocation.cash * 100);
      return `Y${point.year}: ${stocks}/${bonds}/${cash}`;
    })
    .join(' | ');
  const normalized = sorted
    .map((point) =>
      `Y${point.year}:${point.allocation.stocks.toFixed(6)},${point.allocation.bonds.toFixed(6)},${point.allocation.cash.toFixed(6)}`,
    )
    .join('|');
  return { display, normalized };
};

const summarizeSpendingPhases = (config: SimulationConfig): DiffValue => {
  const normalizedEntries = [...config.spendingPhases]
    .sort((left, right) =>
      left.startYear - right.startYear || left.endYear - right.endYear || left.name.localeCompare(right.name),
    )
    .map((phase) => ({
      name: phase.name,
      startYear: phase.startYear,
      endYear: phase.endYear,
      minMonthlySpend: Math.round(phase.minMonthlySpend),
      maxMonthlySpend: Math.round(phase.maxMonthlySpend),
    }));

  const display = normalizedEntries
    .map((phase) => `${phase.name} [Y${phase.startYear}-${phase.endYear}] ${formatCurrency(phase.minMonthlySpend)}-${formatCurrency(phase.maxMonthlySpend)}`)
    .join(' | ');
  const normalized = JSON.stringify(normalizedEntries);
  return { display, normalized };
};

const summarizeIncomeEvents = (config: SimulationConfig): DiffValue => {
  const normalizedEntries = [...config.incomeEvents]
    .sort((left, right) =>
      left.start.year - right.start.year ||
      left.start.month - right.start.month ||
      left.name.localeCompare(right.name) ||
      left.amount - right.amount,
    )
    .map((event) => ({
      name: event.name,
      amount: Math.round(event.amount),
      depositTo: event.depositTo,
      start: { ...event.start },
      end: event.end === 'endOfRetirement' ? 'endOfRetirement' : { ...event.end },
      frequency: event.frequency,
      inflationAdjusted: event.inflationAdjusted,
    }));

  const display = normalizedEntries
    .map((event) => {
      return `${event.name} ${formatCurrency(event.amount)} ${event.depositTo} ${retirementStartText(event.start.month, event.start.year)}-${eventEndText(event.end)} ${event.frequency}${event.inflationAdjusted ? ' infl' : ''}`;
    })
    .join(' | ');
  const normalized = JSON.stringify(normalizedEntries);
  return { display, normalized };
};

const summarizeExpenseEvents = (config: SimulationConfig): DiffValue => {
  const normalizedEntries = [...config.expenseEvents]
    .sort((left, right) =>
      left.start.year - right.start.year ||
      left.start.month - right.start.month ||
      left.name.localeCompare(right.name) ||
      left.amount - right.amount,
    )
    .map((event) => ({
      name: event.name,
      amount: Math.round(event.amount),
      sourceFrom: event.sourceFrom,
      start: { ...event.start },
      end: event.end === 'endOfRetirement' ? 'endOfRetirement' : { ...event.end },
      frequency: event.frequency,
      inflationAdjusted: event.inflationAdjusted,
    }));

  const display = normalizedEntries
    .map((event) => {
      return `${event.name} ${formatCurrency(event.amount)} ${event.sourceFrom} ${retirementStartText(event.start.month, event.start.year)}-${eventEndText(event.end)} ${event.frequency}${event.inflationAdjusted ? ' infl' : ''}`;
    })
    .join(' | ');
  const normalized = JSON.stringify(normalizedEntries);
  return { display, normalized };
};

type RowSpec = {
  key: string;
  label: string;
  group: string;
  resolve: (config: SimulationConfig) => DiffValue;
};

const buildRowSpecs = (): RowSpec[] => {
  const specs: RowSpec[] = [
    {
      key: 'core.startingAge',
      label: 'Starting Age',
      group: 'Core Parameters',
      resolve: (config) => asInteger(config.coreParams.startingAge),
    },
    {
      key: 'core.withdrawalsStartAt',
      label: 'Withdrawals Start',
      group: 'Core Parameters',
      resolve: (config) => asInteger(config.coreParams.withdrawalsStartAt),
    },
    {
      key: 'core.retirementStart',
      label: 'Retirement Start',
      group: 'Core Parameters',
      resolve: (config) => asText(retirementStartText(config.coreParams.retirementStartDate.month, config.coreParams.retirementStartDate.year)),
    },
    {
      key: 'core.retirementDuration',
      label: 'Duration',
      group: 'Core Parameters',
      resolve: (config) => asInteger(config.coreParams.retirementDuration),
    },
    {
      key: 'core.inflationRate',
      label: 'Inflation Rate',
      group: 'Core Parameters',
      resolve: (config) => asPercent(config.coreParams.inflationRate),
    },
    {
      key: 'portfolio.stocks',
      label: 'Starting Portfolio: Stocks',
      group: 'Starting Portfolio',
      resolve: (config) => asMoney(config.portfolio.stocks),
    },
    {
      key: 'portfolio.bonds',
      label: 'Starting Portfolio: Bonds',
      group: 'Starting Portfolio',
      resolve: (config) => asMoney(config.portfolio.bonds),
    },
    {
      key: 'portfolio.cash',
      label: 'Starting Portfolio: Cash',
      group: 'Starting Portfolio',
      resolve: (config) => asMoney(config.portfolio.cash),
    },
    {
      key: 'portfolio.totalPrincipal',
      label: 'Starting Principal (Total)',
      group: 'Starting Portfolio',
      resolve: (config) => asMoney(config.portfolio.stocks + config.portfolio.bonds + config.portfolio.cash),
    },
    {
      key: 'returns.stocks.expectedReturn',
      label: 'Stocks Expected Return',
      group: 'Return Assumptions',
      resolve: (config) => asPercent(config.returnAssumptions.stocks.expectedReturn),
    },
    {
      key: 'returns.stocks.stdDev',
      label: 'Stocks Std Dev',
      group: 'Return Assumptions',
      resolve: (config) => asPercent(config.returnAssumptions.stocks.stdDev),
    },
    {
      key: 'returns.bonds.expectedReturn',
      label: 'Bonds Expected Return',
      group: 'Return Assumptions',
      resolve: (config) => asPercent(config.returnAssumptions.bonds.expectedReturn),
    },
    {
      key: 'returns.bonds.stdDev',
      label: 'Bonds Std Dev',
      group: 'Return Assumptions',
      resolve: (config) => asPercent(config.returnAssumptions.bonds.stdDev),
    },
    {
      key: 'returns.cash.expectedReturn',
      label: 'Cash Expected Return',
      group: 'Return Assumptions',
      resolve: (config) => asPercent(config.returnAssumptions.cash.expectedReturn),
    },
    {
      key: 'returns.cash.stdDev',
      label: 'Cash Std Dev',
      group: 'Return Assumptions',
      resolve: (config) => asPercent(config.returnAssumptions.cash.stdDev),
    },
    {
      key: 'withdrawal.type',
      label: 'Withdrawal Strategy Type',
      group: 'Withdrawal Strategy',
      resolve: (config) => asText(WITHDRAWAL_STRATEGY_LABELS[config.withdrawalStrategy.type]),
    },
  ];

  withdrawalParamCatalog.forEach((param) => {
    specs.push({
      key: `withdrawal.param.${param.key}`,
      label: param.label,
      group: 'Withdrawal Strategy',
      resolve: (config) => {
        const params = config.withdrawalStrategy.params as Record<string, unknown>;
        const value = params[param.key];
        return typeof value === 'number' || typeof value === 'boolean'
          ? byKind(param.kind, value)
          : NOT_APPLICABLE;
      },
    });
  });

  specs.push(
    {
      key: 'drawdown.type',
      label: 'Drawdown Strategy Type',
      group: 'Drawdown Strategy',
      resolve: (config) => asText(DRAWDOWN_STRATEGY_LABELS[config.drawdownStrategy.type]),
    },
    {
      key: 'drawdown.bucketOrder',
      label: 'Bucket Order',
      group: 'Drawdown Strategy',
      resolve: (config) =>
        config.drawdownStrategy.type === DrawdownStrategyType.Bucket
          ? formatBucketOrder(config.drawdownStrategy.bucketOrder)
          : NOT_APPLICABLE,
    },
    {
      key: 'drawdown.rebalancing.target.stocks',
      label: 'Rebalancing Target: Stocks',
      group: 'Drawdown Strategy',
      resolve: (config) =>
        config.drawdownStrategy.type === DrawdownStrategyType.Rebalancing
          ? asPercent(config.drawdownStrategy.rebalancing.targetAllocation.stocks)
          : NOT_APPLICABLE,
    },
    {
      key: 'drawdown.rebalancing.target.bonds',
      label: 'Rebalancing Target: Bonds',
      group: 'Drawdown Strategy',
      resolve: (config) =>
        config.drawdownStrategy.type === DrawdownStrategyType.Rebalancing
          ? asPercent(config.drawdownStrategy.rebalancing.targetAllocation.bonds)
          : NOT_APPLICABLE,
    },
    {
      key: 'drawdown.rebalancing.target.cash',
      label: 'Rebalancing Target: Cash',
      group: 'Drawdown Strategy',
      resolve: (config) =>
        config.drawdownStrategy.type === DrawdownStrategyType.Rebalancing
          ? asPercent(config.drawdownStrategy.rebalancing.targetAllocation.cash)
          : NOT_APPLICABLE,
    },
    {
      key: 'drawdown.rebalancing.glidePathEnabled',
      label: 'Glide Path Enabled',
      group: 'Drawdown Strategy',
      resolve: (config) =>
        config.drawdownStrategy.type === DrawdownStrategyType.Rebalancing
          ? asText(config.drawdownStrategy.rebalancing.glidePathEnabled ? 'Yes' : 'No')
          : NOT_APPLICABLE,
    },
    {
      key: 'drawdown.rebalancing.glidePathSummary',
      label: 'Glide Path',
      group: 'Drawdown Strategy',
      resolve: (config) => formatGlidePathSummary(config),
    },
    {
      key: 'spendingPhases.summary',
      label: 'Spending Phases',
      group: 'Spending Phases',
      resolve: (config) => summarizeSpendingPhases(config),
    },
    {
      key: 'incomeEvents.summary',
      label: 'Income Events',
      group: 'Income Events',
      resolve: (config) => summarizeIncomeEvents(config),
    },
    {
      key: 'expenseEvents.summary',
      label: 'Expense Events',
      group: 'Expense Events',
      resolve: (config) => summarizeExpenseEvents(config),
    },
  );

  return specs;
};

export const buildCompareParameterDiffs = ({
  slotOrder,
  baselineSlotId,
  slotConfigsById,
}: BuildCompareParameterDiffsInput): CompareParameterDiffResult => {
  const resolvedBaselineSlotId = slotOrder.includes(baselineSlotId) ? baselineSlotId : (slotOrder[0] ?? baselineSlotId);
  const rows: CompareParameterDiffRow[] = [];
  const specs = buildRowSpecs();

  specs.forEach((spec) => {
    const valuesBySlot: Record<SlotId, string> = {};
    const normalizedBySlot: Record<SlotId, string> = {};

    slotOrder.forEach((slotId) => {
      const config = slotConfigsById[slotId];
      if (!config) {
        valuesBySlot[slotId] = MISSING.display;
        normalizedBySlot[slotId] = MISSING.normalized;
        return;
      }
      const value = spec.resolve(config);
      valuesBySlot[slotId] = value.display;
      normalizedBySlot[slotId] = value.normalized;
    });

    const normalizedSet = new Set(slotOrder.map((slotId) => normalizedBySlot[slotId]));
    const isDifferent = normalizedSet.size > 1;
    if (!isDifferent) {
      return;
    }

    const baselineNormalized = normalizedBySlot[resolvedBaselineSlotId];
    const differsFromBaselineBySlot: Record<SlotId, boolean> = {};
    slotOrder.forEach((slotId) => {
      differsFromBaselineBySlot[slotId] = normalizedBySlot[slotId] !== baselineNormalized;
    });

    rows.push({
      key: spec.key,
      label: spec.label,
      group: spec.group,
      valuesBySlot,
      isDifferent,
      differsFromBaselineBySlot,
    });
  });

  return {
    rows,
    differenceCount: rows.length,
  };
};
