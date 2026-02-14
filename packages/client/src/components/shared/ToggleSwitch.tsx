type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export const ToggleSwitch = ({ checked, onChange, label }: Props) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-navy' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
    {label ? <span>{label}</span> : null}
  </label>
);
