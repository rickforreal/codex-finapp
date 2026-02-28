export const CHART_HEIGHT = 360;
export const CHART_MARGIN = { top: 20, right: 10, bottom: 44, left: 56 };
export const PLOT_HEIGHT = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

export const stressScenarioColors = [
  'var(--theme-color-stress-a)',
  'var(--theme-color-stress-b)',
  'var(--theme-color-stress-c)',
  'var(--theme-color-stress-d)',
];

export const inflationFactor = (inflationRate: number, monthIndex: number): number =>
  (1 + inflationRate) ** (monthIndex / 12);

export const linePath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) {
    return '';
  }
  const [first, ...rest] = points;
  if (!first) {
    return '';
  }
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}`;
};

export const areaPath = (xValues: number[], upper: number[], lower: number[]): string => {
  if (xValues.length === 0) {
    return '';
  }
  const top = xValues.map((x, index) => `${x} ${upper[index] ?? 0}`).join(' L ');
  const bottom = [...xValues]
    .reverse()
    .map((x, reverseIndex) => {
      const sourceIndex = xValues.length - 1 - reverseIndex;
      return `${x} ${lower[sourceIndex] ?? 0}`;
    })
    .join(' L ');
  return `M ${top} L ${bottom} Z`;
};

export const computeXAt = (
  index: number,
  localCount: number,
  plotWidth: number,
): number => CHART_MARGIN.left + (index / Math.max(localCount, 1)) * plotWidth;

export const computeYAt = (
  value: number,
  maxY: number,
): number => CHART_MARGIN.top + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;

export const mouseIndexFromEvent = (
  event: React.MouseEvent<SVGSVGElement>,
  svgWidth: number,
  plotWidth: number,
  localCount: number,
): number => {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = svgWidth / Math.max(rect.width, 1);
  const cursorX = (event.clientX - rect.left) * scaleX;
  const bounded = Math.max(CHART_MARGIN.left, Math.min(cursorX, svgWidth - CHART_MARGIN.right));
  const ratio = (bounded - CHART_MARGIN.left) / Math.max(plotWidth, 1);
  return Math.round(ratio * localCount);
};
