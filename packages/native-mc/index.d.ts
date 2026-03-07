export type NativeMonteCarloRequest = {
  configJson: string;
  optionsJson?: string;
  historicalMonthsJson?: string;
  historicalSummaryJson?: string;
};

export type NativeMonteCarloResponse = {
  resultJson: string;
};

export declare function runMonteCarloJson(
  request: NativeMonteCarloRequest,
): NativeMonteCarloResponse;
