import { useMemo } from 'react';
import { PercentInput } from '../shared/PercentInput';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { RangeSlider } from '../shared/RangeSlider';
import { useAppStore, useCompareFamilyLockUiState } from '../../store/useAppStore';
import { monthsBetween, addMonths } from '../../lib/dates';

export const CoreParameters = () => {
  const coreParams = useAppStore((state) => state.coreParams);
  const setCoreParam = useAppStore((state) => state.setCoreParam);
  const { readOnly } = useCompareFamilyLockUiState('coreParams');

  const portfolioDurationMonths = useMemo(() => {
    return monthsBetween(coreParams.portfolioStart, coreParams.portfolioEnd);
  }, [coreParams.portfolioStart, coreParams.portfolioEnd]);

  const calculateAge = (date: { month: number; year: number }) => {
    const totalMonths = (date.year - coreParams.birthDate.year) * 12 + (date.month - coreParams.birthDate.month);
    return Math.floor(totalMonths / 12);
  };

  const startAge = useMemo(() => calculateAge(coreParams.portfolioStart), [coreParams.portfolioStart, coreParams.birthDate]);
  const endAge = useMemo(() => calculateAge(coreParams.portfolioEnd), [coreParams.portfolioEnd, coreParams.birthDate]);

  const ageLabel = useMemo(() => `Age ${startAge} to ${endAge}`, [startAge, endAge]);

  const lengthLabel = useMemo(() => {
    const years = Math.floor(portfolioDurationMonths / 12);
    const months = portfolioDurationMonths % 12;
    const yearPart = years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : '';
    const monthPart = months > 0 ? `${months} mo${months > 1 ? '' : ''}` : '';
    const durationPart = [yearPart, monthPart].filter(Boolean).join(', ') || '0 mos';
    return `Length ${durationPart}`;
  }, [portfolioDurationMonths]);

  // Slider range in months from Jan 2020
  const SLIDER_BASE_YEAR = 2020;
  const toSliderValue = (date: { month: number; year: number }) =>
    (date.year - SLIDER_BASE_YEAR) * 12 + (date.month - 1);
  const fromSliderValue = (val: number) => ({
    year: SLIDER_BASE_YEAR + Math.floor(val / 12),
    month: (val % 12) + 1,
  });

  const sliderValue: [number, number] = [
    toSliderValue(coreParams.portfolioStart),
    toSliderValue(coreParams.portfolioEnd),
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Birth Date</p>
          <MonthYearPicker
            value={coreParams.birthDate}
            onChange={(value) => setCoreParam('birthDate', value)}
            disabled={readOnly}
          />
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Expected Inflation</p>
          <PercentInput
            value={coreParams.inflationRate}
            onChange={(value) => setCoreParam('inflationRate', value)}
            max={20}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 pt-2">
        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Portfolio Start</p>
          <MonthYearPicker
            value={coreParams.portfolioStart}
            onChange={(value) => setCoreParam('portfolioStart', value)}
            disabled={readOnly}
          />
        </label>

        <label className="space-y-1">
          <p className="flex min-h-10 items-end text-xs font-medium text-slate-600">Portfolio End</p>
          <MonthYearPicker
            value={coreParams.portfolioEnd}
            onChange={(value) => setCoreParam('portfolioEnd', value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="pt-4 px-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Portfolio Horizon</span>
          <div className="flex gap-1.5">
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{ageLabel}</span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{lengthLabel}</span>
          </div>
        </div>
        <RangeSlider
          min={0} // Jan 2020
          max={1200} // 100 years from 2020 (2120)
          value={sliderValue}
          disabled={readOnly}
          onChange={([startVal, endVal]) => {
            const start = fromSliderValue(startVal);
            const end = fromSliderValue(endVal);
            if (monthsBetween(start, end) >= 1) {
              if (toSliderValue(coreParams.portfolioStart) !== startVal) {
                setCoreParam('portfolioStart', start);
              }
              if (toSliderValue(coreParams.portfolioEnd) !== endVal) {
                setCoreParam('portfolioEnd', end);
              }
            }
          }}
        />
      </div>
    </div>
  );
};
