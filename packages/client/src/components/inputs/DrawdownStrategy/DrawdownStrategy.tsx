import { DrawdownStrategyType } from '@finapp/shared';

import { SegmentedToggle } from '../../shared/SegmentedToggle';
import { useAppStore } from '../../../store/useAppStore';
import { BucketConfig } from './BucketConfig';

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
        <p className="text-xs text-slate-500">Rebalancing controls are deferred to Phase 7.</p>
      )}
    </div>
  );
};
