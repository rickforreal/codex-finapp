import { CommandBar } from './CommandBar';

export const AppShell = () => {
  return (
    <div className="min-h-screen bg-[#F2F5FB] text-slate-900">
      <CommandBar />
      <main className="flex min-h-[calc(100vh-65px)]">
        <aside className="w-[360px] border-r border-brand-border bg-brand-panel p-4">
          <div className="rounded-lg border border-dashed border-brand-border bg-white/70 p-4 text-sm text-slate-600">
            Sidebar placeholder
          </div>
        </aside>

        <section className="flex-1 p-6">
          <div className="h-full min-h-[400px] rounded-xl border border-brand-border bg-white p-8 shadow-panel">
            <p className="mb-2 font-medium text-brand-navy">Output area placeholder</p>
            <p className="text-sm text-slate-500">
              Configure your parameters and click Run Simulation to generate a projection.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
