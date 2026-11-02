import { optionChoicesOf, type ProductDetail } from "@sayren/storefront-sdk";
import { m } from "../../i18n";
import { formatMoney } from "../../lib/format";

/**
 * 조합 옵션 — 값의 상태(품절·이어지는 조합 없음)와 추가금은 `optionChoicesOf`가 정한다.
 * 품절 값은 고를 수 없고 글자로도 「품절」을 알린다.
 */
export function OptionPicker({
  product,
  chosen,
  onChange,
}: {
  product: ProductDetail;
  chosen: (string | null)[];
  onChange: (next: (string | null)[]) => void;
}) {
  const { groups } = optionChoicesOf(product, chosen);
  return (
    <>
      {groups.map((group, g) => {
        const selected = group.values.find((value) => value.selected);
        return (
          <fieldset key={group.groupId} className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 font-bold text-body">
              {group.name}
              {selected ? <span className="ml-2 font-normal text-sub">{selected.name}</span> : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const blocked = value.state !== "AVAILABLE";
                return (
                  <button
                    key={value.valueId}
                    type="button"
                    aria-pressed={value.selected}
                    disabled={blocked}
                    onClick={() => {
                      const next = [...chosen];
                      next[g] = value.selected ? null : value.valueId;
                      onChange(next);
                    }}
                    className={`min-h-12 min-w-14 px-3.5 text-body ${
                      value.selected
                        ? "border-2 border-ink font-bold"
                        : blocked
                          ? "border border-line bg-chip text-faint line-through"
                          : "border border-line-strong"
                    }`}
                  >
                    {value.name}
                    {value.state === "SOLD_OUT" ? (
                      <span className="sr-only">{m.pd_option_soldout()}</span>
                    ) : null}
                    {value.additionalPrice ? (
                      <span className="ml-1 text-caption text-sub">
                        {m.pd_option_extra({
                          amount: formatMoney(value.additionalPrice, product.currency),
                        })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}
