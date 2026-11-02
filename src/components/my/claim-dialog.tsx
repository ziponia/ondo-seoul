import type { ClaimReason, MyOrderItem } from "@sayren/storefront-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";
import { formatMoney } from "../../lib/format";
import { createClaim, previewClaim } from "../../lib/my";

const REASONS: ClaimReason[] = [
  "CHANGE_OF_MIND",
  "WRONG_ORDER",
  "DEFECTIVE",
  "DIFFERENT_FROM_PAGE",
  "WRONG_DELIVERY",
  "DELAY",
];

type ClaimType = "RETURN" | "EXCHANGE" | "CANCEL";

/**
 * 취소·교환·반품 신청 — 고를 수 있는 유형은 응답의 `step.claimable`이다. 예상 환불액·배송비는
 * 고른 값으로 `myClaims.preview`를 불러 그대로 보인다(화면에서 계산하지 않는다).
 */
export function ClaimDialog({
  item,
  mode,
  onClose,
}: {
  item: MyOrderItem;
  mode: "claim" | "cancel";
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const claimable = item.step?.claimable ?? [];
  const types: ClaimType[] =
    mode === "cancel"
      ? ["CANCEL"]
      : [
          ...(claimable.some((c) => c.action === "RETURN_REQUEST") ? (["RETURN"] as const) : []),
          ...(claimable.some((c) => c.action === "EXCHANGE_REQUEST")
            ? (["EXCHANGE"] as const)
            : []),
        ];
  const until = claimable.find((c) => c.until)?.until;
  const [type, setType] = useState<ClaimType>(types[0] ?? "RETURN");
  const [reason, setReason] = useState<ClaimReason>(
    mode === "cancel" ? "WRONG_ORDER" : "DEFECTIVE",
  );
  const [detail, setDetail] = useState("");
  const input = { orderItemId: item.orderItemId, type, reason };
  const preview = useQuery({
    queryKey: ["my", "claim-preview", input],
    queryFn: () => previewClaim({ data: input }),
  }).data;
  const submit = useMutation({
    mutationFn: () =>
      createClaim({
        data: { ...input, ...(detail.trim() ? { reasonDetail: detail.trim() } : {}) },
      }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries({ queryKey: ["my"] });
    },
  });
  const done = submit.data?.ok === true;
  const quote = preview?.ok ? preview.data : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 md:items-center md:p-6">
      <button
        type="button"
        aria-label={m.claim_close()}
        onClick={onClose}
        className="absolute inset-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-h"
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto bg-page md:max-w-[520px]"
      >
        <div className="flex items-center justify-between border-line border-b px-6 py-5">
          <h2 id="claim-h" className="font-black text-xl tracking-[-0.03em]">
            {mode === "cancel" ? m.claim_title_cancel() : m.claim_title_claim()}
          </h2>
          <button
            type="button"
            aria-label={m.claim_close()}
            onClick={onClose}
            className="-mr-2.5 grid h-11 w-11 place-items-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {done ? (
          <div className="flex flex-col gap-5 px-6 py-8">
            <p role="status" className="text-body-lg">
              {type === "CANCEL" ? m.claim_cancel_done() : m.claim_done()}
            </p>
            <button type="button" onClick={onClose} className="h-13 bg-ink font-bold text-page">
              {m.claim_close()}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit.mutate();
            }}
            className="flex flex-col gap-5 px-6 py-6"
          >
            <p className="text-body">
              <b>{item.productName}</b>
              <span className="text-muted">
                {" "}
                · {item.optionName ? `${item.optionName} · ` : ""}
                {m.co_qty({ count: item.quantity })}
              </span>
            </p>
            {types.length > 1 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-bold text-meta">{m.claim_type()}</legend>
                <div className="grid grid-cols-2 border border-ink">
                  {types.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={type === value}
                      onClick={() => setType(value)}
                      className={`h-12 font-bold text-body-lg ${type === value ? "bg-ink text-page" : ""}`}
                    >
                      {m[`claim_type_${value}`]()}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <label className="flex flex-col gap-2 font-bold text-meta">
              {m.claim_reason()}
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as ClaimReason)}
                className="h-11 border border-line-strong bg-page px-3.5 font-normal text-body-lg"
              >
                {REASONS.map((value) => (
                  <option key={value} value={value}>
                    {m[`claim_reason_${value}`]()}
                  </option>
                ))}
              </select>
            </label>
            {mode === "claim" ? (
              <label className="flex flex-col gap-2 font-bold text-meta">
                {m.claim_detail()}
                <textarea
                  value={detail}
                  maxLength={1000}
                  rows={4}
                  placeholder={m.claim_detail_placeholder()}
                  onChange={(event) => setDetail(event.target.value)}
                  className="border border-line-strong p-3.5 font-normal text-body-lg"
                />
              </label>
            ) : null}
            <dl className="flex flex-col gap-2 bg-surface px-4 py-3.5 text-body">
              {quote?.expectedRefundAmount === null ? (
                <p className="text-sub">{m.claim_refund_none()}</p>
              ) : (
                <div className="flex justify-between">
                  <dt className="text-sub">{m.claim_refund()}</dt>
                  <dd className="font-bold">
                    {quote ? formatMoney(quote.expectedRefundAmount ?? 0) : "…"}
                  </dd>
                </div>
              )}
              {quote?.claimDeliveryFee ? (
                <div className="flex justify-between">
                  <dt className="text-sub">{m.claim_fee()}</dt>
                  <dd>{formatMoney(quote.claimDeliveryFee)}</dd>
                </div>
              ) : null}
            </dl>
            {until && mode === "claim" ? (
              <p className="text-meta text-muted">{m.claim_until({ date: formatDate(until) })}</p>
            ) : null}
            {submit.data && !submit.data.ok ? (
              <p role="alert" className="text-meta text-point">
                {submit.data.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submit.isPending}
              className="h-14 bg-ink font-bold text-base text-page disabled:bg-disabled"
            >
              {mode === "cancel" ? m.claim_submit_cancel() : m.claim_submit_claim()}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
