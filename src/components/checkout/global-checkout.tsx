import {
  type AvailablePaymentOption,
  type CheckoutSession,
  internationalShippingAddressInputSchema,
  type Member,
  paymentOptionKey,
  paymentStartSchema,
} from "@sayren/storefront-sdk";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "../../hooks/use-catalog";
import { getLocale, m } from "../../i18n";
import { internationalQuoteQuery, startCheckoutPayment } from "../../lib/checkout";
import type { PublicConfig } from "../../lib/config";
import { formatMoney } from "../../lib/format";
import { savePayNote } from "../../lib/pay-note";
import { paymentsFor } from "../../lib/payments";
import { MobilePageHeader } from "../layout/mobile-page-header";

import { ProductImage } from "../product/product-image";
import { PaymentLogo } from "./payment-options";

/**
 * 해외 주문서 — 판매 권역이 해외인 주문서. 배송 국가는 권역의 국가에서 고르고, 배송비는 그 국가로
 * `checkout.quoteDelivery`를 불러 받는다. 주소 규칙은 SDK `internationalShippingAddressInputSchema`로 검사한다.
 * 쿠폰·적립금은 이 권역에서 쓰지 않는다(주문서 응답 `couponsEnabled`·`points`).
 */
export function GlobalCheckout({
  checkout,
  me,
  config,
}: {
  checkout: CheckoutSession;
  me: Member;
  config: PublicConfig;
}) {
  const store = useStore();
  const navigate = useNavigate();
  const market = store.markets.find((mk) => mk.marketId === store.market?.marketId);
  const countries = market?.countries.filter((c) => c !== "KR") ?? [];
  const regionName = new Intl.DisplayNames([getLocale()], { type: "region" });
  const [form, setForm] = useState({
    countryCode: countries[0] ?? "",
    receiverName: me.name,
    address1: "",
    address2: "",
    city: "",
    region: "",
    postalCode: "",
    phone: "",
  });
  const [optionKey, setOptionKey] = useState(
    checkout.paymentOptions[0] ? paymentOptionKey(checkout.paymentOptions[0]) : "",
  );
  const quote = useQuery({
    ...internationalQuoteQuery(checkout.checkoutId, form.countryCode),
    enabled: Boolean(form.countryCode),
  }).data;
  const amounts = quote?.amounts ?? checkout.amounts;
  const option = checkout.paymentOptions.find((o) => paymentOptionKey(o) === optionKey);
  const address = {
    countryCode: form.countryCode,
    receiverName: form.receiverName.trim(),
    phone: form.phone.replace(/[\s()-]/g, ""),
    city: form.city.trim(),
    address1: form.address1.trim(),
    ...(form.address2.trim() ? { address2: form.address2.trim() } : {}),
    ...(form.region.trim() ? { region: form.region.trim() } : {}),
    ...(form.postalCode.trim() ? { postalCode: form.postalCode.trim() } : {}),
  };
  const parsed = internationalShippingAddressInputSchema.safeParse(address);
  // 낼 금액이 0원이면 결제수단 없이 시작한다 — 결제 시작 응답이 `completed`라 결제창 없이 주문된다
  const paymentRequired = amounts.totalAmount > 0;
  const pay = useMutation({
    mutationFn: async () => {
      if (paymentRequired && !option) return { message: null };
      const chosen = paymentRequired && option ? requestOptionOf(option) : undefined;
      const result = await startCheckoutPayment({
        data: {
          checkoutId: checkout.checkoutId,
          ...(chosen ? { option: chosen } : {}),
          pickup: false,
          internationalAddress: address,
          coupons: [],
        },
      });
      if (!result.ok) return { message: result.message };
      const start = paymentStartSchema.parse(JSON.parse(result.start));
      savePayNote(start.paymentId, {
        label: chosen ? (option?.label ?? "") : "",
        amount: start.amounts.totalAmount,
        currency: checkout.currency,
      });
      const opened = await paymentsFor(config).open(start);
      if (opened.status === "COMPLETED") {
        await navigate({ to: "/checkout/complete/$orderId", params: { orderId: opened.orderId } });
        return { message: null };
      }
      return { message: opened.status === "PROCESSING" ? null : opened.message };
    },
  });
  const set =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: event.target.value });
  const field = "h-12 w-full border border-line-strong bg-page px-3.5 font-normal text-body-lg";
  const label = "flex flex-col gap-1.5 font-bold text-meta";
  const total = formatMoney(amounts.totalAmount, checkout.currency);
  const ready = parsed.success && (!paymentRequired || option !== undefined) && quote !== undefined;
  return (
    <div className="bg-surface pb-28 md:pb-24">
      <MobilePageHeader title={m.co_title()} icons={false} />
      <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] items-start gap-2 md:grid-cols-[minmax(0,1fr)_396px] md:gap-6 md:px-6 md:pt-8">
        <div className="flex flex-col gap-2 md:gap-4">
          <section className="flex items-center justify-between bg-page px-4 py-5 md:px-7">
            <h2 className="font-black text-lg tracking-[-0.03em] md:text-xl">{m.co_orderer()}</h2>
            {me.email ? (
              <span className="text-body text-sub">{m.co_signed_in({ email: me.email })}</span>
            ) : null}
          </section>
          <section className="flex flex-col gap-4 bg-page px-4 py-6 md:px-7">
            <h2 className="font-black text-lg tracking-[-0.03em] md:text-xl">{m.co_address()}</h2>
            <label className={label}>
              {m.co_country()}
              <select value={form.countryCode} onChange={set("countryCode")} className={field}>
                {countries.map((code) => (
                  <option key={code} value={code}>
                    {regionName.of(code) ?? code}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              {m.co_address_receiver()}
              <input
                required
                autoComplete="name"
                value={form.receiverName}
                onChange={set("receiverName")}
                className={field}
              />
            </label>
            <label className={label}>
              {m.co_address_1()}
              <input
                required
                autoComplete="address-line1"
                value={form.address1}
                onChange={set("address1")}
                className={field}
              />
            </label>
            <label className={label}>
              <span>
                {m.co_address_2()}
                <span className="mt-0.5 block font-normal text-caption text-muted">
                  {m.co_address_2_optional()}
                </span>
              </span>
              <input
                autoComplete="address-line2"
                placeholder={m.co_address_2_placeholder()}
                value={form.address2}
                onChange={set("address2")}
                className={field}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                {m.co_city()}
                <input
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={set("city")}
                  className={field}
                />
              </label>
              <label className={label}>
                {m.co_region()}
                <input
                  autoComplete="address-level1"
                  value={form.region}
                  onChange={set("region")}
                  className={field}
                />
              </label>
              <label className={label}>
                {m.co_postal()}
                <input
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={set("postalCode")}
                  className={field}
                />
              </label>
              <label className={label}>
                {m.co_address_phone()}
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 213 555 0123"
                  value={form.phone}
                  onChange={set("phone")}
                  className={field}
                />
              </label>
            </div>
            {!parsed.success && form.phone && form.address1 && form.city ? (
              <p role="alert" className="text-meta text-point">
                {parsed.error.issues[0]?.message}
              </p>
            ) : null}
          </section>
          <section className="bg-page px-4 py-6 md:px-7">
            <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-xl">
              {m.co_items({ count: checkout.items.length })}
            </h2>
            <ul className="border-line border-t">
              {checkout.items.map((item) => (
                <li key={item.lineId ?? item.productId} className="flex gap-4 py-4">
                  <div className="w-[72px] shrink-0">
                    <ProductImage
                      product={{ name: item.productName, thumbnailUrl: item.thumbnailUrl ?? null }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-body-lg">{item.productName}</span>
                      <span className="text-meta text-muted">
                        {[item.optionName, m.co_qty({ count: item.quantity })]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <b className="shrink-0 text-body-lg">
                      {formatMoney(item.totalPrice, checkout.currency)}
                    </b>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {paymentRequired ? (
            <section className="bg-page px-4 py-6 md:px-7">
              <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-xl">
                {m.co_payment()}
              </h2>
              {checkout.paymentOptions.length === 0 ? (
                <p role="alert" className="text-body text-point">
                  {m.co_no_payment()}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {checkout.paymentOptions.map((o: AvailablePaymentOption) => {
                    const key = paymentOptionKey(o);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={key === optionKey}
                        onClick={() => setOptionKey(key)}
                        className={`flex h-14 items-center gap-2.5 px-5 font-bold text-body-lg ${
                          key === optionKey ? "border-2 border-ink" : "border border-line-strong"
                        }`}
                      >
                        <PaymentLogo option={o} />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>
        <aside className="bg-page px-4 py-6 md:sticky md:top-6 md:px-7">
          <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-xl">
            {m.co_summary()}
          </h2>
          <dl className="flex flex-col gap-2.5 border-ink border-b pb-4 text-body">
            <div className="flex justify-between">
              <dt className="text-sub">{m.co_product_amount()}</dt>
              <dd>{formatMoney(amounts.productAmount, checkout.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sub">{m.co_delivery_fee()}</dt>
              <dd>
                {amounts.deliveryFee
                  ? formatMoney(amounts.deliveryFee, checkout.currency)
                  : m.co_free()}
              </dd>
            </div>
          </dl>
          <div className="flex items-baseline justify-between pt-5">
            <span className="font-bold text-body-lg">
              {m.co_total()}{" "}
              <span className="font-normal text-meta text-sub">{checkout.currency}</span>
            </span>
            <b className="font-black text-[26px] tracking-[-0.03em] md:text-[30px]">{total}</b>
          </div>
          {pay.data?.message ? (
            <p role="alert" className="mt-3 text-meta text-point">
              {pay.data.message}
            </p>
          ) : null}
          <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:mt-5 md:border-0 md:p-0">
            <button
              type="button"
              disabled={!ready || pay.isPending}
              onClick={() => pay.mutate()}
              className="h-14 w-full bg-ink font-bold text-base text-page disabled:bg-disabled"
            >
              {paymentRequired && option
                ? m.co_pay_with({ amount: total, method: option.label })
                : m.co_pay()}
            </button>
          </div>
          {store.businessName ? (
            <p className="mt-4 hidden text-meta text-sub md:block">
              {[store.businessName, store.businessAddress].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** 옵션 표시 필드(라벨·PG 이름·로고)를 뺀 결제 요청 값 */
function requestOptionOf(option: AvailablePaymentOption) {
  const { label: _l, pgName: _p, logoUrl: _u, ...value } = option;
  return value;
}
