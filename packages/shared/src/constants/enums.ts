export enum AssetClass {
  Stocks = 'stocks',
  Bonds = 'bonds',
  Cash = 'cash',
}

export enum WithdrawalStrategyType {
  ConstantDollar = 'constantDollar',
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
