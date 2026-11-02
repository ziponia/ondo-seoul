import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { m } from "../../i18n";
import { formatMoney } from "../../lib/format";

export interface FilterValue {
  minPrice?: number;
  maxPrice?: number;
  freeShipping?: boolean;
}

export interface CategoryFacet {
  categoryId: string;
  name: string;
  count?: number;
}

/** 원화 가격대 — 화면이 정하는 구간이다(서버는 minPrice·maxPrice만 받는다) */
const KRW_BANDS: { min?: number; max?: number }[] = [
  { max: 50000 },
  { min: 50000, max: 150000 },
  { min: 150000, max: 300000 },
  { min: 300000 },
];

/** 5만원·15만원처럼 만 원 단위로 끊어 읽는다(만 단위가 아니면 원 단위) */
function short(amount: number): string {
  return amount % 10000 === 0 ? m.money_man({ count: amount / 10000 }) : formatMoney(amount);
}

export function priceLabel(min?: number, max?: number): string {
  if (min === undefined && max !== undefined) return m.list_price_under({ amount: short(max) });
  if (max === undefined && min !== undefined) return m.list_price_over({ amount: short(min) });
  return m.list_price_range({ from: short(min ?? 0), to: short(max ?? 0) });
}

function isBand(value: FilterValue, band: { min?: number; max?: number }) {
  return value.minPrice === band.min && value.maxPrice === band.max;
}

/** 넓은 목록의 가격 select — 구간만 고른다 */
export function PriceSelect({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const index = KRW_BANDS.findIndex((band) => isBand(value, band));
  return (
    <label className="flex items-center gap-2 text-meta">
      {m.list_filter_price()}
      <select
        value={index}
        onChange={(event) => {
          const band = KRW_BANDS[Number(event.target.value)];
          onChange({ ...value, minPrice: band?.min, maxPrice: band?.max });
        }}
        className="h-9 border border-line-strong bg-page px-2 text-meta"
      >
        <option value={-1}>{m.list_price_all()}</option>
        {KRW_BANDS.map((band, i) => (
          <option key={priceLabel(band.min, band.max)} value={i}>
            {priceLabel(band.min, band.max)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 가격 — 구간 고르기와 직접 입력 */
function PriceOptions({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 font-bold text-body-lg">{m.list_filter_price()}</legend>
      {KRW_BANDS.map((band) => (
        <label key={priceLabel(band.min, band.max)} className="flex items-center gap-2 text-body">
          <input
            type="radio"
            name="price-band"
            checked={isBand(value, band)}
            onChange={() => onChange({ ...value, minPrice: band.min, maxPrice: band.max })}
            className="h-4 w-4 accent-ink"
          />
          {priceLabel(band.min, band.max)}
        </label>
      ))}
      <form
        key={`${value.minPrice}-${value.maxPrice}`}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const read = (key: string) => {
            const raw = String(data.get(key) ?? "").replaceAll(",", "");
            return raw === "" ? undefined : Math.max(0, Math.floor(Number(raw))) || undefined;
          };
          onChange({ ...value, minPrice: read("min"), maxPrice: read("max") });
        }}
        className="mt-1 flex items-center gap-1.5"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{m.list_price_min()}</span>
          <input
            name="min"
            inputMode="numeric"
            defaultValue={value.minPrice?.toLocaleString("ko-KR") ?? ""}
            placeholder={m.list_price_min()}
            className="h-10 w-full border border-line-strong px-2 text-caption"
          />
        </label>
        <span aria-hidden>–</span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{m.list_price_max()}</span>
          <input
            name="max"
            inputMode="numeric"
            defaultValue={value.maxPrice?.toLocaleString("ko-KR") ?? ""}
            placeholder={m.list_price_max()}
            className="h-10 w-full border border-line-strong px-2 text-caption"
          />
        </label>
        <button type="submit" className="h-10 shrink-0 bg-ink px-3 font-bold text-meta text-page">
          {m.list_filter_apply_short()}
        </button>
      </form>
    </fieldset>
  );
}

function FreeShipping({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-body">
      <input
        type="checkbox"
        checked={value.freeShipping === true}
        onChange={() => onChange({ ...value, freeShipping: value.freeShipping ? undefined : true })}
        className="h-4 w-4 accent-ink"
      />
      {m.list_filter_free_shipping()}
    </label>
  );
}

/**
 * 데스크톱 왼쪽 필터 칸 — 가격, 카테고리(상품 수), 무료배송. 가격 구간은 원화 상점에서만 보인다.
 * 카테고리는 SDK 검색이 하나만 받으므로 링크 목록이다.
 */
export function FilterSidebar({
  value,
  onChange,
  showPrice,
  categories,
  categoryHref,
  currentCategoryId,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  showPrice: boolean;
  categories: CategoryFacet[];
  categoryHref: (categoryId: string) => React.ReactNode;
  currentCategoryId?: string;
}) {
  return (
    <aside aria-label={m.list_filter()} className="hidden flex-col gap-6 lg:flex">
      {showPrice ? <PriceOptions value={value} onChange={onChange} /> : null}
      {categories.length > 0 ? (
        <div className="flex flex-col gap-2.5 border-line border-t pt-6">
          <h2 className="font-bold text-body-lg">{m.search_categories()}</h2>
          {categories.map((category) => (
            <div
              key={category.categoryId}
              className={`flex justify-between text-body ${
                category.categoryId === currentCategoryId ? "font-bold" : ""
              }`}
            >
              {categoryHref(category.categoryId)}
              {category.count !== undefined ? (
                <span className="text-muted">{category.count}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="border-line border-t pt-6">
        <FreeShipping value={value} onChange={onChange} />
      </div>
    </aside>
  );
}

/** 모바일 필터 — 버튼을 누르면 바텀시트(가격·무료배송) */
export function FilterSheetButton({
  value,
  onChange,
  showPrice,
  resultCount,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  showPrice: boolean;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const count =
    (value.minPrice !== undefined || value.maxPrice !== undefined ? 1 : 0) +
    (value.freeShipping ? 1 : 0);
  const active = count > 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-9 items-center gap-1.5 px-3 font-bold text-meta lg:hidden ${
          active ? "bg-ink text-page" : "border border-line-strong"
        }`}
      >
        <SlidersHorizontal size={16} aria-hidden />
        {m.list_filter()}
        {active ? <span className="tabular">{count}</span> : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/55 lg:hidden">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-h"
            className="w-full bg-page pb-4"
          >
            <div className="flex items-center justify-between border-line border-b px-4 py-3">
              <h2 id="filter-h" className="font-black text-lg">
                {m.list_filter()}
              </h2>
              <button
                type="button"
                aria-label={m.list_filter_close()}
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 place-items-center"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-6 px-4 py-5">
              {showPrice ? <PriceOptions value={value} onChange={onChange} /> : null}
              <FreeShipping value={value} onChange={onChange} />
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-2 px-4">
              <button
                type="button"
                onClick={() => onChange({})}
                className="h-13 border border-ink font-bold text-body-lg"
              >
                {m.list_filter_reset()}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-13 bg-ink font-bold text-body-lg text-page"
              >
                {m.list_filter_apply({ count: resultCount.toLocaleString("ko-KR") })}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
