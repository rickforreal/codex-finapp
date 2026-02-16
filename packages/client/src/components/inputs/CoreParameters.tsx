import { NumericInput } from '../shared/NumericInput';
import { PercentInput } from '../shared/PercentInput';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { useAppStore } from '../../store/useAppStore';

export const CoreParameters = () => {
  const coreParams = useAppStore((state) => state.coreParams);
  const setCoreParam = useAppStore((state) => state.setCoreParam);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Starting Age</p>
          <div className="relative">
            <NumericInput
              value={coreParams.startingAge}
              min={1}
              max={120}
              className="pr-10"
              onChange={(value) => setCoreParam('startingAge', value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              yrs
            </span>
          </div>
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Withdrawals Start</p>
          <div className="relative">
            <NumericInput
              value={coreParams.withdrawalsStartAt}
              min={coreParams.startingAge}
              max={120}
              className="pr-10"
              onChange={(value) => setCoreParam('withdrawalsStartAt', value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              yrs
            </span>
          </div>
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Expected Inflation</p>
          <PercentInput value={coreParams.inflationRate} onChange={(value) => setCoreParam('inflationRate', value)} max={20} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Retirement Start (MM/YYYY)</p>
          <MonthYearPicker
            value={coreParams.retirementStartDate}
            onChange={(value) => setCoreParam('retirementStartDate', value)}
          />
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Retirement Duration (Years)</p>
          <NumericInput
            value={coreParams.retirementDuration}
            min={1}
            max={100}
            onChange={(value) => setCoreParam('retirementDuration', value)}
          />
        </label>
      </div>
    </div>
  );
};
