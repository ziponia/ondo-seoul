import { Minus, Plus } from "lucide-react";
import { m } from "../i18n";

/** 수량 − n + — 1부터 999까지 */
export function QuantityStepper({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center border border-line-strong bg-page">
      <button
        type="button"
        aria-label={m.pd_qty_dec()}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        className="grid h-9 w-9 place-items-center disabled:text-disabled"
      >
        <Minus size={14} aria-hidden />
      </button>
      <span aria-live="polite" className="tabular w-8 text-center font-bold text-body">
        {value}
      </span>
      <button
        type="button"
        aria-label={m.pd_qty_inc()}
        disabled={disabled || value >= 999}
        onClick={() => onChange(value + 1)}
        className="grid h-9 w-9 place-items-center disabled:text-disabled"
      >
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}
