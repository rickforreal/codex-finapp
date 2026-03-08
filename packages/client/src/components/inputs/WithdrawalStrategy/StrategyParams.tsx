import { WithdrawalStrategyType } from '@finapp/shared';

import { NumericInput } from '../../shared/NumericInput';
import { PercentInput } from '../../shared/PercentInput';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
import { useAppStore } from '../../../store/useAppStore';

const PercentField = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) => (
  <label className="space-y-1">
    <p className="text-xs font-medium text-slate-600">{label}</p>
    <PercentInput value={value} onChange={onChange} min={min} max={max} step={step} />
  </label>
);

export const StrategyParams = () => {
  const strategy = useAppStore((state) => state.withdrawalStrategy);
  const portfolioTotal = useAppStore(
    (state) => state.portfolio.stocks + state.portfolio.bonds + state.portfolio.cash,
  );
  const setWithdrawalParam = useAppStore((state) => state.setWithdrawalParam);

  const setNumber = (key: Parameters<typeof setWithdrawalParam>[0]) => (value: number | undefined) =>
    setWithdrawalParam(key, value ?? 0);
  const setBoolean = (key: Parameters<typeof setWithdrawalParam>[0]) => (value: boolean) =>
    setWithdrawalParam(key, value);

  if (strategy.type === WithdrawalStrategyType.OneOverN) {
    return (
      <p className="text-xs text-slate-500">
        This strategy has no parameters. Withdrawal each year is portfolio divided by remaining years.
      </p>
    );
  }

  if (strategy.type === WithdrawalStrategyType.ConstantDollar) {
    const annual = Math.round(portfolioTotal * strategy.params.initialWithdrawalRate);
    return (
      <div className="space-y-1">
        <PercentField
          label="Initial Withdrawal Rate"
          value={strategy.params.initialWithdrawalRate}
          onChange={setNumber('initialWithdrawalRate')}
          min={1}
          max={10}
          step={0.1}
        />
        <p className="text-xs text-slate-500">Year 1 annual withdrawal: ${(annual / 100).toLocaleString()}</p>
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.PercentOfPortfolio) {
    return (
      <PercentField
        label="Annual Withdrawal Rate"
        value={strategy.params.annualWithdrawalRate}
        onChange={setNumber('annualWithdrawalRate')}
        min={1}
        max={15}
        step={0.1}
      />
    );
  }

  if (strategy.type === WithdrawalStrategyType.Vpw) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Expected Real Return"
          value={strategy.params.expectedRealReturn}
          onChange={setNumber('expectedRealReturn')}
          min={-5}
          max={15}
          step={0.1}
        />
        <PercentField
          label="Drawdown Target"
          value={strategy.params.drawdownTarget}
          onChange={setNumber('drawdownTarget')}
          min={0}
          max={100}
          step={1}
        />
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.DynamicSwr) {
    return (
      <PercentField
        label="Expected Rate of Return"
        value={strategy.params.expectedRateOfReturn}
        onChange={setNumber('expectedRateOfReturn')}
        min={0}
        max={15}
        step={0.1}
      />
    );
  }

  if (strategy.type === WithdrawalStrategyType.DynamicSwrAdaptive) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Fallback Expected Rate of Return"
          value={strategy.params.fallbackExpectedRateOfReturn}
          onChange={setNumber('fallbackExpectedRateOfReturn')}
          min={1}
          max={15}
          step={0.1}
        />
        <label className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Realized Return Lookback (months)</p>
          <NumericInput
            value={strategy.params.lookbackMonths}
            onChange={setNumber('lookbackMonths')}
            min={6}
            max={60}
            step={1}
          />
        </label>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">Withdrawal Smoothing</p>
            <ToggleSwitch
              checked={strategy.params.smoothingEnabled}
              onChange={setBoolean('smoothingEnabled')}
            />
          </div>
          <label className="space-y-1">
            <p className="text-xs font-medium text-slate-600">
              Smoothing Blend (Prior Weight): {Math.round(strategy.params.smoothingBlend * 100)}% prior / {Math.round((1 - strategy.params.smoothingBlend) * 100)}% new
            </p>
            <input
              type="range"
              min={0}
              max={95}
              step={1}
              value={Math.round(strategy.params.smoothingBlend * 100)}
              disabled={!strategy.params.smoothingEnabled}
              onChange={(event) => setWithdrawalParam('smoothingBlend', Number(event.target.value) / 100)}
              className="w-full accent-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.SensibleWithdrawals) {
    return (
      <div className="space-y-3">
        <PercentField
          label="Base Withdrawal Rate"
          value={strategy.params.baseWithdrawalRate}
          onChange={setNumber('baseWithdrawalRate')}
          min={1}
          max={8}
          step={0.1}
        />
        <PercentField
          label="Extras Withdrawal Rate"
          value={strategy.params.extrasWithdrawalRate}
          onChange={setNumber('extrasWithdrawalRate')}
          min={0}
          max={50}
          step={1}
        />
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.NinetyFivePercent) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Annual Withdrawal Rate"
          value={strategy.params.annualWithdrawalRate}
          onChange={setNumber('annualWithdrawalRate')}
          min={1}
          max={10}
          step={0.1}
        />
        <PercentField
          label="Minimum Floor"
          value={strategy.params.minimumFloor}
          onChange={setNumber('minimumFloor')}
          min={80}
          max={100}
          step={1}
        />
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.GuytonKlinger) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Initial Withdrawal Rate"
          value={strategy.params.initialWithdrawalRate}
          onChange={setNumber('initialWithdrawalRate')}
          min={1}
          max={10}
          step={0.1}
        />
        <PercentField
          label="Capital Preservation Trigger"
          value={strategy.params.capitalPreservationTrigger}
          onChange={setNumber('capitalPreservationTrigger')}
          min={0}
          max={100}
          step={1}
        />
        <PercentField
          label="Capital Preservation Cut"
          value={strategy.params.capitalPreservationCut}
          onChange={setNumber('capitalPreservationCut')}
          min={0}
          max={50}
          step={1}
        />
        <PercentField
          label="Prosperity Trigger"
          value={strategy.params.prosperityTrigger}
          onChange={setNumber('prosperityTrigger')}
          min={0}
          max={100}
          step={1}
        />
        <PercentField
          label="Prosperity Raise"
          value={strategy.params.prosperityRaise}
          onChange={setNumber('prosperityRaise')}
          min={0}
          max={50}
          step={1}
        />
        <label className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Guardrails Sunset (years)</p>
          <NumericInput
            value={strategy.params.guardrailsSunset}
            onChange={setNumber('guardrailsSunset')}
            min={0}
            max={40}
            step={1}
          />
        </label>
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.VanguardDynamic) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Annual Withdrawal Rate"
          value={strategy.params.annualWithdrawalRate}
          onChange={setNumber('annualWithdrawalRate')}
          min={1}
          max={10}
          step={0.1}
        />
        <PercentField
          label="Ceiling"
          value={strategy.params.ceiling}
          onChange={setNumber('ceiling')}
          min={0}
          max={15}
          step={0.5}
        />
        <PercentField
          label="Floor"
          value={strategy.params.floor}
          onChange={setNumber('floor')}
          min={0}
          max={15}
          step={0.5}
        />
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.Endowment) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Spending Rate"
          value={strategy.params.spendingRate}
          onChange={setNumber('spendingRate')}
          min={1}
          max={10}
          step={0.1}
        />
        <PercentField
          label="Smoothing Weight"
          value={strategy.params.smoothingWeight}
          onChange={setNumber('smoothingWeight')}
          min={0}
          max={100}
          step={1}
        />
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.HebelerAutopilot) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Initial Withdrawal Rate"
          value={strategy.params.initialWithdrawalRate}
          onChange={setNumber('initialWithdrawalRate')}
          min={1}
          max={10}
          step={0.1}
        />
        <PercentField
          label="PMT Expected Return"
          value={strategy.params.pmtExpectedReturn}
          onChange={setNumber('pmtExpectedReturn')}
          min={-5}
          max={15}
          step={0.1}
        />
        <PercentField
          label="Prior Year Weight"
          value={strategy.params.priorYearWeight}
          onChange={setNumber('priorYearWeight')}
          min={0}
          max={100}
          step={1}
        />
      </div>
    );
  }

  if (strategy.type === WithdrawalStrategyType.CapeBased) {
    return (
      <div className="space-y-2">
        <PercentField
          label="Base Withdrawal Rate"
          value={strategy.params.baseWithdrawalRate}
          onChange={setNumber('baseWithdrawalRate')}
          min={0}
          max={10}
          step={0.1}
        />
        <label className="space-y-1">
          <p className="text-xs font-medium text-slate-600">CAPE Weight</p>
          <NumericInput
            value={strategy.params.capeWeight}
            onChange={setNumber('capeWeight')}
            min={0}
            max={2}
            step={0.1}
          />
        </label>
        <label className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Starting CAPE</p>
          <NumericInput
            value={strategy.params.startingCape}
            onChange={setNumber('startingCape')}
            min={1}
            max={60}
            step={0.5}
          />
        </label>
      </div>
    );
  }

  return (
    <p className="text-xs text-slate-500">Parameters unavailable.</p>
  );
};
