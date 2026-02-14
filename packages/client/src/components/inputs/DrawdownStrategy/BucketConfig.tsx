import { useAppStore } from '../../../store/useAppStore';

export const BucketConfig = () => {
  const bucketOrder = useAppStore((state) => state.drawdownStrategy.bucketOrder);
  const moveBucketAsset = useAppStore((state) => state.moveBucketAsset);

  return (
    <div className="space-y-2">
      {bucketOrder.map((asset, index) => (
        <div key={asset} className="flex items-center justify-between rounded border border-brand-border px-2 py-2">
          <span className="text-sm capitalize">{index + 1}. {asset}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => moveBucketAsset(asset, 'up')}
              className="rounded border border-brand-border px-2 text-xs"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveBucketAsset(asset, 'down')}
              className="rounded border border-brand-border px-2 text-xs"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
