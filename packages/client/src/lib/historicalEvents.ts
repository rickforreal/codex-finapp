export interface HistoricalEventMarker {
  label: string;
  month: number;
  year: number;
}

const toMonthOrdinal = (month: number, year: number): number => year * 12 + (month - 1);

export const HISTORICAL_EVENT_MARKERS: HistoricalEventMarker[] = [
  { year: 1929, month: 10, label: 'Wall Street Crash' },
  { year: 1930, month: 6, label: 'Smoot-Hawley Tariff Act' },
  { year: 1933, month: 3, label: 'US Bank Holiday / New Deal pivot' },
  { year: 1937, month: 5, label: '1937 recession downturn begins' },
  { year: 1939, month: 9, label: 'World War II Begins' },
  { year: 1941, month: 12, label: 'Pearl Harbor / US enters WWII' },
  { year: 1944, month: 7, label: 'Bretton Woods Conference' },
  { year: 1945, month: 8, label: 'World War II Ends' },
  { year: 1950, month: 6, label: 'Korean War Begins' },
  { year: 1962, month: 10, label: 'Cuban Missile Crisis' },
  { year: 1963, month: 11, label: 'JFK assassination' },
  { year: 1971, month: 8, label: 'Nixon Shock (gold window closed)' },
  { year: 1973, month: 10, label: 'OPEC Oil Embargo' },
  { year: 1974, month: 10, label: '1973-74 bear market trough' },
  { year: 1979, month: 10, label: 'Volcker shock tightening' },
  { year: 1982, month: 8, label: 'LatAm debt crisis / secular bull kickoff' },
  { year: 1985, month: 9, label: 'Plaza Accord' },
  { year: 1987, month: 10, label: 'Black Monday' },
  { year: 1989, month: 11, label: 'Fall of Berlin Wall' },
  { year: 1990, month: 8, label: 'Gulf War begins' },
  { year: 1994, month: 2, label: 'Fed tightening cycle starts' },
  { year: 1997, month: 7, label: 'Asian Financial Crisis' },
  { year: 1998, month: 8, label: 'Russia default + LTCM crisis' },
  { year: 1999, month: 1, label: 'Euro launch' },
  { year: 2000, month: 3, label: 'Dot-com peak' },
  { year: 2001, month: 9, label: '9/11 attacks' },
  { year: 2002, month: 7, label: 'WorldCom bankruptcy' },
  { year: 2003, month: 3, label: 'Iraq War begins' },
  { year: 2007, month: 8, label: 'Global credit crunch starts' },
  { year: 2008, month: 9, label: 'Lehman collapse' },
  { year: 2009, month: 3, label: 'GFC market bottom' },
  { year: 2010, month: 5, label: 'Flash Crash' },
  { year: 2011, month: 8, label: 'US sovereign downgrade (S&P)' },
  { year: 2012, month: 7, label: 'ECB "whatever it takes" signal' },
  { year: 2013, month: 5, label: 'Taper Tantrum' },
  { year: 2015, month: 8, label: 'China devaluation shock' },
  { year: 2016, month: 6, label: 'Brexit referendum' },
  { year: 2018, month: 2, label: 'Volatility shock (Volmageddon)' },
  { year: 2020, month: 2, label: 'COVID-19 market crash begins' },
  { year: 2020, month: 3, label: 'Emergency Fed interventions' },
  { year: 2020, month: 11, label: 'Vaccine efficacy breakthrough' },
  { year: 2022, month: 2, label: 'Russia invades Ukraine' },
  { year: 2022, month: 9, label: 'UK gilt crisis' },
  { year: 2023, month: 3, label: 'Silicon Valley Bank failure' },
  { year: 2024, month: 1, label: 'US spot Bitcoin ETF approvals' },
];

const HISTORICAL_EVENT_LABELS = new Map<number, string>(
  HISTORICAL_EVENT_MARKERS.map((event) => [toMonthOrdinal(event.month, event.year), event.label]),
);
const HISTORICAL_EVENT_ORDINALS = HISTORICAL_EVENT_MARKERS
  .map((event) => toMonthOrdinal(event.month, event.year))
  .sort((a, b) => a - b);

export const getHistoricalEventLabel = (month: number, year: number): string | null =>
  HISTORICAL_EVENT_LABELS.get(toMonthOrdinal(month, year)) ?? null;

export const snapToHistoricalEventOrdinal = (
  ordinal: number,
  options: {
    minOrdinal: number;
    maxOrdinal: number;
    thresholdMonths?: number;
  },
): number => {
  const threshold = options.thresholdMonths ?? 1;
  let closest = ordinal;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const eventOrdinal of HISTORICAL_EVENT_ORDINALS) {
    if (eventOrdinal < options.minOrdinal || eventOrdinal > options.maxOrdinal) {
      continue;
    }
    const distance = Math.abs(eventOrdinal - ordinal);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = eventOrdinal;
    }
  }

  return closestDistance <= threshold ? closest : ordinal;
};
