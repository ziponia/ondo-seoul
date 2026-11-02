import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { m } from "../../i18n";
import { pickupLocationsQuery } from "../../lib/checkout";

/**
 * 받는 방법 — 택배 배송과 매장 픽업 가운데 고른다. 매장마다 픽업 가능 여부(`purchasable`)는
 * 첫 상품·옵션 기준으로 API가 정한다. 고르면 같은 장바구니 줄로 주문서를 다시 만든다(호출부).
 */
export function PickupDialog({
  basis,
  current,
  pending,
  onClose,
  onConfirm,
}: {
  basis: { productId: string; optionId: string | null; label: string };
  /** 지금 주문서의 픽업 장소 — 택배면 null */
  current: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (pickupLocationId: string | null) => void;
}) {
  const [method, setMethod] = useState<"CARRIER" | "PICKUP">("PICKUP");
  const locations = useQuery(
    pickupLocationsQuery({ productId: basis.productId, optionId: basis.optionId ?? undefined }),
  ).data;
  const firstOpen = locations?.find((l) => l.purchasable !== false)?.locationId ?? null;
  const [picked, setPicked] = useState<string | null>(current);
  const chosen = picked ?? firstOpen;
  const chosenLocation = locations?.find((l) => l.locationId === chosen);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 md:items-center md:p-6">
      <button
        type="button"
        aria-label={m.co_close()}
        onClick={onClose}
        className="absolute inset-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-h"
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto bg-page md:max-w-[480px]"
      >
        <div className="flex items-center justify-between border-line border-b px-6 py-5">
          <h2 id="pickup-h" className="font-black text-xl tracking-[-0.03em]">
            {m.co_receive()}
          </h2>
          <button
            type="button"
            aria-label={m.co_close()}
            onClick={onClose}
            className="-mr-2.5 grid h-11 w-11 place-items-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="grid grid-cols-2 border border-ink">
            {(["CARRIER", "PICKUP"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={method === value}
                onClick={() => setMethod(value)}
                className={`h-13 font-bold text-body-lg ${method === value ? "bg-ink text-page" : ""}`}
              >
                {value === "CARRIER" ? m.co_method_carrier() : m.co_method_pickup()}
              </button>
            ))}
          </div>
          {method === "CARRIER" ? (
            <p className="py-6 text-center text-body text-sub">{m.co_carrier_note()}</p>
          ) : (
            <>
              <p className="text-body text-sub">
                <b className="text-ink">{m.co_pickup_choose()}</b> ·{" "}
                {m.co_pickup_basis({ name: basis.label })}
              </p>
              <div className="flex flex-col gap-2.5">
                {(locations ?? []).map((location) => {
                  const open = location.purchasable !== false;
                  const selected = open && location.locationId === chosen;
                  return (
                    <button
                      key={location.locationId}
                      type="button"
                      aria-pressed={selected}
                      disabled={!open}
                      onClick={() => setPicked(location.locationId)}
                      className={`flex gap-3.5 px-5 py-4 text-left ${
                        selected ? "border-2 border-ink" : "border border-line"
                      } ${open ? "" : "bg-surface text-faint"}`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                          selected ? "border-ink" : "border-line-strong"
                        }`}
                      >
                        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-ink" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center justify-between gap-2">
                          <b className="text-body-lg">{location.name}</b>
                          {location.purchasable === undefined ? null : (
                            <span
                              className={`shrink-0 font-bold text-meta ${open ? "text-ink" : "text-point"}`}
                            >
                              {open ? m.co_pickup_ok() : m.co_pickup_no_stock()}
                            </span>
                          )}
                        </span>
                        <span className={`text-body ${open ? "text-sub" : ""}`}>
                          {location.address}
                        </span>
                        <span className={`text-body ${open ? "text-muted" : ""}`}>
                          {[location.hours, location.phone].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <button
            type="button"
            disabled={pending || (method === "PICKUP" && !chosenLocation)}
            onClick={() =>
              onConfirm(method === "PICKUP" ? (chosenLocation?.locationId ?? null) : null)
            }
            className="mt-2 h-14 bg-ink font-bold text-base text-page disabled:bg-disabled"
          >
            {method === "PICKUP" && chosenLocation
              ? m.co_pickup_cta({ name: chosenLocation.name })
              : m.co_carrier_cta()}
          </button>
        </div>
      </section>
    </div>
  );
}
