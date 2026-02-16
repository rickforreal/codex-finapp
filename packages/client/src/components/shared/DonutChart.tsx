import type { CSSProperties } from 'react';

type Props = {
  stocks: number;
  bonds: number;
  cash: number;
};

export const DonutChart = ({ stocks, bonds, cash }: Props) => {
  const total = Math.max(stocks + bonds + cash, 1);
  const stocksPct = (stocks / total) * 100;
  const bondsPct = (bonds / total) * 100;

  const style: CSSProperties = {
    background: `conic-gradient(var(--theme-color-asset-stocks) 0 ${stocksPct}%, var(--theme-color-asset-bonds) ${stocksPct}% ${stocksPct + bondsPct}%, var(--theme-color-asset-cash) ${stocksPct + bondsPct}% 100%)`,
  };

  return (
    <div className="relative h-16 w-16 rounded-full" style={style}>
      <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
    </div>
  );
};
