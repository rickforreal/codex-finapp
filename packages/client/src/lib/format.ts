export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

export const formatCompactCurrency = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
};

export const formatPercent = (value: number, digits = 1): string =>
  `${(value * 100).toFixed(digits).replace(/\.0$/, '')}%`;

export const formatPeriodLabel = (
  monthIndex: number,
  birthDate: { month: number; year: number },
  portfolioStart: { month: number; year: number },
): string => {
  const yearOffset = Math.floor((monthIndex - 1) / 12) + 1;
  const monthInYear = ((monthIndex - 1) % 12) + 1;
  const totalMonthsOffset =
    (portfolioStart.year - birthDate.year) * 12 +
    (portfolioStart.month - birthDate.month) +
    (monthIndex - 1);
  const age = Math.floor(totalMonthsOffset / 12);
  return `Year ${yearOffset}, Month ${monthInYear} (Age ${age})`;
};
