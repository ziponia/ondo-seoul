import { m } from "../../i18n";

const LABELS = {
  manual: () => m.sort_manual(),
  recommend: () => m.sort_recommend(),
  latest: () => m.sort_latest(),
  priceAsc: () => m.sort_priceAsc(),
  priceDesc: () => m.sort_priceDesc(),
  reviewCount: () => m.sort_reviewCount(),
  ratingDesc: () => m.sort_ratingDesc(),
} as const;

export type SortValue = keyof typeof LABELS;

/** 정렬 — 데스크톱은 글자 버튼 줄, 모바일은 select. 값은 서버 정렬 그대로다 */
export function SortMenu<T extends SortValue>({
  options,
  value,
  onChange,
  mobile = "select",
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** 모바일 모양 — select(기본) 또는 가로로 미는 탭 */
  mobile?: "select" | "tabs";
}) {
  return (
    <>
      <div className="hidden flex-wrap gap-0.5 md:flex">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={`h-10 px-2.5 text-body ${option === value ? "font-bold text-ink" : "text-muted"}`}
          >
            {LABELS[option]()}
          </button>
        ))}
      </div>
      {mobile === "tabs" ? (
        <div className="-mx-4 flex overflow-x-auto border-line border-b px-4 md:hidden">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === value}
              onClick={() => onChange(option)}
              className={`h-11 shrink-0 px-2 text-body ${
                option === value ? "border-ink border-b-2 font-bold" : "text-sub"
              }`}
            >
              {LABELS[option]()}
            </button>
          ))}
        </div>
      ) : null}
      <label className={mobile === "tabs" ? "hidden" : "md:hidden"}>
        <span className="sr-only">{m.sort_label()}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-9 bg-transparent font-bold text-meta"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {LABELS[option]()}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
