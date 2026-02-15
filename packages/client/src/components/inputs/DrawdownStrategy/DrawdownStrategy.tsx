import { DrawdownStrategyType } from '@finapp/shared';

import { SegmentedToggle } from '../../shared/SegmentedToggle';
import { useAppStore } from '../../../store/useAppStore';
import { BucketConfig } from './BucketConfig';
import { RebalancingConfig } from './RebalancingConfig';

export const DrawdownStrategySection = () => {
  const drawdownStrategy = useAppStore((state) => state.drawdownStrategy);
  const setDrawdownType = useAppStore((state) => state.setDrawdownType);

  return (
    <div className="space-y-3">
      <SegmentedToggle
        value={drawdownStrategy.type}
        onChange={setDrawdownType}
        options={[
          { label: 'Bucket', value: DrawdownStrategyType.Bucket },
          { label: 'Rebalancing', value: DrawdownStrategyType.Rebalancing },
        ]}
      />

      {drawdownStrategy.type === DrawdownStrategyType.Bucket ? (
        <BucketConfig />
      ) : (
        <RebalancingConfig />
      )}
    </div>
  );
};
