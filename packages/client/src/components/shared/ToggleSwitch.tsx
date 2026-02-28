type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export const ToggleSwitch = ({ checked, onChange, label, disabled = false }: Props) => (
  <label className={`inline-flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-navy' : 'bg-slate-300'} disabled:cursor-not-allowed`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
    {label ? <span>{label}</span> : null}
  </label>
);
