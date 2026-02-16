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

export enum HistoricalEra {
  FullHistory = 'fullHistory',
  DepressionEra = 'depressionEra',
  PostWarBoom = 'postWarBoom',
  StagflationEra = 'stagflationEra',
  OilCrisis = 'oilCrisis',
  Post1980BullRun = 'post1980BullRun',
  LostDecade = 'lostDecade',
  PostGfcRecovery = 'postGfcRecovery',
}

export enum AppMode {
  Planning = 'planning',
  Tracking = 'tracking',
}

export enum ThemeId {
  Light = 'light',
  Dark = 'dark',
  HighContrast = 'highContrast',
}
