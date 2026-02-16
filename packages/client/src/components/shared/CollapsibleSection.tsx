import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
};

export const CollapsibleSection = ({ id, title, collapsed, onToggle, children }: Props) => (
  <MeasuredCollapsibleSection id={id} title={title} collapsed={collapsed} onToggle={onToggle}>
    {children}
  </MeasuredCollapsibleSection>
);

const MeasuredCollapsibleSection = ({ id, title, collapsed, onToggle, children }: Props) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expandedHeight, setExpandedHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!contentRef.current) {
        return;
      }
      setExpandedHeight(contentRef.current.scrollHeight);
    };

    measure();

    if (!contentRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(contentRef.current);

    return () => {
      observer.disconnect();
    };
  }, [children]);

  return (
    <section className="rounded-lg border border-brand-border bg-white">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-sm font-semibold text-brand-navy">{title}</span>
        <span className={`text-sm text-slate-500 transition ${collapsed ? '-rotate-90' : ''}`}>⌄</span>
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: collapsed ? 0 : `${expandedHeight}px` }}
      >
        <div ref={contentRef} className="space-y-3 border-t border-brand-border px-3 py-3">
          {children}
        </div>
      </div>
    </section>
  );
};
