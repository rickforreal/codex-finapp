export type NativeMonteCarloRequest = {
  configJson: string;
  optionsJson?: string;
  historicalMonthsJson?: string;
  historicalSummaryJson?: string;
};

export type NativeMonteCarloResponse = {
  resultJson: string;
};

export type NativeSinglePathRequest = {
  configJson: string;
  monthlyReturnsJson: string;
  actualOverridesByMonthJson?: string;
  inflationOverridesByYearJson?: string;
};

export type NativeSinglePathResponse = {
  resultJson: string;
};

export type NativeReforecastRequest = {
  configJson: string;
  actualOverridesByMonthJson?: string;
};

export type NativeReforecastResponse = {
  resultJson: string;
};

export declare function runMonteCarloJson(
  request: NativeMonteCarloRequest,
): NativeMonteCarloResponse;
export declare function runSinglePathJson(
  request: NativeSinglePathRequest,
): NativeSinglePathResponse;
export declare function runReforecastJson(
  request: NativeReforecastRequest,
): NativeReforecastResponse;
