import { useEffect, useRef } from 'react';

type CellEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

export const CellEditor = ({ value, onChange, onCommit, onKeyDown }: CellEditorProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        // Stop propagation so cell-level key handler doesn't fire
        event.stopPropagation();
        onKeyDown(event);
      }}
      className="h-7 w-[110px] rounded border px-2 text-xs"
      style={{
        borderColor: 'var(--theme-state-selected-cell-outline)',
        backgroundColor: 'var(--theme-color-surface-primary)',
        color: 'var(--theme-color-text-primary)',
      }}
    />
  );
};
