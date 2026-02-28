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
  DynamicSwrAdaptive = 'dynamicSwrAdaptive',
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
  Monokai = 'monokai',
  Synthwave84 = 'synthwave84',
  StayTheCourse = 'stayTheCourse',
}

export enum ThemeFamilyId {
  Default = 'default',
  Monokai = 'monokai',
  Synthwave84 = 'synthwave84',
  StayTheCourse = 'stayTheCourse',
  HighContrast = 'highContrast',
}

export enum ThemeAppearance {
  Light = 'light',
  Dark = 'dark',
}

export enum ThemeVariantId {
  DefaultLight = 'default.light',
  DefaultDark = 'default.dark',
  MonokaiLight = 'monokai.light',
  MonokaiDark = 'monokai.dark',
  Synthwave84Light = 'synthwave84.light',
  Synthwave84Dark = 'synthwave84.dark',
  StayTheCourseLight = 'stayTheCourse.light',
  StayTheCourseDark = 'stayTheCourse.dark',
  HighContrastDark = 'highContrast.dark',
}
