import { useState } from 'react';

import { WithdrawalStrategyType } from '@finapp/shared';

import { useAppStore } from '../../../store/useAppStore';

type StrategyGuidance = {
  summary: string;
  parameterEffects: string[];
  tradeoff: string;
};

const TOOLTIP_BY_STRATEGY: Record<WithdrawalStrategyType, StrategyGuidance> = {
  [WithdrawalStrategyType.ConstantDollar]:
    {
      summary: 'Year 1 spending is portfolio × initial rate, then inflation-adjusted each year.',
      parameterEffects: [
        'Initial Withdrawal Rate increases or decreases Year 1 spending and the full baseline path after that.',
      ],
      tradeoff:
        'Very predictable spending, but it can overdraw in weak sequences because it does not adapt to market losses.',
    },
  [WithdrawalStrategyType.PercentOfPortfolio]:
    {
      summary: 'Spending is recalculated each year as a fixed percentage of current portfolio value.',
      parameterEffects: [
        'Annual Withdrawal Rate directly scales spending each year; higher values increase income and depletion risk.',
      ],
      tradeoff:
        'Strong portfolio preservation behavior, but spending can be volatile and drop sharply after downturns.',
    },
  [WithdrawalStrategyType.OneOverN]:
    {
      summary: 'Each year spends current portfolio divided by remaining years, with no custom parameters.',
      parameterEffects: ['No strategy-specific input fields.'],
      tradeoff:
        'Simple and disciplined, but spending can swing with market levels and may feel unstable year-to-year.',
    },
  [WithdrawalStrategyType.Vpw]:
    {
      summary: 'PMT-style withdrawal that targets full drawdown by horizon using real return assumptions.',
      parameterEffects: [
        'Expected Real Return raises/lower sustainable withdrawals based on long-run growth assumptions.',
        'Drawdown Target sets leftover portfolio at horizon; lower target spends more now.',
      ],
      tradeoff:
        'Mathematically coherent spend-down path, but sensitive to assumption error and can create spending volatility.',
    },
  [WithdrawalStrategyType.DynamicSwr]:
    {
      summary: 'Annuity-like recalculation each year using expected nominal return and remaining horizon.',
      parameterEffects: [
        'Expected Rate of Return increases projected sustainable spending when set higher.',
      ],
      tradeoff:
        'Responsive to changing portfolio size, but can still produce noticeable annual spending changes.',
    },
  [WithdrawalStrategyType.DynamicSwrAdaptive]:
    {
      summary: 'Monthly Dynamic SWR using trailing realized real returns with a fallback ROI warm-up period.',
      parameterEffects: [
        'Fallback Expected Rate of Return is used until enough realized history exists for the lookback window.',
        'Realized Return Lookback controls responsiveness: shorter windows react faster but swing more.',
      ],
      tradeoff:
        'Highly responsive to realized performance, but can produce noisier month-to-month spending than annual methods.',
    },
  [WithdrawalStrategyType.SensibleWithdrawals]:
    {
      summary: 'Combines a base withdrawal with optional extras after positive prior-year real gains.',
      parameterEffects: [
        'Base Withdrawal Rate defines the recurring baseline spend.',
        'Extras Withdrawal Rate controls how aggressively gains are converted into additional spending.',
      ],
      tradeoff:
        'Balances stability with upside participation, but extras can make cash flow less predictable.',
    },
  [WithdrawalStrategyType.NinetyFivePercent]:
    {
      summary: 'Uses target spending with a floor tied to the prior withdrawal to limit cuts.',
      parameterEffects: [
        'Annual Withdrawal Rate sets the unconstrained target level.',
        'Minimum Floor sets how much spending can fall versus prior year.',
      ],
      tradeoff:
        'Protects lifestyle against sharp cuts, but can pressure portfolio sustainability in bad markets.',
    },
  [WithdrawalStrategyType.GuytonKlinger]:
    {
      summary: 'Guardrail method: inflation baseline plus freeze/cut/raise rules with optional sunset.',
      parameterEffects: [
        'Initial Withdrawal Rate sets the starting spending anchor.',
        'Capital Preservation Trigger and Cut define when/how strongly spending is reduced after weak outcomes.',
        'Prosperity Trigger and Raise define when/how strongly spending increases after strong outcomes.',
        'Guardrails Sunset controls when guardrails stop applying near end-of-horizon.',
      ],
      tradeoff:
        'Robust risk control with explicit policy rules, but more parameters means more tuning complexity.',
    },
  [WithdrawalStrategyType.VanguardDynamic]:
    {
      summary: 'Portfolio-rate spending with yearly adjustment corridor (floor/ceiling limits).',
      parameterEffects: [
        'Annual Withdrawal Rate sets the base spending target.',
        'Ceiling limits annual spending increases.',
        'Floor limits annual spending decreases.',
      ],
      tradeoff:
        'Useful middle ground between flexibility and stability, though corridor settings can lag market reality.',
    },
  [WithdrawalStrategyType.Endowment]:
    {
      summary: 'Blends prior inflation-adjusted spending with current portfolio-rate spending.',
      parameterEffects: [
        'Spending Rate controls sensitivity to current portfolio value.',
        'Smoothing Weight gives more/less weight to prior-year spending persistence.',
      ],
      tradeoff:
        'Smoother than pure percentage spending, but high smoothing can delay necessary spending cuts.',
    },
  [WithdrawalStrategyType.HebelerAutopilot]:
    {
      summary: 'Blends prior inflation-adjusted spending with PMT-style remaining-horizon spending.',
      parameterEffects: [
        'Initial Withdrawal Rate sets starting spend baseline.',
        'PMT Expected Return changes PMT-implied sustainable spending levels.',
        'Prior Year Weight controls persistence versus PMT responsiveness.',
      ],
      tradeoff:
        'Can deliver smoother transitions than pure PMT, but relies on return assumptions and weighting choices.',
    },
  [WithdrawalStrategyType.CapeBased]:
    {
      summary: 'Valuation-aware spending rate using CAPE adjustment on top of a base withdrawal rate.',
      parameterEffects: [
        'Base Withdrawal Rate sets neutral spending before valuation adjustment.',
        'CAPE Weight sets how strongly valuation affects withdrawal rate.',
        'Starting CAPE anchors the initial valuation level for the rule.',
      ],
      tradeoff:
        'Adds macro-valuation awareness, but introduces model risk and dependence on CAPE interpretation.',
    },
};

export const StrategyTooltip = () => {
  const [expanded, setExpanded] = useState(false);
  const strategyType = useAppStore((state) => state.withdrawalStrategy.type);
  const details = TOOLTIP_BY_STRATEGY[strategyType];

  return (
    <div className="rounded border border-brand-border bg-brand-surface p-2 text-xs text-slate-600">
      <div className="flex items-start justify-between gap-2">
        <p className="leading-relaxed">{details.summary}</p>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="shrink-0 rounded border border-brand-border bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-800"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse strategy details' : 'Expand strategy details'}
          title={expanded ? 'Hide details' : 'Show details'}
        >
          <span className={`inline-block transition ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Parameter Effects</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
              {details.parameterEffects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tradeoff View</p>
            <p className="mt-1 text-slate-700">{details.tradeoff}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
