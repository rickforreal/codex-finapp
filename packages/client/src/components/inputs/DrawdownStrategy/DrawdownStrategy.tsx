import { DrawdownStrategyType } from '@finapp/shared';

import { SegmentedToggle } from '../../shared/SegmentedToggle';
import { useAppStore, useCompareFamilyLockUiState } from '../../../store/useAppStore';
import { BucketConfig } from './BucketConfig';
import { RebalancingConfig } from './RebalancingConfig';

export const DrawdownStrategySection = () => {
  const drawdownStrategy = useAppStore((state) => state.drawdownStrategy);
  const setDrawdownType = useAppStore((state) => state.setDrawdownType);
  const lockState = useCompareFamilyLockUiState('drawdownStrategy');

  return (
    <fieldset className="space-y-3" disabled={lockState.readOnly}>
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
    </fieldset>
  );
};
