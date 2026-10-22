import { cn } from "../../lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  id?: string;
}

export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[25px] w-[43px] shrink-0 rounded-full transition",
        checked ? "bg-forest" : "bg-[#c7d6ca]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1 h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-[18px]",
        )}
      />
    </button>
  );
}
