export const pmt = (rate: number, nper: number, pv: number, fv = 0): number => {
  if (nper <= 0) {
    throw new Error('nper must be greater than 0');
  }

  if (rate === 0) {
    return (pv + fv) / nper;
  }

  const growth = (1 + rate) ** nper;
  return (rate * (pv * growth + fv)) / (growth - 1);
};
