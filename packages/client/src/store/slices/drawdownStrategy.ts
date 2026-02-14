export const drawdownStrategyInitialState = {
  type: 'bucket' as const,
  bucketOrder: ['cash', 'bonds', 'stocks'],
  rebalancing: {
    targetAllocation: { stocks: 0.6, bonds: 0.3, cash: 0.1 },
    glidePathEnabled: false,
    glidePath: [],
  },
};
