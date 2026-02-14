import { AssetClass, SimulationMode, WithdrawalStrategyType } from '../constants/enums';

export interface SimulationConfig {
  mode: SimulationMode;
  retirementDurationYears: number;
  inflationRate: number;
  portfolio: Record<AssetClass, number>;
  withdrawalStrategy: {
    type: WithdrawalStrategyType;
  };
}

export interface SimulationResult {
  status: 'ok';
  message: string;
}
