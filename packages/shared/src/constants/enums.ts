export enum AssetClass {
  Stocks = 'stocks',
  Bonds = 'bonds',
  Cash = 'cash',
}

export enum WithdrawalStrategyType {
  ConstantDollar = 'constantDollar',
  PercentOfPortfolio = 'percentOfPortfolio',
  OneOverN = 'oneOverN',
  Vpw = 'vpw',
  DynamicSwr = 'dynamicSwr',
  SensibleWithdrawals = 'sensibleWithdrawals',
  NinetyFivePercent = 'ninetyFivePercent',
  GuytonKlinger = 'guytonKlinger',
  VanguardDynamic = 'vanguardDynamic',
  Endowment = 'endowment',
  HebelerAutopilot = 'hebelerAutopilot',
  CapeBased = 'capeBased',
}

export enum DrawdownStrategyType {
  Bucket = 'bucket',
  Rebalancing = 'rebalancing',
}

export enum SimulationMode {
  Manual = 'manual',
  MonteCarlo = 'monteCarlo',
}

export enum AppMode {
  Planning = 'planning',
  Tracking = 'tracking',
}
