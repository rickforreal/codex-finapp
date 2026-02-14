import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
};

export const CollapsibleSection = ({ id, title, collapsed, onToggle, children }: Props) => (
  <section className="rounded-lg border border-brand-border bg-white">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between px-3 py-2 text-left"
    >
      <span className="text-sm font-semibold text-brand-navy">{title}</span>
      <span className={`text-sm text-slate-500 transition ${collapsed ? '-rotate-90' : ''}`}>⌄</span>
    </button>
    <div className={`overflow-hidden transition-all ${collapsed ? 'max-h-0' : 'max-h-[1000px]'}`}>
      <div className="space-y-3 border-t border-brand-border px-3 py-3">{children}</div>
    </div>
  </section>
);
