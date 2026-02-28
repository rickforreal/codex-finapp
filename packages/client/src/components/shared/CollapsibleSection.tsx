import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  headerAction?: ReactNode;
  children: ReactNode;
};

export const CollapsibleSection = ({ id, title, collapsed, onToggle, headerAction, children }: Props) => (
  <MeasuredCollapsibleSection id={id} title={title} collapsed={collapsed} onToggle={onToggle} headerAction={headerAction}>
    {children}
  </MeasuredCollapsibleSection>
);

const MeasuredCollapsibleSection = ({ id, title, collapsed, onToggle, headerAction, children }: Props) => {
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
    <section className="theme-section-card rounded-lg border">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="theme-section-title text-sm font-semibold">{title}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {headerAction ? <div>{headerAction}</div> : null}
          <button
            type="button"
            onClick={() => onToggle(id)}
            className="theme-section-icon inline-flex h-7 w-7 items-center justify-center text-sm transition"
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            <span className={`transition ${collapsed ? '-rotate-90' : ''}`}>⌄</span>
          </button>
        </div>
      </div>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: collapsed ? 0 : `${expandedHeight}px` }}
      >
        <div ref={contentRef} className="theme-section-divider space-y-3 border-t px-3 py-3">
          {children}
        </div>
      </div>
    </section>
  );
};
