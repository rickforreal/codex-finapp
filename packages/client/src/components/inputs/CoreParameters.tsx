import { NumericInput } from '../shared/NumericInput';
import { PercentInput } from '../shared/PercentInput';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { useAppStore } from '../../store/useAppStore';

export const CoreParameters = () => {
  const coreParams = useAppStore((state) => state.coreParams);
  const setCoreParam = useAppStore((state) => state.setCoreParam);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-600">Starting Age</label>
      <NumericInput value={coreParams.startingAge} min={1} max={120} onChange={(value) => setCoreParam('startingAge', value)} />

      <label className="block text-xs font-medium text-slate-600">Withdrawals Start At</label>
      <NumericInput
        value={coreParams.withdrawalsStartAt}
        min={coreParams.startingAge}
        max={120}
        onChange={(value) => setCoreParam('withdrawalsStartAt', value)}
      />

      <label className="block text-xs font-medium text-slate-600">Retirement Start Date (MM/YYYY)</label>
      <MonthYearPicker value={coreParams.retirementStartDate} onChange={(value) => setCoreParam('retirementStartDate', value)} />

      <label className="block text-xs font-medium text-slate-600">Retirement Duration (Years)</label>
      <NumericInput value={coreParams.retirementDuration} min={1} max={100} onChange={(value) => setCoreParam('retirementDuration', value)} />

      <label className="block text-xs font-medium text-slate-600">Expected Inflation Rate</label>
      <PercentInput value={coreParams.inflationRate} onChange={(value) => setCoreParam('inflationRate', value)} max={20} />
    </div>
  );
};
