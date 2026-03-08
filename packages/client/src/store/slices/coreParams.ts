const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

export const coreParamsInitialState = {
  birthDate: { month: 4, year: 1977 },
  portfolioStart: { month: currentMonth, year: currentYear },
  portfolioEnd: { month: currentMonth, year: currentYear + 40 },
  inflationRate: 0.03,
};
