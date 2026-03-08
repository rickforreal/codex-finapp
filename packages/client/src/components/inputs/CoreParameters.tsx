import { NumericInput } from '../shared/NumericInput';
import { PercentInput } from '../shared/PercentInput';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { useAppStore, useCompareFamilyLockUiState } from '../../store/useAppStore';

export const CoreParameters = () => {
  const coreParams = useAppStore((state) => state.coreParams);
  const setCoreParam = useAppStore((state) => state.setCoreParam);
  const lockState = useCompareFamilyLockUiState('coreParams');
  const disabled = lockState.readOnly;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Birth Date (Age Ref)</p>
          <MonthYearPicker
            value={coreParams.birthDate}
            onChange={(value) => setCoreParam('birthDate', value)}
            disabled={disabled}
          />
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Expected Inflation</p>
          <PercentInput
            value={coreParams.inflationRate}
            onChange={(value) => setCoreParam('inflationRate', value)}
            max={20}
            disabled={disabled}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Portfolio Start (MM/YYYY)</p>
          <MonthYearPicker
            value={coreParams.portfolioStart}
            onChange={(value) => setCoreParam('portfolioStart', value)}
            disabled={disabled}
          />
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Portfolio End (MM/YYYY)</p>
          <MonthYearPicker
            value={coreParams.portfolioEnd}
            onChange={(value) => setCoreParam('portfolioEnd', value)}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
};
