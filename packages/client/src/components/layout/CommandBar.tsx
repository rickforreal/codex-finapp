export const CommandBar = () => {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-border bg-white/95 px-5 py-3 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-brand-border bg-brand-surface p-1">
          <button className="rounded-full bg-brand-navy px-4 py-1.5 text-sm font-medium text-white">
            Planning
          </button>
          <button className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-600">Tracking</button>
        </div>

        <div className="rounded-full border border-brand-border bg-white p-1">
          <button className="rounded-full bg-slate-700 px-3 py-1 text-sm font-medium text-white">Manual</button>
          <button className="rounded-full px-3 py-1 text-sm font-medium text-slate-600">Monte Carlo</button>
        </div>

        <button className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white">Run Simulation</button>
      </div>
    </header>
  );
};
