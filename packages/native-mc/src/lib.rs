use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use napi::bindgen_prelude::*;
use napi_derive::napi;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const RUN_SEED_STRIDE: i64 = 9_973;
const MAX_SIMULATION_RUNS: usize = 10_000;
const DEFAULT_SIMULATION_RUNS: usize = 1_000;
const MAX_SEED: i64 = 2_147_483_000;

#[napi(object)]
pub struct NativeMonteCarloRequest {
  pub config_json: String,
  pub options_json: Option<String>,
  pub historical_months_json: Option<String>,
  pub historical_summary_json: Option<String>,
}

#[napi(object)]
pub struct NativeMonteCarloResponse {
  pub result_json: String,
}

#[napi(object)]
pub struct NativeSinglePathRequest {
  pub config_json: String,
  pub monthly_returns_json: String,
  pub actual_overrides_by_month_json: Option<String>,
  pub inflation_overrides_by_year_json: Option<String>,
}

#[napi(object)]
pub struct NativeSinglePathResponse {
  pub result_json: String,
}

#[napi(object)]
pub struct NativeReforecastRequest {
  pub config_json: String,
  pub actual_overrides_by_month_json: Option<String>,
}

#[napi(object)]
pub struct NativeReforecastResponse {
  pub result_json: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum AssetClass {
  Stocks,
  Bonds,
  Cash,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AssetBalances {
  stocks: f64,
  bonds: f64,
  cash: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PartialAssetBalances {
  stocks: Option<f64>,
  bonds: Option<f64>,
  cash: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReturnAssumption {
  expected_return: f64,
  std_dev: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReturnAssumptions {
  stocks: ReturnAssumption,
  bonds: ReturnAssumption,
  cash: ReturnAssumption,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpendingPhase {
  id: String,
  name: String,
  start: EventDate,
  end: EventDate,
  min_monthly_spend: Option<f64>,
  max_monthly_spend: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventDate {
  month: i32,
  year: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
enum EventEndDate {
  Date(EventDate),
  EndOfRetirement(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum EventFrequency {
  Monthly,
  Quarterly,
  Annual,
  OneTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
enum ExpenseSource {
  Asset(AssetClass),
  FollowDrawdown(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IncomeEvent {
  id: String,
  name: String,
  amount: f64,
  deposit_to: AssetClass,
  start: EventDate,
  end: EventEndDate,
  frequency: EventFrequency,
  inflation_adjusted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpenseEvent {
  id: String,
  name: String,
  amount: f64,
  source_from: ExpenseSource,
  start: EventDate,
  end: EventEndDate,
  frequency: EventFrequency,
  inflation_adjusted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoreParams {
  birth_date: EventDate,
  portfolio_start: EventDate,
  portfolio_end: EventDate,
  inflation_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MonthlyReturns {
  stocks: f64,
  bonds: f64,
  cash: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoricalMonth {
  year: i32,
  month: i32,
  returns: MonthlyReturns,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConstantDollarParams {
  initial_withdrawal_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PercentOfPortfolioParams {
  annual_withdrawal_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct EmptyParams {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VpwParams {
  expected_real_return: f64,
  drawdown_target: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DynamicSwrParams {
  expected_rate_of_return: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DynamicSwrAdaptiveParams {
  fallback_expected_rate_of_return: f64,
  lookback_months: usize,
  smoothing_enabled: bool,
  smoothing_blend: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SensibleWithdrawalsParams {
  base_withdrawal_rate: f64,
  extras_withdrawal_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NinetyFivePercentParams {
  annual_withdrawal_rate: f64,
  minimum_floor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GuytonKlingerParams {
  initial_withdrawal_rate: f64,
  capital_preservation_trigger: f64,
  capital_preservation_cut: f64,
  prosperity_trigger: f64,
  prosperity_raise: f64,
  guardrails_sunset: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VanguardDynamicParams {
  annual_withdrawal_rate: f64,
  ceiling: f64,
  floor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EndowmentParams {
  spending_rate: f64,
  smoothing_weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HebelerAutopilotParams {
  initial_withdrawal_rate: f64,
  pmt_expected_return: f64,
  prior_year_weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CapeBasedParams {
  base_withdrawal_rate: f64,
  cape_weight: f64,
  starting_cape: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "params")]
enum WithdrawalStrategy {
  #[serde(rename = "constantDollar")]
  ConstantDollar(ConstantDollarParams),
  #[serde(rename = "percentOfPortfolio")]
  PercentOfPortfolio(PercentOfPortfolioParams),
  #[serde(rename = "oneOverN")]
  OneOverN(EmptyParams),
  #[serde(rename = "vpw")]
  Vpw(VpwParams),
  #[serde(rename = "dynamicSwr")]
  DynamicSwr(DynamicSwrParams),
  #[serde(rename = "dynamicSwrAdaptive")]
  DynamicSwrAdaptive(DynamicSwrAdaptiveParams),
  #[serde(rename = "sensibleWithdrawals")]
  SensibleWithdrawals(SensibleWithdrawalsParams),
  #[serde(rename = "ninetyFivePercent")]
  NinetyFivePercent(NinetyFivePercentParams),
  #[serde(rename = "guytonKlinger")]
  GuytonKlinger(GuytonKlingerParams),
  #[serde(rename = "vanguardDynamic")]
  VanguardDynamic(VanguardDynamicParams),
  #[serde(rename = "endowment")]
  Endowment(EndowmentParams),
  #[serde(rename = "hebelerAutopilot")]
  HebelerAutopilot(HebelerAutopilotParams),
  #[serde(rename = "capeBased")]
  CapeBased(CapeBasedParams),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AssetWeights {
  stocks: f64,
  bonds: f64,
  cash: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GlidePathWaypoint {
  year: i32,
  allocation: AssetWeights,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RebalancingConfig {
  target_allocation: AssetWeights,
  glide_path_enabled: bool,
  glide_path: Vec<GlidePathWaypoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum DrawdownStrategy {
  Bucket {
    #[serde(rename = "bucketOrder")]
    bucket_order: Vec<AssetClass>,
  },
  Rebalancing {
    rebalancing: RebalancingConfig,
  },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SimulationConfig {
  simulation_mode: String,
  returns_source: Option<String>,
  simulation_runs: Option<u32>,
  selected_historical_era: String,
  custom_historical_range: Option<Value>,
  block_bootstrap_enabled: bool,
  block_bootstrap_length: usize,
  core_params: CoreParams,
  portfolio: AssetBalances,
  return_assumptions: ReturnAssumptions,
  spending_phases: Vec<SpendingPhase>,
  withdrawal_strategy: WithdrawalStrategy,
  drawdown_strategy: DrawdownStrategy,
  income_events: Vec<IncomeEvent>,
  expense_events: Vec<ExpenseEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ActualMonthOverride {
  start_balances: Option<PartialAssetBalances>,
  withdrawals_by_asset: Option<PartialAssetBalances>,
  income_total: Option<f64>,
  expense_total: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MonteCarloOptions {
  runs: Option<u32>,
  seed: Option<i64>,
  actual_overrides_by_month: Option<HashMap<String, ActualMonthOverride>>,
  inflation_overrides_by_year: Option<HashMap<String, f64>>,
  stress_transform: Option<StressTransformDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StressTransformDescriptor {
  portfolio_start: EventDate,
  scenario: StressScenario,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
enum StressScenario {
  StockCrash {
    id: String,
    label: String,
    start: EventDate,
    params: StockCrashParams,
  },
  BondCrash {
    id: String,
    label: String,
    start: EventDate,
    params: BondCrashParams,
  },
  BroadMarketCrash {
    id: String,
    label: String,
    start: EventDate,
    params: BroadMarketCrashParams,
  },
  ProlongedBear {
    id: String,
    label: String,
    start: EventDate,
    params: ProlongedBearParams,
  },
  HighInflationSpike {
    id: String,
    label: String,
    start: EventDate,
    params: HighInflationSpikeParams,
  },
  Custom {
    id: String,
    label: String,
    start: EventDate,
    params: CustomStressParams,
  },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StockCrashParams {
  drop_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BondCrashParams {
  drop_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BroadMarketCrashParams {
  stock_drop_pct: f64,
  bond_drop_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProlongedBearParams {
  duration_years: i32,
  stock_annual_return: f64,
  bond_annual_return: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HighInflationSpikeParams {
  duration_years: i32,
  inflation_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CustomStressParams {
  years: Vec<CustomStressYear>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CustomStressYear {
  year_offset: i32,
  stocks_annual_return: f64,
  bonds_annual_return: f64,
  cash_annual_return: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonthlyWithdrawal {
  by_asset: AssetBalances,
  requested: f64,
  actual: f64,
  shortfall: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonthlySimulationRow {
  month_index: usize,
  year: i32,
  month_in_year: i32,
  start_balances: AssetBalances,
  market_change: AssetBalances,
  withdrawals: MonthlyWithdrawal,
  income_total: f64,
  expense_total: f64,
  end_balances: AssetBalances,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PathSummary {
  total_withdrawn: f64,
  total_shortfall: f64,
  terminal_portfolio_value: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SinglePathResult {
  rows: Vec<MonthlySimulationRow>,
  summary: PathSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloPercentileCurves {
  p05: Vec<f64>,
  p10: Vec<f64>,
  p25: Vec<f64>,
  p50: Vec<f64>,
  p75: Vec<f64>,
  p90: Vec<f64>,
  p95: Vec<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PercentileCurveSet {
  total: MonteCarloPercentileCurves,
  stocks: MonteCarloPercentileCurves,
  bonds: MonteCarloPercentileCurves,
  cash: MonteCarloPercentileCurves,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloWithdrawalStatsReal {
  median_monthly: f64,
  mean_monthly: f64,
  std_dev_monthly: f64,
  p25_monthly: f64,
  p75_monthly: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloResult {
  simulation_count: usize,
  success_count: usize,
  probability_of_success: f64,
  terminal_values: Vec<f64>,
  withdrawal_stats_real: MonteCarloWithdrawalStatsReal,
  percentile_curves: PercentileCurveSet,
  historical_summary: Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonteCarloExecutionResult {
  representative_path: SinglePathResult,
  monte_carlo: MonteCarloResult,
  seed_used: i64,
}

#[derive(Debug, Clone)]
struct RunSummary {
  run_index: usize,
  terminal_value: f64,
  total_drawdown: f64,
  total_shortfall: f64,
}

#[derive(Debug, Clone)]
struct RunComputation {
  run_index: usize,
  month_end_totals: Vec<f64>,
  month_end_stocks: Vec<f64>,
  month_end_bonds: Vec<f64>,
  month_end_cash: Vec<f64>,
  requested_withdrawal_by_month: Vec<bool>,
  actual_withdrawal_real_by_month: Vec<f64>,
  summary: PathSummary,
}

#[derive(Debug, Clone, Copy)]
struct MonthCompleteSummary {
  month_index: usize,
  end_stocks: f64,
  end_bonds: f64,
  end_cash: f64,
  withdrawal_requested: f64,
  withdrawal_actual: f64,
}

#[derive(Debug, Clone, Copy)]
struct StrategyContext {
  year: i32,
  retirement_years: i32,
  portfolio_value: f64,
  initial_portfolio_value: f64,
  previous_withdrawal: f64,
  previous_monthly_withdrawal: Option<f64>,
  previous_year_return: f64,
  previous_year_start_portfolio: f64,
  remaining_years: f64,
  remaining_months: usize,
  inflation_rate: f64,
  start_of_month_weights: Option<AssetWeights>,
  annualized_real_returns_by_asset: Option<AssetWeights>,
  cape_ratio: Option<f64>,
}

#[derive(Debug, Clone)]
struct SimulateOptions {
  include_rows: bool,
}

#[derive(Debug, Clone)]
struct DrawdownResult {
  balances: AssetBalances,
  withdrawn_by_asset: AssetBalances,
  total_withdrawn: f64,
  shortfall: f64,
}

#[derive(Debug, Clone)]
struct ExpenseResult {
  actual_total: f64,
  shortfall_total: f64,
}

#[derive(Debug, Clone)]
struct EditedWithdrawalResult {
  by_asset: AssetBalances,
  requested: f64,
  actual: f64,
  shortfall: f64,
}

#[derive(Debug, Clone)]
struct MonthlyQuantiles {
  total: [f64; 7],
  stocks: [f64; 7],
  bonds: [f64; 7],
  cash: [f64; 7],
}

#[derive(Clone)]
struct Mulberry32 {
  state: u32,
}

impl Mulberry32 {
  fn new(seed: i64) -> Self {
    Self {
      state: (seed as u64 & 0xffff_ffff) as u32,
    }
  }

  fn next_f64(&mut self) -> f64 {
    self.state = self.state.wrapping_add(0x6d2b79f5);
    let mut t = self.state;
    t = (t ^ (t >> 15)).wrapping_mul(t | 1);
    t ^= t.wrapping_add((t ^ (t >> 7)).wrapping_mul(t | 61));
    let result = t ^ (t >> 14);
    (result as f64) / 4_294_967_296.0
  }
}

#[derive(Clone)]
struct RollingProductWindow {
  window: Vec<f64>,
  count: usize,
  cursor: usize,
  product: f64,
}

impl RollingProductWindow {
  fn new(lookback_months: usize) -> Self {
    Self {
      window: vec![1.0; lookback_months],
      count: 0,
      cursor: 0,
      product: 1.0,
    }
  }

  fn push_factor(&mut self, factor: f64) {
    let safe_factor = factor.max(0.0000001);
    if self.count < self.window.len() {
      self.window[self.count] = safe_factor;
      self.count += 1;
      self.product *= safe_factor;
      return;
    }

    let leaving = self.window[self.cursor];
    self.window[self.cursor] = safe_factor;
    self.cursor = (self.cursor + 1) % self.window.len();
    self.product = (self.product / leaving) * safe_factor;
  }

  fn annualized_return(&self) -> f64 {
    if self.count < self.window.len() {
      return f64::NAN;
    }
    self.product.powf(12.0 / self.window.len() as f64) - 1.0
  }
}

#[derive(Clone)]
struct RollingAnnualizedRealReturns {
  stocks: RollingProductWindow,
  bonds: RollingProductWindow,
  cash: RollingProductWindow,
}

impl RollingAnnualizedRealReturns {
  fn new(lookback_months: usize) -> Self {
    Self {
      stocks: RollingProductWindow::new(lookback_months),
      bonds: RollingProductWindow::new(lookback_months),
      cash: RollingProductWindow::new(lookback_months),
    }
  }

  fn push(&mut self, real_returns: &MonthlyReturns) {
    self.stocks.push_factor(1.0 + real_returns.stocks);
    self.bonds.push_factor(1.0 + real_returns.bonds);
    self.cash.push_factor(1.0 + real_returns.cash);
  }

  fn annualized(&self) -> Option<AssetWeights> {
    let stocks = self.stocks.annualized_return();
    let bonds = self.bonds.annualized_return();
    let cash = self.cash.annualized_return();
    if !stocks.is_finite() || !bonds.is_finite() || !cash.is_finite() {
      return None;
    }
    Some(AssetWeights {
      stocks,
      bonds,
      cash,
    })
  }
}

fn round_to_cents(value: f64) -> f64 {
  (value + 0.5).floor()
}

fn empty_asset_balances() -> AssetBalances {
  AssetBalances {
    stocks: 0.0,
    bonds: 0.0,
    cash: 0.0,
  }
}

fn total_portfolio(balances: &AssetBalances) -> f64 {
  round_to_cents(balances.stocks + balances.bonds + balances.cash)
}

fn asset_get(balances: &AssetBalances, asset: AssetClass) -> f64 {
  match asset {
    AssetClass::Stocks => balances.stocks,
    AssetClass::Bonds => balances.bonds,
    AssetClass::Cash => balances.cash,
  }
}

fn asset_set(balances: &mut AssetBalances, asset: AssetClass, value: f64) {
  match asset {
    AssetClass::Stocks => balances.stocks = value,
    AssetClass::Bonds => balances.bonds = value,
    AssetClass::Cash => balances.cash = value,
  }
}

fn resolve_start_of_month_weights(balances: &AssetBalances) -> AssetWeights {
  let total = total_portfolio(balances);
  if total <= 0.0 {
    return AssetWeights::default();
  }

  AssetWeights {
    stocks: balances.stocks / total,
    bonds: balances.bonds / total,
    cash: balances.cash / total,
  }
}

#[derive(Debug, Clone)]
struct SpendingPhaseSchedule {
  start_month: i32,
  end_month: i32,
  min_monthly_spend: Option<f64>,
  max_monthly_spend: Option<f64>,
}

#[derive(Debug, Clone, Copy)]
struct IncomeEventSchedule<'a> {
  event: &'a IncomeEvent,
  start_month: i32,
  end_month: i32,
}

#[derive(Debug, Clone, Copy)]
struct ExpenseEventSchedule<'a> {
  event: &'a ExpenseEvent,
  start_month: i32,
  end_month: i32,
}

fn months_between(start: &EventDate, end: &EventDate) -> i32 {
  (end.year - start.year) * 12 + (end.month - start.month)
}

fn apply_market_returns(balances: &AssetBalances, monthly_returns: &MonthlyReturns) -> AssetBalances {
  AssetBalances {
    stocks: round_to_cents(balances.stocks * (1.0 + monthly_returns.stocks)),
    bonds: round_to_cents(balances.bonds * (1.0 + monthly_returns.bonds)),
    cash: round_to_cents(balances.cash * (1.0 + monthly_returns.cash)),
  }
}

fn diff_balances(after: &AssetBalances, before: &AssetBalances) -> AssetBalances {
  AssetBalances {
    stocks: round_to_cents(after.stocks - before.stocks),
    bonds: round_to_cents(after.bonds - before.bonds),
    cash: round_to_cents(after.cash - before.cash),
  }
}

fn month_key_to_index(portfolio_start: &EventDate, date: &EventDate) -> i32 {
  months_between(portfolio_start, date) + 1
}

fn resolve_event_end_month(portfolio_start: &EventDate, end: &EventEndDate, portfolio_months: i32) -> i32 {
  match end {
    EventEndDate::Date(date) => month_key_to_index(portfolio_start, date),
    EventEndDate::EndOfRetirement(value) if value == "endOfRetirement" => portfolio_months,
    EventEndDate::EndOfRetirement(_) => portfolio_months,
  }
}

fn build_spending_phase_schedule(config: &SimulationConfig) -> Vec<SpendingPhaseSchedule> {
  config
    .spending_phases
    .iter()
    .map(|phase| SpendingPhaseSchedule {
      start_month: month_key_to_index(&config.core_params.portfolio_start, &phase.start),
      end_month: month_key_to_index(&config.core_params.portfolio_start, &phase.end),
      min_monthly_spend: phase.min_monthly_spend,
      max_monthly_spend: phase.max_monthly_spend,
    })
    .collect()
}

fn resolve_withdrawal_start_month_index(phase_schedule: &[SpendingPhaseSchedule]) -> Option<i32> {
  phase_schedule.iter().map(|phase| phase.start_month).min()
}

fn find_spending_phase_for_month<'a>(
  phase_schedule: &'a [SpendingPhaseSchedule],
  month_index: i32,
) -> Option<&'a SpendingPhaseSchedule> {
  phase_schedule
    .iter()
    .find(|phase| month_index >= phase.start_month && month_index <= phase.end_month)
}

fn build_income_event_schedule<'a>(
  config: &'a SimulationConfig,
  portfolio_months: i32,
) -> Vec<IncomeEventSchedule<'a>> {
  config
    .income_events
    .iter()
    .map(|event| IncomeEventSchedule {
      event,
      start_month: month_key_to_index(&config.core_params.portfolio_start, &event.start),
      end_month: resolve_event_end_month(
        &config.core_params.portfolio_start,
        &event.end,
        portfolio_months,
      ),
    })
    .collect()
}

fn build_expense_event_schedule<'a>(
  config: &'a SimulationConfig,
  portfolio_months: i32,
) -> Vec<ExpenseEventSchedule<'a>> {
  config
    .expense_events
    .iter()
    .map(|event| ExpenseEventSchedule {
      event,
      start_month: month_key_to_index(&config.core_params.portfolio_start, &event.start),
      end_month: resolve_event_end_month(
        &config.core_params.portfolio_start,
        &event.end,
        portfolio_months,
      ),
    })
    .collect()
}

fn event_matches_frequency(offset_from_start: i32, frequency: EventFrequency) -> bool {
  if offset_from_start < 0 {
    return false;
  }

  match frequency {
    EventFrequency::OneTime => offset_from_start == 0,
    EventFrequency::Monthly => true,
    EventFrequency::Quarterly => offset_from_start % 3 == 0,
    EventFrequency::Annual => offset_from_start % 12 == 0,
  }
}

fn inflate_annual_amount(base_amount: f64, inflation_rate: f64, years_since_start: i32) -> f64 {
  if years_since_start <= 0 {
    return base_amount;
  }
  base_amount * (1.0 + inflation_rate).powf(years_since_start as f64)
}

fn annual_to_monthly_rate(annual_rate: f64) -> f64 {
  (1.0 + annual_rate).powf(1.0 / 12.0) - 1.0
}

fn build_monthly_inflation_factors(
  duration_months: usize,
  annual_inflation_for_year: &dyn Fn(i32) -> f64,
) -> Vec<f64> {
  let mut factors = vec![1.0; duration_months + 1];
  for month in 2..=duration_months {
    let previous_month_year = ((month as i32 - 2) / 12) + 1;
    let monthly_rate = annual_to_monthly_rate(annual_inflation_for_year(previous_month_year));
    factors[month] = factors[month - 1] * (1.0 + monthly_rate);
  }
  factors
}

fn event_amount_for_month(
  base_amount: f64,
  inflation_adjusted: bool,
  inflation_rate_for_year: &dyn Fn(i32) -> f64,
  month_index: usize,
) -> f64 {
  if !inflation_adjusted {
    return base_amount;
  }

  let year_offset = ((month_index as i32 - 1) / 12).max(0);
  let mut inflated = base_amount;
  for year in 1..=year_offset {
    inflated = inflate_annual_amount(inflated, inflation_rate_for_year(year), 1);
  }
  round_to_cents(inflated)
}

fn sum_event_income(
  balances: &mut AssetBalances,
  income_schedule: &[IncomeEventSchedule<'_>],
  month_index: usize,
  inflation_rate_for_year: &dyn Fn(i32) -> f64,
) -> f64 {
  let mut income_total = 0.0;
  for scheduled in income_schedule {
    let event = scheduled.event;
    let month = month_index as i32;
    if month < scheduled.start_month || month > scheduled.end_month {
      continue;
    }
    let offset = month - scheduled.start_month;
    if !event_matches_frequency(offset, event.frequency) {
      continue;
    }

    let amount = event_amount_for_month(
      event.amount,
      event.inflation_adjusted,
      inflation_rate_for_year,
      month_index,
    );
    let next_balance = round_to_cents(asset_get(balances, event.deposit_to) + amount);
    asset_set(balances, event.deposit_to, next_balance);
    income_total = round_to_cents(income_total + amount);
  }

  income_total
}

fn apply_expense_from_single_asset(
  balances: &mut AssetBalances,
  asset: AssetClass,
  amount: f64,
) -> (f64, f64) {
  let available = asset_get(balances, asset);
  let actual = available.min(amount);
  asset_set(balances, asset, round_to_cents(available - actual));
  (round_to_cents(actual), round_to_cents(amount - actual))
}

fn normalize_overrides(
  overrides: Option<HashMap<String, ActualMonthOverride>>,
) -> HashMap<usize, ActualMonthOverride> {
  let mut normalized = HashMap::new();
  let Some(raw) = overrides else {
    return normalized;
  };

  for (month, value) in raw {
    if let Ok(key) = month.parse::<usize>() {
      if key > 0 {
        normalized.insert(key, value);
      }
    }
  }

  normalized
}

fn normalize_inflation_overrides(overrides: Option<HashMap<String, f64>>) -> HashMap<i32, f64> {
  let mut normalized = HashMap::new();
  let Some(raw) = overrides else {
    return normalized;
  };

  for (year, value) in raw {
    if let Ok(key) = year.parse::<i32>() {
      normalized.insert(key, value);
    }
  }

  normalized
}

fn apply_edited_withdrawals(
  balances: &mut AssetBalances,
  override_month: &ActualMonthOverride,
) -> Option<EditedWithdrawalResult> {
  let requested = override_month.withdrawals_by_asset?;

  let requested_by_asset = AssetBalances {
    stocks: round_to_cents(requested.stocks.unwrap_or(0.0)),
    bonds: round_to_cents(requested.bonds.unwrap_or(0.0)),
    cash: round_to_cents(requested.cash.unwrap_or(0.0)),
  };
  let mut actual_by_asset = empty_asset_balances();

  for asset in [AssetClass::Stocks, AssetClass::Bonds, AssetClass::Cash] {
    let requested_amount = asset_get(&requested_by_asset, asset);
    let available = asset_get(balances, asset);
    let actual = requested_amount.min(available);
    asset_set(balances, asset, round_to_cents(available - actual));
    asset_set(&mut actual_by_asset, asset, round_to_cents(actual));
  }

  let requested_total = requested_by_asset.stocks + requested_by_asset.bonds + requested_by_asset.cash;
  let actual_total = actual_by_asset.stocks + actual_by_asset.bonds + actual_by_asset.cash;

  Some(EditedWithdrawalResult {
    by_asset: actual_by_asset,
    requested: round_to_cents(requested_total),
    actual: round_to_cents(actual_total),
    shortfall: round_to_cents(requested_total - actual_total),
  })
}

fn random_normal(mean: f64, std_dev: f64, random: &mut Mulberry32) -> f64 {
  let u1 = 1.0 - random.next_f64();
  let u2 = 1.0 - random.next_f64();
  let z0 = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos();
  mean + z0 * std_dev
}

fn generate_random_monthly_return(
  annual_expected_return: f64,
  annual_std_dev: f64,
  random: &mut Mulberry32,
) -> f64 {
  let monthly_mean = annual_to_monthly_rate(annual_expected_return);
  let monthly_std_dev = annual_std_dev / 12.0f64.sqrt();
  random_normal(monthly_mean, monthly_std_dev, random).max(-0.9999)
}

fn generate_monthly_returns_from_assumptions(config: &SimulationConfig, seed: i64) -> Vec<MonthlyReturns> {
  let duration_months =
    months_between(&config.core_params.portfolio_start, &config.core_params.portfolio_end).max(0) as usize;
  let mut random = Mulberry32::new(seed);

  (0..duration_months)
    .map(|_| MonthlyReturns {
      stocks: generate_random_monthly_return(
        config.return_assumptions.stocks.expected_return,
        config.return_assumptions.stocks.std_dev,
        &mut random,
      ),
      bonds: generate_random_monthly_return(
        config.return_assumptions.bonds.expected_return,
        config.return_assumptions.bonds.std_dev,
        &mut random,
      ),
      cash: generate_random_monthly_return(
        config.return_assumptions.cash.expected_return,
        config.return_assumptions.cash.std_dev,
        &mut random,
      ),
    })
    .collect()
}

fn generate_deterministic_monthly_returns(config: &SimulationConfig) -> Vec<MonthlyReturns> {
  let duration_months =
    months_between(&config.core_params.portfolio_start, &config.core_params.portfolio_end).max(0) as usize;
  let stocks_monthly = annual_to_monthly_rate(config.return_assumptions.stocks.expected_return);
  let bonds_monthly = annual_to_monthly_rate(config.return_assumptions.bonds.expected_return);
  let cash_monthly = annual_to_monthly_rate(config.return_assumptions.cash.expected_return);

  (0..duration_months)
    .map(|_| MonthlyReturns {
      stocks: stocks_monthly,
      bonds: bonds_monthly,
      cash: cash_monthly,
    })
    .collect()
}

fn to_timeline_month(portfolio_start: &EventDate, start: &EventDate) -> i32 {
  month_key_to_index(portfolio_start, start)
}

fn stress_start_date(scenario: &StressScenario) -> &EventDate {
  match scenario {
    StressScenario::StockCrash { start, .. } => start,
    StressScenario::BondCrash { start, .. } => start,
    StressScenario::BroadMarketCrash { start, .. } => start,
    StressScenario::ProlongedBear { start, .. } => start,
    StressScenario::HighInflationSpike { start, .. } => start,
    StressScenario::Custom { start, .. } => start,
  }
}

fn apply_crash_to_month(month: &MonthlyReturns, stock_shock: f64, bond_shock: f64) -> MonthlyReturns {
  MonthlyReturns {
    stocks: (1.0 + month.stocks) * (1.0 + stock_shock) - 1.0,
    bonds: (1.0 + month.bonds) * (1.0 + bond_shock) - 1.0,
    cash: month.cash,
  }
}

fn apply_stress_transform(
  descriptor: &StressTransformDescriptor,
  baseline_returns: &[MonthlyReturns],
) -> Vec<MonthlyReturns> {
  let mut returns = baseline_returns.to_vec();
  if returns.is_empty() {
    return returns;
  }

  let start_month = to_timeline_month(
    &descriptor.portfolio_start,
    stress_start_date(&descriptor.scenario),
  );
  let start_index = (start_month - 1).max(0) as usize;
  if start_index >= returns.len() {
    return returns;
  }

  match &descriptor.scenario {
    StressScenario::StockCrash { params, .. } => {
      let current = returns[start_index].clone();
      returns[start_index] = apply_crash_to_month(&current, params.drop_pct, 0.0);
    }
    StressScenario::BondCrash { params, .. } => {
      let current = returns[start_index].clone();
      returns[start_index] = apply_crash_to_month(&current, 0.0, params.drop_pct);
    }
    StressScenario::BroadMarketCrash { params, .. } => {
      let current = returns[start_index].clone();
      returns[start_index] =
        apply_crash_to_month(&current, params.stock_drop_pct, params.bond_drop_pct);
    }
    StressScenario::ProlongedBear { params, .. } => {
      let stock_monthly = annual_to_monthly_rate(params.stock_annual_return);
      let bond_monthly = annual_to_monthly_rate(params.bond_annual_return);
      let months = (params.duration_years.max(0) * 12) as usize;
      for index in start_index..(start_index + months).min(returns.len()) {
        let cash = returns[index].cash;
        returns[index] = MonthlyReturns {
          stocks: stock_monthly,
          bonds: bond_monthly,
          cash,
        };
      }
    }
    StressScenario::Custom { params, .. } => {
      for year in &params.years {
        let year_start_index = start_index + ((year.year_offset - 1).max(0) as usize * 12);
        let stocks_monthly = annual_to_monthly_rate(year.stocks_annual_return);
        let bonds_monthly = annual_to_monthly_rate(year.bonds_annual_return);
        let cash_monthly = annual_to_monthly_rate(year.cash_annual_return);
        for index in year_start_index..(year_start_index + 12).min(returns.len()) {
          returns[index] = MonthlyReturns {
            stocks: stocks_monthly,
            bonds: bonds_monthly,
            cash: cash_monthly,
          };
        }
      }
    }
    StressScenario::HighInflationSpike { .. } => {}
  }

  returns
}

fn sample_historical_returns_iid(
  source_months: &[HistoricalMonth],
  duration_months: usize,
  random: &mut Mulberry32,
) -> Vec<MonthlyReturns> {
  (0..duration_months)
    .map(|_| {
      let index = (random.next_f64() * source_months.len() as f64).floor() as usize;
      source_months
        .get(index)
        .or_else(|| source_months.last())
        .map(|month| month.returns.clone())
        .unwrap_or(MonthlyReturns {
          stocks: 0.0,
          bonds: 0.0,
          cash: 0.0,
        })
    })
    .collect()
}

fn sample_historical_returns_block(
  source_months: &[HistoricalMonth],
  duration_months: usize,
  block_length: usize,
  random: &mut Mulberry32,
) -> Vec<MonthlyReturns> {
  let mut result = Vec::with_capacity(duration_months);
  let pool_size = source_months.len();

  while result.len() < duration_months {
    let block_start = (random.next_f64() * pool_size as f64).floor() as usize;
    let take = block_length.min(duration_months - result.len());
    for offset in 0..take {
      let sampled = source_months.get((block_start + offset) % pool_size);
      result.push(
        sampled
          .map(|row| row.returns.clone())
          .unwrap_or(MonthlyReturns {
            stocks: 0.0,
            bonds: 0.0,
            cash: 0.0,
          }),
      );
    }
  }

  result
}

#[derive(Debug, Clone, Copy)]
enum ReturnSource {
  Manual,
  Historical,
}

fn resolve_return_source(config: &SimulationConfig) -> ReturnSource {
  if let Some(source) = config.returns_source.as_deref() {
    if source.eq_ignore_ascii_case("manual") {
      return ReturnSource::Manual;
    }
    return ReturnSource::Historical;
  }

  if config.simulation_mode.eq_ignore_ascii_case("manual") {
    ReturnSource::Manual
  } else {
    ReturnSource::Historical
  }
}

fn clamp_simulation_runs(runs: usize) -> usize {
  runs.max(1).min(MAX_SIMULATION_RUNS)
}

fn resolve_seed(seed: Option<i64>) -> i64 {
  if let Some(value) = seed {
    return value;
  }

  let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_nanos())
    .unwrap_or(0);
  (nanos % (MAX_SEED as u128)) as i64
}

fn run_seed_for_index(seed: i64, run_index: usize) -> i64 {
  seed + (run_index as i64) * RUN_SEED_STRIDE
}

fn inflation_factor(inflation_rate: f64, month_index_one_based: usize) -> f64 {
  (1.0 + inflation_rate).powf(month_index_one_based as f64 / 12.0)
}

fn pmt(rate: f64, nper: f64, pv: f64, fv: f64) -> f64 {
  if nper <= 0.0 {
    return 0.0;
  }

  if rate == 0.0 {
    return (pv + fv) / nper;
  }

  let growth = (1.0 + rate).powf(nper);
  (rate * (pv * growth + fv)) / (growth - 1.0)
}

fn calculate_dynamic_swr_withdrawal(context: &StrategyContext, expected_rate_of_return: f64) -> f64 {
  if context.portfolio_value <= 0.0 || context.remaining_years <= 0.0 {
    return 0.0;
  }

  let roi = expected_rate_of_return;
  let inflation = context.inflation_rate;

  if (roi - inflation).abs() < 1e-12 {
    return round_to_cents(context.portfolio_value / context.remaining_years).max(0.0);
  }

  let denominator = 1.0 - ((1.0 + inflation) / (1.0 + roi)).powf(context.remaining_years);
  if denominator.abs() < 1e-12 {
    return 0.0;
  }

  let annual = (context.portfolio_value * (roi - inflation)) / denominator;
  round_to_cents(annual).max(0.0)
}

fn calculate_dynamic_swr_adaptive_monthly_withdrawal(
  context: &StrategyContext,
  params: &DynamicSwrAdaptiveParams,
) -> f64 {
  if context.portfolio_value <= 0.0 || context.remaining_months == 0 {
    return 0.0;
  }

  let mut nominal_roi = params.fallback_expected_rate_of_return;
  if let (Some(annualized), Some(weights)) = (
    context.annualized_real_returns_by_asset,
    context.start_of_month_weights,
  ) {
    let real_roi =
      weights.stocks * annualized.stocks + weights.bonds * annualized.bonds + weights.cash * annualized.cash;
    nominal_roi = (1.0 + real_roi) * (1.0 + context.inflation_rate) - 1.0;
  }

  let annual_withdrawal = calculate_dynamic_swr_withdrawal(
    &StrategyContext {
      remaining_years: context.remaining_months as f64 / 12.0,
      ..*context
    },
    nominal_roi,
  );
  let raw_monthly = round_to_cents(annual_withdrawal / 12.0).max(0.0);
  if !params.smoothing_enabled {
    return raw_monthly;
  }

  let prior_monthly = context.previous_monthly_withdrawal.unwrap_or(raw_monthly);
  let blend = params.smoothing_blend;
  let smoothed = round_to_cents(prior_monthly * blend + raw_monthly * (1.0 - blend));
  smoothed.max(0.0)
}

fn calculate_annual_withdrawal(context: &StrategyContext, strategy: &WithdrawalStrategy) -> f64 {
  match strategy {
    WithdrawalStrategy::ConstantDollar(params) => {
      if context.year <= 1 {
        if context.initial_portfolio_value <= 0.0 {
          return 0.0;
        }
        return round_to_cents(context.initial_portfolio_value * params.initial_withdrawal_rate);
      }

      if context.previous_withdrawal <= 0.0 {
        return 0.0;
      }

      round_to_cents(context.previous_withdrawal * (1.0 + context.inflation_rate))
    }
    WithdrawalStrategy::PercentOfPortfolio(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }
      round_to_cents(context.portfolio_value * params.annual_withdrawal_rate).max(0.0)
    }
    WithdrawalStrategy::OneOverN(_) => {
      if context.portfolio_value <= 0.0 || context.remaining_years <= 0.0 {
        return 0.0;
      }
      round_to_cents(context.portfolio_value / context.remaining_years).max(0.0)
    }
    WithdrawalStrategy::Vpw(params) => {
      if context.portfolio_value <= 0.0 || context.remaining_years <= 0.0 {
        return 0.0;
      }

      let residual = (1.0 - params.drawdown_target) * context.portfolio_value;
      let annual_real = pmt(
        params.expected_real_return,
        context.remaining_years,
        context.portfolio_value,
        -residual,
      );
      let inflation_factor = (1.0 + context.inflation_rate).powf((context.year - 1) as f64);
      round_to_cents(annual_real * inflation_factor).max(0.0)
    }
    WithdrawalStrategy::DynamicSwr(params) => {
      calculate_dynamic_swr_withdrawal(context, params.expected_rate_of_return)
    }
    WithdrawalStrategy::DynamicSwrAdaptive(params) => {
      calculate_dynamic_swr_adaptive_monthly_withdrawal(context, params)
    }
    WithdrawalStrategy::SensibleWithdrawals(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      let base = context.portfolio_value * params.base_withdrawal_rate;
      if context.year <= 1 {
        return round_to_cents(base).max(0.0);
      }

      let real_gain = context.previous_year_start_portfolio
        * (context.previous_year_return - context.inflation_rate);
      let extras = if real_gain > 0.0 {
        real_gain * params.extras_withdrawal_rate
      } else {
        0.0
      };

      round_to_cents(base + extras).max(0.0)
    }
    WithdrawalStrategy::NinetyFivePercent(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      let target = context.portfolio_value * params.annual_withdrawal_rate;
      if context.year <= 1 {
        return round_to_cents(target).max(0.0);
      }

      let floor = context.previous_withdrawal * params.minimum_floor;
      round_to_cents(target.max(floor)).max(0.0)
    }
    WithdrawalStrategy::GuytonKlinger(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      if context.year <= 1 {
        return round_to_cents(context.initial_portfolio_value * params.initial_withdrawal_rate).max(0.0);
      }

      let initial_rate = params.initial_withdrawal_rate;
      let current_withdrawal_rate = context.previous_withdrawal / context.portfolio_value;
      let should_freeze = context.previous_year_return < 0.0 && current_withdrawal_rate > initial_rate;

      let base = if should_freeze {
        context.previous_withdrawal
      } else {
        context.previous_withdrawal * (1.0 + context.inflation_rate)
      };

      let sunset_year = context.retirement_years - params.guardrails_sunset;
      if context.year > sunset_year {
        return round_to_cents(base).max(0.0);
      }

      let cap_trigger_rate = initial_rate * (1.0 + params.capital_preservation_trigger);
      let prosperity_trigger_rate = initial_rate * (1.0 - params.prosperity_trigger);

      let rate_after_base = base / context.portfolio_value;
      let adjusted = if rate_after_base > cap_trigger_rate {
        base * (1.0 - params.capital_preservation_cut)
      } else {
        base
      };

      let rate_after_adjustment = adjusted / context.portfolio_value;
      let with_prosperity = if rate_after_adjustment < prosperity_trigger_rate {
        adjusted * (1.0 + params.prosperity_raise)
      } else {
        adjusted
      };

      round_to_cents(with_prosperity).max(0.0)
    }
    WithdrawalStrategy::VanguardDynamic(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      let target = context.portfolio_value * params.annual_withdrawal_rate;
      if context.year <= 1 {
        return round_to_cents(target).max(0.0);
      }

      let prior_inflated = context.previous_withdrawal * (1.0 + context.inflation_rate);
      let ceiling_amount = prior_inflated * (1.0 + params.ceiling);
      let floor_amount = prior_inflated * (1.0 - params.floor);
      let clamped = target.max(floor_amount).min(ceiling_amount);
      round_to_cents(clamped).max(0.0)
    }
    WithdrawalStrategy::Endowment(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      let new_calculation = context.portfolio_value * params.spending_rate;
      if context.year <= 1 {
        return round_to_cents(new_calculation).max(0.0);
      }

      let prior_inflated = context.previous_withdrawal * (1.0 + context.inflation_rate);
      let blended = params.smoothing_weight * prior_inflated
        + (1.0 - params.smoothing_weight) * new_calculation;
      round_to_cents(blended).max(0.0)
    }
    WithdrawalStrategy::HebelerAutopilot(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      if context.year <= 1 {
        return round_to_cents(context.initial_portfolio_value * params.initial_withdrawal_rate).max(0.0);
      }

      let pmt_real = pmt(
        params.pmt_expected_return,
        context.remaining_years,
        context.portfolio_value,
        0.0,
      );
      let pmt_nominal = pmt_real * (1.0 + context.inflation_rate).powf((context.year - 1) as f64);
      let prior_component = context.previous_withdrawal * (1.0 + context.inflation_rate);
      let blended = params.prior_year_weight * prior_component
        + (1.0 - params.prior_year_weight) * pmt_nominal;

      round_to_cents(blended).max(0.0)
    }
    WithdrawalStrategy::CapeBased(params) => {
      if context.portfolio_value <= 0.0 {
        return 0.0;
      }

      let cape = context.cape_ratio.unwrap_or(params.starting_cape);
      let safe_cape = if cape <= 0.0 { params.starting_cape } else { cape };
      let rate = params.base_withdrawal_rate + params.cape_weight / safe_cape;
      round_to_cents(context.portfolio_value * rate).max(0.0)
    }
  }
}

fn normalize_weights(weights: AssetWeights) -> AssetWeights {
  let total = weights.stocks + weights.bonds + weights.cash;
  if total <= 0.0 {
    return AssetWeights::default();
  }

  AssetWeights {
    stocks: weights.stocks / total,
    bonds: weights.bonds / total,
    cash: weights.cash / total,
  }
}

fn interpolate(a: f64, b: f64, weight: f64) -> f64 {
  a + (b - a) * weight
}

fn resolve_target_allocation_for_year(
  target_allocation: AssetWeights,
  glide_path_enabled: bool,
  glide_path: &[GlidePathWaypoint],
  year: i32,
) -> AssetWeights {
  if !glide_path_enabled || glide_path.len() < 2 {
    return normalize_weights(target_allocation);
  }

  let mut sorted = glide_path.to_vec();
  sorted.sort_by_key(|point| point.year);

  let first = sorted.first().cloned();
  let last = sorted.last().cloned();
  let (Some(first), Some(last)) = (first, last) else {
    return normalize_weights(target_allocation);
  };

  if year <= first.year {
    return normalize_weights(first.allocation);
  }

  if year >= last.year {
    return normalize_weights(last.allocation);
  }

  for idx in 0..sorted.len().saturating_sub(1) {
    let left = &sorted[idx];
    let right = &sorted[idx + 1];
    if year < left.year || year > right.year {
      continue;
    }

    let span = right.year - left.year;
    let weight = if span == 0 {
      0.0
    } else {
      (year - left.year) as f64 / span as f64
    };

    return normalize_weights(AssetWeights {
      stocks: interpolate(left.allocation.stocks, right.allocation.stocks, weight),
      bonds: interpolate(left.allocation.bonds, right.allocation.bonds, weight),
      cash: interpolate(left.allocation.cash, right.allocation.cash, weight),
    });
  }

  normalize_weights(target_allocation)
}

fn deduct(
  balances: &mut AssetBalances,
  withdrawn_by_asset: &mut AssetBalances,
  asset: AssetClass,
  amount: f64,
) -> f64 {
  if amount <= 0.0 {
    return 0.0;
  }

  let available = asset_get(balances, asset);
  let deduction = available.min(round_to_cents(amount));
  asset_set(balances, asset, round_to_cents(available - deduction));
  let withdrawn = round_to_cents(asset_get(withdrawn_by_asset, asset) + deduction);
  asset_set(withdrawn_by_asset, asset, withdrawn);
  deduction
}

fn apply_bucket_drawdown(
  balances: &AssetBalances,
  requested_withdrawal: f64,
  bucket_order: &[AssetClass],
) -> DrawdownResult {
  let mut next_balances = *balances;
  let mut withdrawn_by_asset = empty_asset_balances();
  let mut remaining = round_to_cents(requested_withdrawal);

  for asset in bucket_order {
    if remaining <= 0.0 {
      break;
    }

    let available = asset_get(&next_balances, *asset);
    let deduction = remaining.min(available);

    asset_set(&mut next_balances, *asset, round_to_cents(available - deduction));
    let current_withdrawn = asset_get(&withdrawn_by_asset, *asset);
    asset_set(
      &mut withdrawn_by_asset,
      *asset,
      round_to_cents(current_withdrawn + deduction),
    );
    remaining = round_to_cents(remaining - deduction);
  }

  let total_withdrawn = round_to_cents(requested_withdrawal - remaining);
  DrawdownResult {
    balances: next_balances,
    withdrawn_by_asset,
    total_withdrawn,
    shortfall: remaining,
  }
}

fn apply_rebalancing_drawdown(
  balances: &AssetBalances,
  requested_withdrawal: f64,
  target_allocation: AssetWeights,
) -> DrawdownResult {
  let mut next_balances = *balances;
  let mut withdrawn_by_asset = empty_asset_balances();
  let mut remaining = round_to_cents(requested_withdrawal);

  if remaining <= 0.0 {
    return DrawdownResult {
      balances: next_balances,
      withdrawn_by_asset,
      total_withdrawn: 0.0,
      shortfall: 0.0,
    };
  }

  let starting_total = total_portfolio(&next_balances);
  if starting_total <= 0.0 {
    return DrawdownResult {
      balances: next_balances,
      withdrawn_by_asset,
      total_withdrawn: 0.0,
      shortfall: remaining,
    };
  }

  let normalized_target = normalize_weights(target_allocation);
  let mut overweight = [AssetClass::Stocks, AssetClass::Bonds, AssetClass::Cash]
    .iter()
    .map(|asset| {
      let target = round_to_cents(starting_total * asset_get_weights(&normalized_target, *asset));
      let value = asset_get(&next_balances, *asset);
      (*asset, (value - target).max(0.0))
    })
    .collect::<Vec<(AssetClass, f64)>>();

  overweight.sort_by(|left, right| right.1.partial_cmp(&left.1).unwrap_or(std::cmp::Ordering::Equal));

  for (asset, overweight_amount) in overweight {
    if remaining <= 0.0 {
      break;
    }
    let used = deduct(
      &mut next_balances,
      &mut withdrawn_by_asset,
      asset,
      remaining.min(round_to_cents(overweight_amount)),
    );
    remaining = round_to_cents(remaining - used);
  }

  if remaining > 0.0 {
    while remaining > 0.0 {
      let available_assets = [AssetClass::Stocks, AssetClass::Bonds, AssetClass::Cash]
        .iter()
        .copied()
        .filter(|asset| asset_get(&next_balances, *asset) > 0.0)
        .collect::<Vec<AssetClass>>();
      if available_assets.is_empty() {
        break;
      }

      let available_total = available_assets
        .iter()
        .map(|asset| asset_get(&next_balances, *asset))
        .sum::<f64>();

      let mut deducted_this_pass = 0.0;
      for asset in &available_assets {
        if remaining <= 0.0 {
          break;
        }
        let share = if available_total <= 0.0 {
          0.0
        } else {
          remaining * (asset_get(&next_balances, *asset) / available_total)
        };
        let used = deduct(&mut next_balances, &mut withdrawn_by_asset, *asset, share);
        deducted_this_pass = round_to_cents(deducted_this_pass + used);
      }

      if deducted_this_pass <= 0.0 {
        let fallback = available_assets
          .iter()
          .max_by(|left, right| {
            asset_get(&next_balances, **left)
              .partial_cmp(&asset_get(&next_balances, **right))
              .unwrap_or(std::cmp::Ordering::Equal)
          })
          .copied();
        if let Some(asset) = fallback {
          let used = deduct(&mut next_balances, &mut withdrawn_by_asset, asset, remaining);
          deducted_this_pass = round_to_cents(deducted_this_pass + used);
        }
      }

      remaining = round_to_cents(remaining - deducted_this_pass);
    }
  }

  DrawdownResult {
    balances: next_balances,
    withdrawn_by_asset,
    total_withdrawn: round_to_cents(requested_withdrawal - remaining),
    shortfall: remaining,
  }
}

fn apply_configured_drawdown(
  balances: &AssetBalances,
  requested_withdrawal: f64,
  drawdown_strategy: &DrawdownStrategy,
  year: i32,
) -> DrawdownResult {
  match drawdown_strategy {
    DrawdownStrategy::Bucket { bucket_order } => {
      apply_bucket_drawdown(balances, requested_withdrawal, bucket_order)
    }
    DrawdownStrategy::Rebalancing { rebalancing } => {
      let target_allocation = resolve_target_allocation_for_year(
        rebalancing.target_allocation,
        rebalancing.glide_path_enabled,
        &rebalancing.glide_path,
        year,
      );
      apply_rebalancing_drawdown(balances, requested_withdrawal, target_allocation)
    }
  }
}

fn sum_event_expenses(
  balances: &mut AssetBalances,
  expense_schedule: &[ExpenseEventSchedule<'_>],
  config: &SimulationConfig,
  month_index: usize,
  year: i32,
  inflation_rate_for_year: &dyn Fn(i32) -> f64,
) -> ExpenseResult {
  let mut actual_total = 0.0;
  let mut shortfall_total = 0.0;

  for scheduled in expense_schedule {
    let event = scheduled.event;
    let month = month_index as i32;
    if month < scheduled.start_month || month > scheduled.end_month {
      continue;
    }

    let offset = month - scheduled.start_month;
    if !event_matches_frequency(offset, event.frequency) {
      continue;
    }

    let amount = event_amount_for_month(
      event.amount,
      event.inflation_adjusted,
      inflation_rate_for_year,
      month_index,
    );

    match &event.source_from {
      ExpenseSource::FollowDrawdown(value) if value == "follow-drawdown" => {
        let result = apply_configured_drawdown(balances, amount, &config.drawdown_strategy, year);
        *balances = result.balances;
        actual_total = round_to_cents(actual_total + result.total_withdrawn);
        shortfall_total = round_to_cents(shortfall_total + result.shortfall);
      }
      ExpenseSource::Asset(asset) => {
        let (actual, shortfall) = apply_expense_from_single_asset(balances, *asset, amount);
        actual_total = round_to_cents(actual_total + actual);
        shortfall_total = round_to_cents(shortfall_total + shortfall);
      }
      ExpenseSource::FollowDrawdown(_) => {
        let result = apply_configured_drawdown(balances, amount, &config.drawdown_strategy, year);
        *balances = result.balances;
        actual_total = round_to_cents(actual_total + result.total_withdrawn);
        shortfall_total = round_to_cents(shortfall_total + result.shortfall);
      }
    }
  }

  ExpenseResult {
    actual_total,
    shortfall_total,
  }
}

fn to_real_monthly_return(nominal_monthly_return: f64, annual_inflation_rate: f64) -> f64 {
  let monthly_inflation = annual_to_monthly_rate(annual_inflation_rate);
  ((1.0 + nominal_monthly_return) / (1.0 + monthly_inflation)) - 1.0
}

fn asset_get_weights(weights: &AssetWeights, asset: AssetClass) -> f64 {
  match asset {
    AssetClass::Stocks => weights.stocks,
    AssetClass::Bonds => weights.bonds,
    AssetClass::Cash => weights.cash,
  }
}

fn simulate_retirement(
  config: &SimulationConfig,
  monthly_returns_series: &[MonthlyReturns],
  actual_overrides_by_month: &HashMap<usize, ActualMonthOverride>,
  inflation_overrides_by_year: &HashMap<i32, f64>,
  options: SimulateOptions,
  mut on_month_complete: Option<&mut dyn FnMut(MonthCompleteSummary)>,
) -> SinglePathResult {
  let include_rows = options.include_rows;
  let duration_months =
    months_between(&config.core_params.portfolio_start, &config.core_params.portfolio_end).max(0) as usize;
  let portfolio_months = duration_months as i32;
  let initial_balances = config.portfolio;
  let inflation_rate_for_year = |year: i32| {
    inflation_overrides_by_year
      .get(&year)
      .copied()
      .unwrap_or(config.core_params.inflation_rate)
  };
  let inflation_factor_by_month =
    build_monthly_inflation_factors(duration_months, &inflation_rate_for_year);

  let inflate_by_schedule = |base_amount: f64, year_offset: i32| {
    let mut inflated = base_amount;
    for offset in 1..=year_offset {
      inflated = inflate_annual_amount(inflated, inflation_rate_for_year(offset), 1);
    }
    round_to_cents(inflated)
  };

  let mut balances = initial_balances;
  let mut previous_annual_withdrawal = 0.0;
  let mut previous_year_return = 0.0;
  let mut previous_year_start_portfolio = total_portfolio(&initial_balances);
  let mut current_year_start_portfolio = total_portfolio(&initial_balances);
  let mut current_year_return_factor = 1.0;
  let mut current_monthly_withdrawal = 0.0;
  let mut previous_adaptive_final_monthly_withdrawal: Option<f64> = None;
  let mut total_withdrawn = 0.0;
  let mut total_shortfall = 0.0;

  let mut adaptive_rolling_returns = match &config.withdrawal_strategy {
    WithdrawalStrategy::DynamicSwrAdaptive(params) => Some(RollingAnnualizedRealReturns::new(params.lookback_months)),
    _ => None,
  };
  let spending_phase_schedule = build_spending_phase_schedule(config);
  let withdrawal_start_month_index = resolve_withdrawal_start_month_index(&spending_phase_schedule);
  let total_withdrawal_months = match withdrawal_start_month_index {
    Some(start) => portfolio_months - (start - 1),
    None => portfolio_months,
  };
  let total_withdrawal_years = (total_withdrawal_months as f64 / 12.0).ceil() as i32;
  let income_event_schedule = build_income_event_schedule(config, portfolio_months);
  let expense_event_schedule = build_expense_event_schedule(config, portfolio_months);

  let mut rows = if include_rows {
    Vec::with_capacity(duration_months)
  } else {
    Vec::new()
  };

  for month_index in 0..duration_months {
    let one_based_month = month_index + 1;
    let year = (month_index / 12) as i32 + 1;
    let month_in_year = (month_index % 12) as i32 + 1;

    let override_month = actual_overrides_by_month.get(&one_based_month);
    let mut start_balances = balances;

    if let Some(override_month) = override_month {
      if let Some(start_override) = &override_month.start_balances {
        start_balances.stocks = round_to_cents(start_override.stocks.unwrap_or(start_balances.stocks));
        start_balances.bonds = round_to_cents(start_override.bonds.unwrap_or(start_balances.bonds));
        start_balances.cash = round_to_cents(start_override.cash.unwrap_or(start_balances.cash));
      }
    }

    let start_portfolio_value = total_portfolio(&start_balances);

    if month_in_year == 1 {
      current_year_start_portfolio = start_portfolio_value;
      current_year_return_factor = 1.0;
    }

    let returns = monthly_returns_series
      .get(month_index)
      .cloned()
      .unwrap_or(MonthlyReturns {
        stocks: 0.0,
        bonds: 0.0,
        cash: 0.0,
      });

    let after_market = apply_market_returns(&start_balances, &returns);
    let market_change = if include_rows {
      diff_balances(&after_market, &start_balances)
    } else {
      empty_asset_balances()
    };

    let after_market_value = total_portfolio(&after_market);
    if start_portfolio_value > 0.0 {
      current_year_return_factor *= after_market_value / start_portfolio_value;
    }
    balances = after_market;

    let mut income_total = 0.0;
    if override_month.and_then(|entry| entry.income_total).is_none() {
      income_total = sum_event_income(
        &mut balances,
        &income_event_schedule,
        one_based_month,
        &inflation_rate_for_year,
      );
    }

    let phase = find_spending_phase_for_month(&spending_phase_schedule, one_based_month as i32);
    let withdrawal_month_index = match withdrawal_start_month_index {
      Some(start) => one_based_month as i32 - start + 1,
      None => one_based_month as i32,
    };
    let withdrawal_year = ((withdrawal_month_index - 1) / 12) + 1;
    let withdrawal_month_in_year = ((withdrawal_month_index - 1) % 12) + 1;
    let remaining_withdrawal_months = total_withdrawal_months - (withdrawal_month_index - 1);
    let remaining_retirement_years = (remaining_withdrawal_months as f64 / 12.0).ceil();

    if phase.is_none() {
      previous_annual_withdrawal = 0.0;
      current_monthly_withdrawal = 0.0;
      previous_adaptive_final_monthly_withdrawal = Some(0.0);
    } else {
      match &config.withdrawal_strategy {
        WithdrawalStrategy::DynamicSwrAdaptive(_) => {
          let annualized_real_returns_by_asset = adaptive_rolling_returns
            .as_ref()
            .and_then(|rolling| rolling.annualized());
          let monthly_withdrawal = calculate_annual_withdrawal(
            &StrategyContext {
              year: withdrawal_year,
              retirement_years: total_withdrawal_years,
              portfolio_value: total_portfolio(&balances),
              initial_portfolio_value: total_portfolio(&initial_balances),
              previous_withdrawal: previous_annual_withdrawal,
              previous_monthly_withdrawal: previous_adaptive_final_monthly_withdrawal,
              previous_year_return,
              previous_year_start_portfolio,
              remaining_years: remaining_retirement_years,
              remaining_months: duration_months - month_index,
              inflation_rate: inflation_rate_for_year(year),
              start_of_month_weights: Some(resolve_start_of_month_weights(&start_balances)),
              annualized_real_returns_by_asset,
              cape_ratio: None,
            },
            &config.withdrawal_strategy,
          );

          if let Some(phase) = phase {
            let monthly_inflation_factor = inflation_factor_by_month[one_based_month];
            let monthly_min = phase
              .min_monthly_spend
              .map(|value| round_to_cents(value * monthly_inflation_factor))
              .unwrap_or(0.0);
            let monthly_max = phase
              .max_monthly_spend
              .map(|value| round_to_cents(value * monthly_inflation_factor))
              .unwrap_or(f64::INFINITY);
            current_monthly_withdrawal = monthly_withdrawal.max(monthly_min).min(monthly_max);
          } else {
            current_monthly_withdrawal = monthly_withdrawal;
          }
        }
        _ => {
          if withdrawal_month_in_year == 1 || current_monthly_withdrawal == 0.0 {
            let annual_withdrawal = calculate_annual_withdrawal(
              &StrategyContext {
                year: withdrawal_year,
                retirement_years: total_withdrawal_years,
                portfolio_value: total_portfolio(&balances),
                initial_portfolio_value: total_portfolio(&initial_balances),
                previous_withdrawal: previous_annual_withdrawal,
                previous_monthly_withdrawal: None,
                previous_year_return,
                previous_year_start_portfolio,
                remaining_years: remaining_retirement_years,
                remaining_months: duration_months - month_index,
                inflation_rate: config.core_params.inflation_rate,
                start_of_month_weights: Some(resolve_start_of_month_weights(&start_balances)),
                annualized_real_returns_by_asset: None,
                cape_ratio: None,
              },
              &config.withdrawal_strategy,
            );

            let clamped_annual = if let Some(phase) = phase {
              let annual_min = phase
                .min_monthly_spend
                .map(|value| round_to_cents(inflate_by_schedule(value * 12.0, year - 1)))
                .unwrap_or(0.0);
              let annual_max = phase
                .max_monthly_spend
                .map(|value| round_to_cents(inflate_by_schedule(value * 12.0, year - 1)))
                .unwrap_or(f64::INFINITY);
              annual_withdrawal.max(annual_min).min(annual_max)
            } else {
              annual_withdrawal
            };

            previous_annual_withdrawal = clamped_annual;
            current_monthly_withdrawal = round_to_cents(clamped_annual / 12.0);
          }
        }
      }
    }

    let edited_withdrawals = override_month.and_then(|entry| apply_edited_withdrawals(&mut balances, entry));
    let drawdown = if let Some(edited) = &edited_withdrawals {
      DrawdownResult {
        balances,
        withdrawn_by_asset: edited.by_asset,
        total_withdrawn: edited.actual,
        shortfall: edited.shortfall,
      }
    } else {
      apply_configured_drawdown(&balances, current_monthly_withdrawal, &config.drawdown_strategy, year)
    };

    balances = drawdown.balances;
    total_withdrawn = round_to_cents(total_withdrawn + drawdown.total_withdrawn);
    total_shortfall = round_to_cents(total_shortfall + drawdown.shortfall);

    if let Some(override_month) = override_month {
      if let Some(income_override) = override_month.income_total {
        income_total = round_to_cents(income_override.max(0.0));
        balances.cash = round_to_cents(balances.cash + income_total);
      }
    }

    let expense_result = if let Some(override_month) = override_month {
      if let Some(expense_override) = override_month.expense_total {
        let amount = round_to_cents(expense_override.max(0.0));
        let expense_drawdown =
          apply_configured_drawdown(&balances, amount, &config.drawdown_strategy, year);
        balances = expense_drawdown.balances;
        ExpenseResult {
          actual_total: expense_drawdown.total_withdrawn,
          shortfall_total: expense_drawdown.shortfall,
        }
      } else {
        sum_event_expenses(
          &mut balances,
          &expense_event_schedule,
          config,
          one_based_month,
          year,
          &inflation_rate_for_year,
        )
      }
    } else {
      sum_event_expenses(
        &mut balances,
        &expense_event_schedule,
        config,
        one_based_month,
        year,
        &inflation_rate_for_year,
      )
    };

    total_shortfall = round_to_cents(total_shortfall + expense_result.shortfall_total);

    if month_in_year == 12 {
      previous_year_return = current_year_return_factor - 1.0;
      previous_year_start_portfolio = current_year_start_portfolio;
    }

    let requested_withdrawal = edited_withdrawals
      .as_ref()
      .map(|entry| entry.requested)
      .unwrap_or(current_monthly_withdrawal);

    if include_rows {
      rows.push(MonthlySimulationRow {
        month_index: one_based_month,
        year,
        month_in_year,
        start_balances,
        market_change,
        withdrawals: MonthlyWithdrawal {
          by_asset: drawdown.withdrawn_by_asset,
          requested: requested_withdrawal,
          actual: drawdown.total_withdrawn,
          shortfall: drawdown.shortfall,
        },
        income_total,
        expense_total: expense_result.actual_total,
        end_balances: balances,
      });
    }

    if let Some(handler) = on_month_complete.as_mut() {
      handler(MonthCompleteSummary {
        month_index: one_based_month,
        end_stocks: balances.stocks,
        end_bonds: balances.bonds,
        end_cash: balances.cash,
        withdrawal_requested: requested_withdrawal,
        withdrawal_actual: drawdown.total_withdrawn,
      });
    }

    if matches!(&config.withdrawal_strategy, WithdrawalStrategy::DynamicSwrAdaptive(_)) {
      previous_adaptive_final_monthly_withdrawal = Some(requested_withdrawal);
    }

    if let Some(rolling) = adaptive_rolling_returns.as_mut() {
      let inflation_for_month = inflation_rate_for_year(year);
      rolling.push(&MonthlyReturns {
        stocks: to_real_monthly_return(returns.stocks, inflation_for_month),
        bonds: to_real_monthly_return(returns.bonds, inflation_for_month),
        cash: to_real_monthly_return(returns.cash, inflation_for_month),
      });
    }
  }

  SinglePathResult {
    rows,
    summary: PathSummary {
      total_withdrawn,
      total_shortfall,
      terminal_portfolio_value: total_portfolio(&balances),
    },
  }
}

fn quantile(sorted_values: &[f64], percentile: f64) -> f64 {
  if sorted_values.is_empty() {
    return 0.0;
  }

  let index = (sorted_values.len() - 1) as f64 * percentile;
  let lower = index.floor() as usize;
  let upper = index.ceil() as usize;

  if lower == upper {
    return sorted_values.get(lower).copied().unwrap_or(0.0);
  }

  let lower_value = sorted_values.get(lower).copied().unwrap_or(0.0);
  let upper_value = sorted_values.get(upper).copied().unwrap_or(0.0);
  let weight = index - lower as f64;
  lower_value + (upper_value - lower_value) * weight
}

fn mean(values: &[f64]) -> f64 {
  if values.is_empty() {
    return 0.0;
  }
  values.iter().sum::<f64>() / values.len() as f64
}

fn std_dev_population(values: &[f64]) -> f64 {
  if values.is_empty() {
    return 0.0;
  }

  let avg = mean(values);
  let variance = values
    .iter()
    .map(|value| {
      let delta = value - avg;
      delta * delta
    })
    .sum::<f64>()
    / values.len() as f64;

  variance.sqrt()
}

fn values_to_quantiles(mut values: Vec<f64>) -> [f64; 7] {
  values.sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
  [
    quantile(&values, 0.05),
    quantile(&values, 0.10),
    quantile(&values, 0.25),
    quantile(&values, 0.50),
    quantile(&values, 0.75),
    quantile(&values, 0.90),
    quantile(&values, 0.95),
  ]
}

fn select_representative_run(
  run_summaries: &[RunSummary],
  terminal_median: f64,
  drawdown_median: f64,
) -> RunSummary {
  let mut best = run_summaries[0].clone();

  for candidate in run_summaries.iter().skip(1) {
    let candidate_terminal_delta = (candidate.terminal_value - terminal_median).abs();
    let best_terminal_delta = (best.terminal_value - terminal_median).abs();
    if candidate_terminal_delta < best_terminal_delta {
      best = candidate.clone();
      continue;
    }
    if candidate_terminal_delta > best_terminal_delta {
      continue;
    }

    let candidate_drawdown_delta = (candidate.total_drawdown - drawdown_median).abs();
    let best_drawdown_delta = (best.total_drawdown - drawdown_median).abs();
    if candidate_drawdown_delta < best_drawdown_delta {
      best = candidate.clone();
      continue;
    }
    if candidate_drawdown_delta > best_drawdown_delta {
      continue;
    }

    if candidate.total_shortfall < best.total_shortfall {
      best = candidate.clone();
      continue;
    }
    if candidate.total_shortfall > best.total_shortfall {
      continue;
    }

    if candidate.run_index < best.run_index {
      best = candidate.clone();
    }
  }

  best
}

fn build_returns_for_run(
  config: &SimulationConfig,
  options: &MonteCarloOptions,
  run_index: usize,
  seed_used: i64,
  returns_source: ReturnSource,
  historical_months: &[HistoricalMonth],
  duration_months: usize,
) -> Vec<MonthlyReturns> {
  let run_seed = run_seed_for_index(seed_used, run_index);
  let mut random = Mulberry32::new(run_seed);

  let returns = match returns_source {
    ReturnSource::Manual => generate_monthly_returns_from_assumptions(config, run_seed),
    ReturnSource::Historical => {
      if config.block_bootstrap_enabled {
        sample_historical_returns_block(
          historical_months,
          duration_months,
          config.block_bootstrap_length,
          &mut random,
        )
      } else {
        sample_historical_returns_iid(historical_months, duration_months, &mut random)
      }
    }
  };

  if let Some(descriptor) = &options.stress_transform {
    return apply_stress_transform(descriptor, &returns);
  }

  returns
}

fn run_monte_carlo_internal(
  config: SimulationConfig,
  options: MonteCarloOptions,
  historical_months: Vec<HistoricalMonth>,
  historical_summary: Value,
) -> Result<MonteCarloExecutionResult> {
  let simulation_count = clamp_simulation_runs(
    options
      .runs
      .map(|value| value as usize)
      .or_else(|| config.simulation_runs.map(|value| value as usize))
      .unwrap_or(DEFAULT_SIMULATION_RUNS),
  );
  let seed_used = resolve_seed(options.seed);
  let duration_months =
    months_between(&config.core_params.portfolio_start, &config.core_params.portfolio_end).max(0) as usize;

  let returns_source = resolve_return_source(&config);
  if matches!(returns_source, ReturnSource::Historical) && historical_months.is_empty() {
    return Err(Error::from_reason(
      "No historical data rows available for selected era".to_string(),
    ));
  }

  let normalized_actual_overrides = normalize_overrides(options.actual_overrides_by_month.clone());
  let normalized_inflation_overrides =
    normalize_inflation_overrides(options.inflation_overrides_by_year.clone());

  let run_computations: Vec<RunComputation> = (0..simulation_count)
    .into_par_iter()
    .map(|run_index| {
      let mut requested_withdrawal_by_month = vec![false; duration_months];
      let mut actual_withdrawal_real_by_month = vec![0.0; duration_months];
      let mut month_end_totals = vec![0.0; duration_months];
      let mut month_end_stocks = vec![0.0; duration_months];
      let mut month_end_bonds = vec![0.0; duration_months];
      let mut month_end_cash = vec![0.0; duration_months];

      let returns = build_returns_for_run(
        &config,
        &options,
        run_index,
        seed_used,
        returns_source,
        &historical_months,
        duration_months,
      );

      let mut callback = |summary: MonthCompleteSummary| {
        let month = summary.month_index - 1;
        if summary.withdrawal_requested > 0.0 {
          requested_withdrawal_by_month[month] = true;
        }
        actual_withdrawal_real_by_month[month] = summary.withdrawal_actual
          / inflation_factor(config.core_params.inflation_rate, summary.month_index);
        month_end_stocks[month] = summary.end_stocks;
        month_end_bonds[month] = summary.end_bonds;
        month_end_cash[month] = summary.end_cash;
        month_end_totals[month] = summary.end_stocks + summary.end_bonds + summary.end_cash;
      };

      let path = simulate_retirement(
        &config,
        &returns,
        &normalized_actual_overrides,
        &normalized_inflation_overrides,
        SimulateOptions { include_rows: false },
        Some(&mut callback),
      );

      RunComputation {
        run_index,
        month_end_totals,
        month_end_stocks,
        month_end_bonds,
        month_end_cash,
        requested_withdrawal_by_month,
        actual_withdrawal_real_by_month,
        summary: path.summary,
      }
    })
    .collect();

  let mut monthly_withdrawals_real_by_run = vec![Vec::<f64>::new(); duration_months];
  let mut terminal_values = vec![0.0; simulation_count];
  let mut total_drawdowns = vec![0.0; simulation_count];
  let mut run_summaries = Vec::with_capacity(simulation_count);
  let mut success_count = 0usize;

  for run in &run_computations {
    let has_requested_withdrawals = run
      .requested_withdrawal_by_month
      .iter()
      .copied()
      .any(|requested| requested);

    for month in 0..duration_months {
      if has_requested_withdrawals && !run.requested_withdrawal_by_month[month] {
        continue;
      }
      monthly_withdrawals_real_by_run[month].push(run.actual_withdrawal_real_by_month[month]);
    }

    terminal_values[run.run_index] = run.summary.terminal_portfolio_value;
    total_drawdowns[run.run_index] = run.summary.total_withdrawn;
    run_summaries.push(RunSummary {
      run_index: run.run_index,
      terminal_value: run.summary.terminal_portfolio_value,
      total_drawdown: run.summary.total_withdrawn,
      total_shortfall: run.summary.total_shortfall,
    });

    if run.summary.terminal_portfolio_value > 0.0 {
      success_count += 1;
    }
  }

  let mut sorted_terminal_values = terminal_values.clone();
  sorted_terminal_values
    .sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
  let mut sorted_total_drawdowns = total_drawdowns.clone();
  sorted_total_drawdowns
    .sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));

  let terminal_median = quantile(&sorted_terminal_values, 0.5);
  let drawdown_median = quantile(&sorted_total_drawdowns, 0.5);
  let representative_run = select_representative_run(&run_summaries, terminal_median, drawdown_median);

  let representative_returns = build_returns_for_run(
    &config,
    &options,
    representative_run.run_index,
    seed_used,
    returns_source,
    &historical_months,
    duration_months,
  );
  let representative_path = simulate_retirement(
    &config,
    &representative_returns,
    &normalized_actual_overrides,
    &normalized_inflation_overrides,
    SimulateOptions { include_rows: true },
    None,
  );

  let monthly_quantiles: Vec<MonthlyQuantiles> = (0..duration_months)
    .into_par_iter()
    .map(|month| {
      let mut totals = Vec::with_capacity(simulation_count);
      let mut stocks = Vec::with_capacity(simulation_count);
      let mut bonds = Vec::with_capacity(simulation_count);
      let mut cash = Vec::with_capacity(simulation_count);

      for run in &run_computations {
        totals.push(run.month_end_totals[month]);
        stocks.push(run.month_end_stocks[month]);
        bonds.push(run.month_end_bonds[month]);
        cash.push(run.month_end_cash[month]);
      }

      MonthlyQuantiles {
        total: values_to_quantiles(totals),
        stocks: values_to_quantiles(stocks),
        bonds: values_to_quantiles(bonds),
        cash: values_to_quantiles(cash),
      }
    })
    .collect();

  let mut total_curve = MonteCarloPercentileCurves {
    p05: Vec::with_capacity(duration_months),
    p10: Vec::with_capacity(duration_months),
    p25: Vec::with_capacity(duration_months),
    p50: Vec::with_capacity(duration_months),
    p75: Vec::with_capacity(duration_months),
    p90: Vec::with_capacity(duration_months),
    p95: Vec::with_capacity(duration_months),
  };
  let mut stocks_curve = total_curve.clone();
  let mut bonds_curve = total_curve.clone();
  let mut cash_curve = total_curve.clone();

  for quantiles in monthly_quantiles {
    total_curve.p05.push(quantiles.total[0]);
    total_curve.p10.push(quantiles.total[1]);
    total_curve.p25.push(quantiles.total[2]);
    total_curve.p50.push(quantiles.total[3]);
    total_curve.p75.push(quantiles.total[4]);
    total_curve.p90.push(quantiles.total[5]);
    total_curve.p95.push(quantiles.total[6]);

    stocks_curve.p05.push(quantiles.stocks[0]);
    stocks_curve.p10.push(quantiles.stocks[1]);
    stocks_curve.p25.push(quantiles.stocks[2]);
    stocks_curve.p50.push(quantiles.stocks[3]);
    stocks_curve.p75.push(quantiles.stocks[4]);
    stocks_curve.p90.push(quantiles.stocks[5]);
    stocks_curve.p95.push(quantiles.stocks[6]);

    bonds_curve.p05.push(quantiles.bonds[0]);
    bonds_curve.p10.push(quantiles.bonds[1]);
    bonds_curve.p25.push(quantiles.bonds[2]);
    bonds_curve.p50.push(quantiles.bonds[3]);
    bonds_curve.p75.push(quantiles.bonds[4]);
    bonds_curve.p90.push(quantiles.bonds[5]);
    bonds_curve.p95.push(quantiles.bonds[6]);

    cash_curve.p05.push(quantiles.cash[0]);
    cash_curve.p10.push(quantiles.cash[1]);
    cash_curve.p25.push(quantiles.cash[2]);
    cash_curve.p50.push(quantiles.cash[3]);
    cash_curve.p75.push(quantiles.cash[4]);
    cash_curve.p90.push(quantiles.cash[5]);
    cash_curve.p95.push(quantiles.cash[6]);
  }

  let mut monthly_withdrawal_p50_series = Vec::new();
  for values in &mut monthly_withdrawals_real_by_run {
    if values.is_empty() {
      continue;
    }
    values.sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
    monthly_withdrawal_p50_series.push(quantile(values, 0.5));
  }

  let mut sorted_monthly_withdrawal_p50_series = monthly_withdrawal_p50_series.clone();
  sorted_monthly_withdrawal_p50_series
    .sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));

  Ok(MonteCarloExecutionResult {
    representative_path,
    seed_used,
    monte_carlo: MonteCarloResult {
      simulation_count,
      success_count,
      probability_of_success: success_count as f64 / simulation_count as f64,
      terminal_values,
      withdrawal_stats_real: MonteCarloWithdrawalStatsReal {
        median_monthly: quantile(&sorted_monthly_withdrawal_p50_series, 0.5),
        mean_monthly: mean(&monthly_withdrawal_p50_series),
        std_dev_monthly: std_dev_population(&monthly_withdrawal_p50_series),
        p25_monthly: quantile(&sorted_monthly_withdrawal_p50_series, 0.25),
        p75_monthly: quantile(&sorted_monthly_withdrawal_p50_series, 0.75),
      },
      percentile_curves: PercentileCurveSet {
        total: total_curve,
        stocks: stocks_curve,
        bonds: bonds_curve,
        cash: cash_curve,
      },
      historical_summary,
    },
  })
}

#[napi]
pub fn run_monte_carlo_json(request: NativeMonteCarloRequest) -> Result<NativeMonteCarloResponse> {
  let config: SimulationConfig = serde_json::from_str(&request.config_json)
    .map_err(|error| Error::from_reason(format!("Invalid configJson: {error}")))?;

  let options: MonteCarloOptions = match request.options_json {
    Some(options_json) => serde_json::from_str(&options_json)
      .map_err(|error| Error::from_reason(format!("Invalid optionsJson: {error}")))?,
    None => MonteCarloOptions::default(),
  };

  let historical_months: Vec<HistoricalMonth> = match request.historical_months_json {
    Some(historical_months_json) => serde_json::from_str(&historical_months_json)
      .map_err(|error| Error::from_reason(format!("Invalid historicalMonthsJson: {error}")))?,
    None => Vec::new(),
  };

  let historical_summary: Value = match request.historical_summary_json {
    Some(historical_summary_json) => serde_json::from_str(&historical_summary_json)
      .map_err(|error| Error::from_reason(format!("Invalid historicalSummaryJson: {error}")))?,
    None => Value::Null,
  };

  let result = run_monte_carlo_internal(config, options, historical_months, historical_summary)?;
  let result_json = serde_json::to_string(&result)
    .map_err(|error| Error::from_reason(format!("Failed to serialize result JSON: {error}")))?;

  Ok(NativeMonteCarloResponse { result_json })
}

fn parse_actual_overrides_json(
  raw: Option<String>,
  field_name: &str,
) -> Result<Option<HashMap<String, ActualMonthOverride>>> {
  match raw {
    Some(actual_overrides_json) => serde_json::from_str(&actual_overrides_json)
      .map(Some)
      .map_err(|error| Error::from_reason(format!("Invalid {field_name}: {error}"))),
    None => Ok(None),
  }
}

fn parse_inflation_overrides_json(
  raw: Option<String>,
  field_name: &str,
) -> Result<Option<HashMap<String, f64>>> {
  match raw {
    Some(inflation_overrides_json) => serde_json::from_str(&inflation_overrides_json)
      .map(Some)
      .map_err(|error| Error::from_reason(format!("Invalid {field_name}: {error}"))),
    None => Ok(None),
  }
}

#[napi]
pub fn run_single_path_json(request: NativeSinglePathRequest) -> Result<NativeSinglePathResponse> {
  let config: SimulationConfig = serde_json::from_str(&request.config_json)
    .map_err(|error| Error::from_reason(format!("Invalid configJson: {error}")))?;
  let monthly_returns: Vec<MonthlyReturns> = serde_json::from_str(&request.monthly_returns_json)
    .map_err(|error| Error::from_reason(format!("Invalid monthlyReturnsJson: {error}")))?;
  let actual_overrides =
    parse_actual_overrides_json(request.actual_overrides_by_month_json, "actualOverridesByMonthJson")?;
  let inflation_overrides = parse_inflation_overrides_json(
    request.inflation_overrides_by_year_json,
    "inflationOverridesByYearJson",
  )?;

  let normalized_actual_overrides = normalize_overrides(actual_overrides);
  let normalized_inflation_overrides = normalize_inflation_overrides(inflation_overrides);

  let result = simulate_retirement(
    &config,
    &monthly_returns,
    &normalized_actual_overrides,
    &normalized_inflation_overrides,
    SimulateOptions { include_rows: true },
    None,
  );

  let result_json = serde_json::to_string(&result)
    .map_err(|error| Error::from_reason(format!("Failed to serialize result JSON: {error}")))?;
  Ok(NativeSinglePathResponse { result_json })
}

#[napi]
pub fn run_reforecast_json(request: NativeReforecastRequest) -> Result<NativeReforecastResponse> {
  let config: SimulationConfig = serde_json::from_str(&request.config_json)
    .map_err(|error| Error::from_reason(format!("Invalid configJson: {error}")))?;
  let actual_overrides =
    parse_actual_overrides_json(request.actual_overrides_by_month_json, "actualOverridesByMonthJson")?;

  let deterministic_returns = generate_deterministic_monthly_returns(&config);
  let normalized_actual_overrides = normalize_overrides(actual_overrides);
  let normalized_inflation_overrides: HashMap<i32, f64> = HashMap::new();

  let result = simulate_retirement(
    &config,
    &deterministic_returns,
    &normalized_actual_overrides,
    &normalized_inflation_overrides,
    SimulateOptions { include_rows: true },
    None,
  );

  let result_json = serde_json::to_string(&result)
    .map_err(|error| Error::from_reason(format!("Failed to serialize result JSON: {error}")))?;
  Ok(NativeReforecastResponse { result_json })
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn js_rounding_matches_expected_examples() {
    assert_eq!(round_to_cents(10.49), 10.0);
    assert_eq!(round_to_cents(10.5), 11.0);
    assert_eq!(round_to_cents(-1.5), -1.0);
  }

  #[test]
  fn quantile_handles_interpolation() {
    let values = vec![10.0, 20.0, 30.0, 40.0];
    assert_eq!(quantile(&values, 0.0), 10.0);
    assert_eq!(quantile(&values, 0.5), 25.0);
    assert_eq!(quantile(&values, 1.0), 40.0);
  }

  #[test]
  fn mulberry32_is_deterministic() {
    let mut left = Mulberry32::new(42);
    let mut right = Mulberry32::new(42);
    for _ in 0..10 {
      assert_eq!(left.next_f64(), right.next_f64());
    }
  }

  #[test]
  fn simulate_retirement_supports_absolute_date_config() {
    let config = SimulationConfig {
      simulation_mode: "manual".to_string(),
      returns_source: Some("manual".to_string()),
      simulation_runs: Some(1_000),
      selected_historical_era: "fullHistory".to_string(),
      custom_historical_range: None,
      block_bootstrap_enabled: false,
      block_bootstrap_length: 12,
      core_params: CoreParams {
        birth_date: EventDate {
          month: 1,
          year: 1970,
        },
        portfolio_start: EventDate {
          month: 1,
          year: 2030,
        },
        portfolio_end: EventDate {
          month: 1,
          year: 2040,
        },
        inflation_rate: 0.03,
      },
      portfolio: AssetBalances {
        stocks: 60_000_000.0,
        bonds: 30_000_000.0,
        cash: 10_000_000.0,
      },
      return_assumptions: ReturnAssumptions {
        stocks: ReturnAssumption {
          expected_return: 0.08,
          std_dev: 0.15,
        },
        bonds: ReturnAssumption {
          expected_return: 0.04,
          std_dev: 0.07,
        },
        cash: ReturnAssumption {
          expected_return: 0.02,
          std_dev: 0.01,
        },
      },
      spending_phases: vec![SpendingPhase {
        id: "phase-1".to_string(),
        name: "Base".to_string(),
        start: EventDate {
          month: 1,
          year: 2030,
        },
        end: EventDate {
          month: 1,
          year: 2070,
        },
        min_monthly_spend: Some(200_000.0),
        max_monthly_spend: Some(1_500_000.0),
      }],
      withdrawal_strategy: WithdrawalStrategy::ConstantDollar(ConstantDollarParams {
        initial_withdrawal_rate: 0.04,
      }),
      drawdown_strategy: DrawdownStrategy::Bucket {
        bucket_order: vec![AssetClass::Cash, AssetClass::Bonds, AssetClass::Stocks],
      },
      income_events: Vec::new(),
      expense_events: Vec::new(),
    };

    let monthly_returns = vec![
      MonthlyReturns {
        stocks: 0.0,
        bonds: 0.0,
        cash: 0.0,
      };
      120
    ];

    let result = simulate_retirement(
      &config,
      &monthly_returns,
      &HashMap::new(),
      &HashMap::new(),
      SimulateOptions { include_rows: true },
      None,
    );

    assert_eq!(result.rows.len(), 120);
  }

  #[test]
  fn run_single_path_json_accepts_absolute_date_payload() {
    let request = NativeSinglePathRequest {
      config_json: r#"{
        "mode":"planning",
        "simulationMode":"manual",
        "returnsSource":"manual",
        "simulationRuns":1000,
        "selectedHistoricalEra":"fullHistory",
        "customHistoricalRange":null,
        "blockBootstrapEnabled":false,
        "blockBootstrapLength":12,
        "coreParams":{
          "birthDate":{"month":1,"year":1970},
          "portfolioStart":{"month":1,"year":2030},
          "portfolioEnd":{"month":1,"year":2040},
          "inflationRate":0.03
        },
        "portfolio":{"stocks":60000000,"bonds":30000000,"cash":10000000},
        "returnAssumptions":{
          "stocks":{"expectedReturn":0.08,"stdDev":0.15},
          "bonds":{"expectedReturn":0.04,"stdDev":0.07},
          "cash":{"expectedReturn":0.02,"stdDev":0.01}
        },
        "spendingPhases":[
          {
            "id":"phase-1",
            "name":"Base",
            "start":{"month":1,"year":2030},
            "end":{"month":1,"year":2070},
            "minMonthlySpend":200000,
            "maxMonthlySpend":1500000
          }
        ],
        "withdrawalStrategy":{"type":"constantDollar","params":{"initialWithdrawalRate":0.04}},
        "drawdownStrategy":{"type":"bucket","bucketOrder":["cash","bonds","stocks"]},
        "incomeEvents":[],
        "expenseEvents":[]
      }"#
      .to_string(),
      monthly_returns_json: serde_json::to_string(&vec![
        MonthlyReturns {
          stocks: 0.0,
          bonds: 0.0,
          cash: 0.0,
        };
        120
      ])
      .expect("serialize returns"),
      actual_overrides_by_month_json: Some("{}".to_string()),
      inflation_overrides_by_year_json: Some("{}".to_string()),
    };

    let response = run_single_path_json(request).expect("run single path");
    assert!(!response.result_json.is_empty());
  }

  #[test]
  fn run_single_path_json_starts_withdrawals_when_no_bounds_phase_begins_mid_year() {
    let request = NativeSinglePathRequest {
      config_json: r#"{
        "mode":"planning",
        "simulationMode":"manual",
        "returnsSource":"manual",
        "simulationRuns":1000,
        "selectedHistoricalEra":"fullHistory",
        "customHistoricalRange":null,
        "blockBootstrapEnabled":false,
        "blockBootstrapLength":12,
        "coreParams":{
          "birthDate":{"month":1,"year":1970},
          "portfolioStart":{"month":1,"year":2030},
          "portfolioEnd":{"month":1,"year":2040},
          "inflationRate":0.03
        },
        "portfolio":{"stocks":60000000,"bonds":30000000,"cash":10000000},
        "returnAssumptions":{
          "stocks":{"expectedReturn":0.0,"stdDev":0.0},
          "bonds":{"expectedReturn":0.0,"stdDev":0.0},
          "cash":{"expectedReturn":0.0,"stdDev":0.0}
        },
        "spendingPhases":[
          {
            "id":"phase-1",
            "name":"Delayed No Bounds",
            "start":{"month":6,"year":2034},
            "end":{"month":1,"year":2040}
          }
        ],
        "withdrawalStrategy":{"type":"constantDollar","params":{"initialWithdrawalRate":0.04}},
        "drawdownStrategy":{"type":"bucket","bucketOrder":["cash","bonds","stocks"]},
        "incomeEvents":[],
        "expenseEvents":[]
      }"#
      .to_string(),
      monthly_returns_json: serde_json::to_string(&vec![
        MonthlyReturns {
          stocks: 0.0,
          bonds: 0.0,
          cash: 0.0,
        };
        120
      ])
      .expect("serialize returns"),
      actual_overrides_by_month_json: Some("{}".to_string()),
      inflation_overrides_by_year_json: Some("{}".to_string()),
    };

    let response = run_single_path_json(request).expect("run single path");
    let parsed: Value = serde_json::from_str(&response.result_json).expect("parse result");
    let rows = parsed["rows"].as_array().expect("rows array");

    let month_before_start = rows[52]["withdrawals"]["requested"]
      .as_f64()
      .expect("month before start requested");
    let phase_start_month = rows[53]["withdrawals"]["requested"]
      .as_f64()
      .expect("phase start month requested");

    assert_eq!(month_before_start, 0.0);
    assert!(phase_start_month > 0.0);
  }
}
