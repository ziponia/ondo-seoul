import {
  type ApplicableCoupon,
  BASE_CURRENCY,
  type CheckoutPricing,
  type CheckoutSession,
  paymentOptionKey,
  paymentStartSchema,
} from "@sayren/storefront-sdk";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  AddressSection,
  CUSTOM_MEMO,
  MEMO_PRESETS,
} from "../../components/checkout/address-section";
import { GlobalCheckout } from "../../components/checkout/global-checkout";
import { PaymentOptions } from "../../components/checkout/payment-options";
import { PickupDialog } from "../../components/checkout/pickup-dialog";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { ProductImage } from "../../components/product/product-image";
import { m } from "../../i18n";
import { createCartCheckout } from "../../lib/cart";
import {
  checkoutPageQuery,
  getPublicConfig,
  pickupLocationsQuery,
  pricingQuery,
  startCheckoutPayment,
} from "../../lib/checkout";
import { formatMoney, formatPhone } from "../../lib/format";
import { savePayNote } from "../../lib/pay-note";
import { paymentsFor } from "../../lib/payments";

/**
 * 주문서 — 배송지·쿠폰·적립금·결제수단을 고르고 결제를 시작한다. 금액은 화면에서 계산하지 않고
 * 고른 값으로 `checkout.pricing`을 다시 불러 그 응답을 그대로 보인다(처음 쿠폰은 `bestCoupons`).
 * 흐름: 서버 함수 `startCheckoutPayment` → 브라우저 `payments.open`(결제창) → `/checkout/return`.
 */
export const Route = createFileRoute("/checkout/$checkoutId")({
  staticData: { mobileHeader: "page", hideTabBar: true, checkoutStep: 2 },
  validateSearch: z.object({
    /** 주문서를 만든 장바구니 줄 — 받는 방법을 바꿀 때 같은 줄로 다시 만든다 */
    items: z.string().optional().catch(undefined),
    /** 방문 수령 장소 */
    pickup: z.string().optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, params, location }) => {
    const [page, config] = await Promise.all([
      queryClient.ensureQueryData(checkoutPageQuery(params.checkoutId)),
      getPublicConfig(),
    ]);
    if (page.kind === "login")
      throw redirect({ to: "/login", search: { redirect: location.href } });
    if (page.kind === "missing") throw notFound();
    return { config };
  },
  head: () => ({ meta: [{ title: m.co_title() }] }),
  notFoundComponent: CheckoutMissing,
  component: CheckoutPage,
});

type Selection = { lines: Record<string, string>; order: string; points: number };

function initialSelection(
  best: { applications: { issueId?: string; lineId?: string }[] } | null,
  coupons: ApplicableCoupon[],
): Selection {
  const lines: Record<string, string> = {};
  let order = "";
  for (const application of best?.applications ?? []) {
    const coupon = coupons.find((c) => c.issueId === application.issueId);
    if (!coupon || !application.issueId) continue;
    if (coupon.kind === "PRODUCT" && application.lineId)
      lines[application.lineId] = application.issueId;
    else if (coupon.kind !== "PRODUCT") order = application.issueId;
  }
  return { lines, order, points: 0 };
}

function applicationsOf(selection: Selection) {
  return [
    ...Object.entries(selection.lines)
      .filter(([, issueId]) => issueId)
      .map(([lineId, issueId]) => ({ issueId, lineId })),
    ...(selection.order ? [{ issueId: selection.order }] : []),
  ];
}

const minus = (amount: number) => `−${formatMoney(amount)}`;

function CheckoutPage() {
  const { checkoutId } = Route.useParams();
  const { config } = Route.useLoaderData();
  const page = useSuspenseQuery(checkoutPageQuery(checkoutId)).data;
  if (page.kind !== "ok") return <CheckoutMissing />;
  // 해외 판매 권역 — 배송 국가·해외 주소·권역 결제수단 화면
  if (page.checkout.currency !== BASE_CURRENCY) {
    return <GlobalCheckout checkout={page.checkout} me={page.me} config={config} />;
  }
  // 주문서가 바뀌면(받는 방법 변경) 고른 값을 처음부터 다시 잡는다
  return <CheckoutForm key={checkoutId} page={page} />;
}

type Page = Extract<
  Awaited<ReturnType<NonNullable<ReturnType<typeof checkoutPageQuery>["queryFn"]>>>,
  { kind: "ok" }
>;

function CheckoutForm({ page }: { page: Page }) {
  const { checkoutId } = Route.useParams();
  const search = Route.useSearch();
  const { config } = Route.useLoaderData();
  const navigate = useNavigate();
  const { checkout, me, addresses, coupons, best } = page;

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string | null>(defaultAddress?.addressId ?? null);
  const [memo, setMemo] = useState<string>(MEMO_PRESETS[0]());
  const [customMemo, setCustomMemo] = useState("");
  const [selection, setSelection] = useState<Selection>(() => initialSelection(best, coupons));
  const [optionKey, setOptionKey] = useState(
    checkout.paymentOptions[0] ? paymentOptionKey(checkout.paymentOptions[0]) : "",
  );
  const [agreed, setAgreed] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);

  const address = addresses.find((a) => a.addressId === addressId) ?? null;
  const applications = useMemo(() => applicationsOf(selection), [selection]);
  const pricing = useQuery(
    pricingQuery({
      checkoutId,
      zipCode: checkout.requiresShipping ? address?.zipCode : undefined,
      coupons: applications,
      ...(selection.points ? { pointAmount: selection.points } : {}),
    }),
  ).data;
  const bestSelection = useMemo(() => initialSelection(best, coupons), [best, coupons]);
  const isBest =
    applicationsOf(bestSelection).length > 0 &&
    JSON.stringify(applicationsOf(bestSelection)) === JSON.stringify(applications);

  const pickupLocation = useQuery({
    ...pickupLocationsQuery({}),
    enabled: !checkout.requiresShipping && Boolean(search.pickup),
  }).data?.find((l) => l.locationId === search.pickup);

  const switchMethod = useMutation({
    mutationFn: (pickupLocationId: string | null) =>
      createCartCheckout({
        data: {
          cartItemIds: (search.items ?? "").split(",").filter(Boolean),
          ...(pickupLocationId ? { pickupLocationId } : {}),
        },
      }).then((created) => ({ ...created, pickupLocationId })),
    onSuccess: ({ checkoutId: next, pickupLocationId }) => {
      setPickupOpen(false);
      void navigate({
        to: "/checkout/$checkoutId",
        params: { checkoutId: next },
        search: { items: search.items, pickup: pickupLocationId ?? undefined },
        replace: true,
      });
    },
  });

  const rejected = pricing?.coupons.some((c) => !c.applied) ?? false;
  const option = checkout.paymentOptions.find((o) => paymentOptionKey(o) === optionKey);
  const paymentRequired = pricing?.paymentRequired ?? true;
  const ready =
    agreed &&
    pricing?.payable &&
    !rejected &&
    (!checkout.requiresShipping || address !== null) &&
    (!paymentRequired || option !== undefined);

  const pay = useMutation({
    mutationFn: async () => {
      const result = await startCheckoutPayment({
        data: {
          checkoutId,
          ...(paymentRequired && option ? { option } : {}),
          pickup: !checkout.requiresShipping,
          ...(checkout.requiresShipping && address
            ? {
                shippingAddress: {
                  addressId: address.addressId,
                  deliveryMemo:
                    memo === CUSTOM_MEMO
                      ? customMemo.trim() || undefined
                      : memo === m.co_memo_none()
                        ? undefined
                        : memo,
                },
              }
            : {}),
          coupons: applications,
          ...(pricing?.amounts.pointAmount ? { pointAmount: pricing.amounts.pointAmount } : {}),
        },
      });
      if (!result.ok) return { message: result.message };
      const start = paymentStartSchema.parse(JSON.parse(result.start));
      savePayNote(start.paymentId, {
        label: option?.label ?? "",
        amount: start.amounts.totalAmount,
        currency: checkout.currency,
      });
      const opened = await paymentsFor(config).open(start);
      if (opened.status === "COMPLETED") {
        await navigate({ to: "/checkout/complete/$orderId", params: { orderId: opened.orderId } });
        return { message: null };
      }
      if (opened.status === "PROCESSING") return { message: null };
      return { message: opened.message };
    },
  });

  const lineName = checkout.items[0]?.productName ?? "";
  const pickupButton = search.items ? (
    <button
      type="button"
      onClick={() => setPickupOpen(true)}
      className="h-10 border border-ink px-3.5 font-bold text-meta max-md:h-11"
    >
      {m.co_pickup_switch()}
    </button>
  ) : null;

  return (
    <div className="bg-surface pb-28 md:pb-24">
      <MobilePageHeader title={m.co_title()} icons={false} />
      <div className="mx-auto max-w-page md:px-6">
        <h1 className="hidden py-10 font-black text-[32px] tracking-[-0.04em] md:block">
          {m.co_title()}
        </h1>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 md:grid-cols-[minmax(0,1fr)_396px] md:gap-6">
          <div className="flex flex-col gap-2 md:gap-4">
            {checkout.testPayment ? (
              <p role="note" className="bg-page px-4 py-3 text-meta text-sub md:px-7">
                {m.co_test_payment()}
              </p>
            ) : null}
            <section className="hidden items-end justify-between bg-page px-7 py-7 md:flex">
              <div className="flex flex-col gap-2">
                <h2 className="font-black text-xl tracking-[-0.03em]">{m.co_orderer()}</h2>
                <p className="text-body">
                  {[me.name, me.phone ? formatPhone(me.phone) : null, me.email]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Link to="/my" className="text-meta underline underline-offset-4">
                {m.co_edit_profile()}
              </Link>
            </section>

            {checkout.requiresShipping ? (
              <AddressSection
                addresses={addresses}
                addressId={addressId}
                onAddress={setAddressId}
                memo={memo}
                onMemo={setMemo}
                customMemo={customMemo}
                onCustomMemo={setCustomMemo}
                pickupButton={pickupButton}
              />
            ) : (
              <section className="bg-page px-4 py-6 md:px-7 md:py-7">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-black text-lg tracking-[-0.03em] md:text-xl">
                    {m.co_pickup_place()}
                  </h2>
                  {search.items ? (
                    <button
                      type="button"
                      onClick={() => setPickupOpen(true)}
                      className="h-10 border border-line-strong px-3.5 font-bold text-meta"
                    >
                      {m.co_change()}
                    </button>
                  ) : null}
                </div>
                {pickupLocation ? (
                  <div className="flex flex-col gap-1 border-2 border-ink px-5 py-4 text-body">
                    <b>{pickupLocation.name}</b>
                    <span className="text-sub">{pickupLocation.address}</span>
                    <span className="text-muted">
                      {[pickupLocation.hours, pickupLocation.phone].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ) : (
                  <p className="text-body text-sub">{m.co_pickup()}</p>
                )}
              </section>
            )}

            <section className="bg-page px-4 py-6 md:px-7 md:py-7">
              <button
                type="button"
                aria-expanded={itemsOpen}
                onClick={() => setItemsOpen(!itemsOpen)}
                className="flex w-full items-center justify-between gap-3 text-left md:pointer-events-none"
              >
                <h2 className="shrink-0 font-black text-lg tracking-[-0.03em] md:text-xl">
                  {m.co_items({ count: checkout.items.length })}
                </h2>
                <span className="flex min-w-0 items-center gap-1 text-body text-sub md:hidden">
                  <span className="truncate">
                    {checkout.items.length > 1
                      ? m.co_items_summary({ name: lineName, count: checkout.items.length - 1 })
                      : lineName}
                  </span>
                  <ChevronDown size={16} aria-hidden className={itemsOpen ? "rotate-180" : ""} />
                </span>
              </button>
              <ul
                className={`mt-4 border-line border-t md:block ${itemsOpen ? "block" : "hidden"}`}
              >
                {checkout.items.map((item) => (
                  <CheckoutLine
                    key={item.lineId ?? item.productId}
                    item={item}
                    couponsEnabled={checkout.couponsEnabled}
                    currency={checkout.currency}
                    coupons={coupons}
                    selection={selection}
                    pricing={pricing}
                    onCoupon={(issueId) =>
                      setSelection({
                        ...selection,
                        lines: { ...selection.lines, [item.lineId ?? ""]: issueId },
                      })
                    }
                  />
                ))}
              </ul>
            </section>

            {checkout.couponsEnabled || checkout.points?.enabled ? (
              <section className="bg-page px-4 py-6 md:px-7 md:py-7">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-black text-lg tracking-[-0.03em] md:text-xl">
                    {m.co_coupons_points()}
                  </h2>
                  {checkout.couponsEnabled && best?.applications.length ? (
                    <button
                      type="button"
                      disabled={isBest}
                      onClick={() => setSelection({ ...bestSelection, points: selection.points })}
                      className="hidden h-10 border border-ink px-3.5 font-bold text-meta disabled:border-line-strong md:block"
                    >
                      {isBest ? m.co_best_applied() : m.co_best_apply()}
                    </button>
                  ) : null}
                </div>
                {checkout.couponsEnabled ? (
                  <>
                    {/* 모바일 — 적용한 쿠폰 요약, 누르면 고르기 */}
                    <button
                      type="button"
                      aria-expanded={couponsOpen}
                      onClick={() => setCouponsOpen(!couponsOpen)}
                      className="flex w-full items-center justify-between gap-3 border border-ink px-4 py-3.5 text-left md:hidden"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        {isBest ? (
                          <span className="font-bold text-caption text-point">
                            {m.co_best_auto()}
                          </span>
                        ) : null}
                        <span className="truncate text-body">
                          {pricing?.coupons
                            .filter((c) => c.applied)
                            .map((c) => c.name)
                            .join(" · ") || m.co_no_coupon_applied()}
                        </span>
                      </span>
                      <span className="shrink-0 font-black text-lg text-point">
                        {pricing?.amounts.couponDiscountAmount
                          ? minus(pricing.amounts.couponDiscountAmount)
                          : null}
                      </span>
                    </button>
                    <div className={`md:block ${couponsOpen ? "mt-4 block" : "hidden"}`}>
                      <OrderCouponSelect
                        coupons={coupons}
                        value={selection.order}
                        pricing={pricing}
                        onChange={(order) => setSelection({ ...selection, order })}
                      />
                      {couponsOpen ? (
                        <div className="mt-4 flex flex-col gap-3 md:hidden">
                          {checkout.items.map((item) => (
                            <LineCouponSelect
                              key={item.lineId ?? item.productId}
                              item={item}
                              coupons={coupons}
                              selection={selection}
                              pricing={pricing}
                              label={item.productName}
                              onCoupon={(issueId) =>
                                setSelection({
                                  ...selection,
                                  lines: { ...selection.lines, [item.lineId ?? ""]: issueId },
                                })
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
                {checkout.points?.enabled ? (
                  <PointsField
                    points={checkout.points}
                    value={selection.points}
                    pricing={pricing}
                    onChange={(points) => setSelection({ ...selection, points })}
                  />
                ) : null}
              </section>
            ) : null}

            {paymentRequired ? (
              <PaymentOptions
                options={checkout.paymentOptions}
                value={optionKey}
                onChange={setOptionKey}
              />
            ) : null}
          </div>

          <aside className="bg-page px-4 py-6 md:sticky md:top-6 md:px-7 md:py-7">
            <Summary checkout={checkout} pricing={pricing} />
            <label className="mt-5 flex gap-2.5 border-line border-t pt-5 text-meta">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
              />
              <span className="flex flex-col gap-1.5">
                <b className="text-body">{m.co_agree()}</b>
                <span className="hidden text-sub md:block">{m.co_agree_detail()}</span>
              </span>
            </label>
            {pay.data?.message || pay.isError ? (
              <p role="alert" className="mt-3 text-meta text-point">
                {pay.data?.message || m.co_failed()}
              </p>
            ) : null}
            <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:mt-6 md:border-0 md:p-0">
              <button
                type="button"
                disabled={!ready || pay.isPending}
                onClick={() => pay.mutate()}
                className="flex h-[60px] w-full flex-col items-center justify-center bg-ink font-bold text-base text-page leading-tight disabled:bg-disabled"
              >
                <span>
                  {formatMoney(
                    pricing?.amounts.totalAmount ?? checkout.amounts.totalAmount,
                    checkout.currency,
                  )}
                </span>
                <span>{m.co_pay()}</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
      {pickupOpen && checkout.items[0] ? (
        <PickupDialog
          basis={{
            productId: checkout.items[0].productId,
            optionId: checkout.items[0].optionId,
            label: [checkout.items[0].productName, checkout.items[0].optionName]
              .filter(Boolean)
              .join(" "),
          }}
          current={search.pickup ?? null}
          pending={switchMethod.isPending}
          onClose={() => setPickupOpen(false)}
          onConfirm={(locationId) => {
            if ((locationId ?? null) === (search.pickup ?? null)) setPickupOpen(false);
            else switchMethod.mutate(locationId);
          }}
        />
      ) : null}
    </div>
  );
}

type Item = CheckoutSession["items"][number];

function couponLabel(coupon: ApplicableCoupon) {
  return coupon.expectedDiscountAmount > 0
    ? m.co_coupon_option({
        name: coupon.name,
        amount: minus(coupon.expectedDiscountAmount).slice(1),
      })
    : coupon.name;
}

function LineCouponSelect({
  item,
  coupons,
  selection,
  pricing,
  onCoupon,
  label,
}: {
  item: Item;
  coupons: ApplicableCoupon[];
  selection: Selection;
  pricing: CheckoutPricing | undefined;
  onCoupon: (issueId: string) => void;
  label: string;
}) {
  const lineId = item.lineId ?? "";
  const value = selection.lines[lineId] ?? "";
  // 다른 줄이 이미 쓴 쿠폰은 고를 수 없다
  const taken = new Set(
    Object.entries(selection.lines)
      .filter(([id]) => id !== lineId)
      .map(([, v]) => v),
  );
  const options = coupons.filter(
    (c) => c.kind === "PRODUCT" && c.applicable && !taken.has(c.issueId),
  );
  const result = pricing?.coupons.find((c) => c.issueId === value && c.kind === "PRODUCT");
  return (
    <label className="flex flex-col gap-1.5 text-meta md:flex-row md:items-center md:gap-2.5">
      <b className="shrink-0">{label}</b>
      <select
        value={value}
        disabled={options.length === 0 && !value}
        onChange={(event) => onCoupon(event.target.value)}
        className="h-10 min-w-0 border border-line-strong bg-page px-3 text-meta disabled:text-faint md:w-[240px]"
      >
        <option value="">
          {options.length === 0 ? m.co_coupon_unavailable() : m.co_coupon_none()}
        </option>
        {options.map((c) => (
          <option key={c.issueId} value={c.issueId}>
            {couponLabel(c)}
          </option>
        ))}
      </select>
      {result && !result.applied ? (
        <span role="alert" className="text-point">
          {m.co_coupon_rejected()}
        </span>
      ) : null}
    </label>
  );
}

function CheckoutLine(props: {
  item: Item;
  currency: string;
  couponsEnabled: boolean;
  coupons: ApplicableCoupon[];
  selection: Selection;
  pricing: CheckoutPricing | undefined;
  onCoupon: (issueId: string) => void;
}) {
  const { item, pricing } = props;
  const applied = pricing?.coupons.find(
    (c) => c.applied && c.kind === "PRODUCT" && c.lineId === item.lineId,
  );
  return (
    <li className="flex gap-4 border-line border-b py-5 last:border-b-0 md:gap-5">
      <div className="w-[72px] shrink-0">
        <ProductImage
          product={{ name: item.productName, thumbnailUrl: item.thumbnailUrl ?? null }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between gap-3">
          <p className="text-body-lg">{item.productName}</p>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <b className="text-body-lg">{formatMoney(item.totalPrice, props.currency)}</b>
            {applied ? (
              <span className="text-meta text-point">
                {m.co_coupon_line({ amount: formatMoney(applied.discountAmount) })}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-meta text-muted">
          {[item.optionName, m.co_qty({ count: item.quantity })].filter(Boolean).join(" · ")}
        </p>
        {item.customInputs.map((input) => (
          <p key={input.key ?? input.label} className="text-caption text-muted">
            {input.label}: {input.value}
          </p>
        ))}
        {props.couponsEnabled ? (
          <div className="mt-2 hidden md:block">
            <LineCouponSelect {...props} label={m.co_product_coupon()} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function OrderCouponSelect({
  coupons,
  value,
  pricing,
  onChange,
}: {
  coupons: ApplicableCoupon[];
  value: string;
  pricing: CheckoutPricing | undefined;
  onChange: (issueId: string) => void;
}) {
  const options = coupons.filter((c) => c.kind !== "PRODUCT" && c.applicable);
  const result = pricing?.coupons.find((c) => c.issueId === value && c.kind !== "PRODUCT");
  return (
    <label className="flex flex-col gap-2 font-bold text-meta">
      {m.co_order_coupon()}
      <select
        value={value}
        disabled={options.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border border-line-strong bg-page px-3.5 font-normal text-body-lg disabled:text-faint"
      >
        <option value="">
          {options.length === 0 ? m.co_coupon_unavailable() : m.co_coupon_none()}
        </option>
        {options.map((c) => (
          <option key={c.issueId} value={c.issueId}>
            {couponLabel(c)}
          </option>
        ))}
      </select>
      {result && !result.applied ? (
        <span role="alert" className="font-normal text-point">
          {m.co_coupon_rejected()}
        </span>
      ) : null}
    </label>
  );
}

function PointsField({
  points,
  value,
  pricing,
  onChange,
}: {
  points: NonNullable<CheckoutSession["points"]>;
  value: number;
  pricing: CheckoutPricing | undefined;
  onChange: (points: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const maxUsable = pricing?.points?.maxUsable ?? points.maxUsable;
  const applied = pricing?.amounts.pointAmount ?? 0;
  const toggle = (
    <button
      type="button"
      disabled={!applied && maxUsable < points.minAmount}
      onClick={() => {
        const next = applied ? 0 : maxUsable;
        setDraft(next ? String(next) : "");
        onChange(next);
      }}
      className="h-11 shrink-0 border border-ink px-4 font-bold text-meta disabled:border-line-strong disabled:text-faint md:h-11"
    >
      {applied ? m.co_points_cancel() : m.co_points_use_all()}
    </button>
  );
  return (
    <div className="mt-5 flex flex-col gap-2">
      {/* 모바일 — 보유액과 모두 사용·취소 */}
      <div className="flex items-center justify-between md:hidden">
        <span className="text-body text-sub">
          {m.co_points_balance_mobile({ amount: formatMoney(points.balance) })}
        </span>
        {toggle}
      </div>
      <div className="hidden items-center justify-between font-bold text-meta md:flex">
        {m.co_points()}
        <span className="font-normal text-sub">
          {m.co_points_balance({ amount: formatMoney(points.balance) })} ·{" "}
          {m.co_points_min({ amount: formatMoney(points.minAmount) })}
        </span>
      </div>
      <div className="hidden gap-2 md:flex">
        <input
          inputMode="numeric"
          aria-label={m.co_points()}
          value={draft ? Number(draft).toLocaleString("ko-KR") : ""}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
          onBlur={() => onChange(Number(draft || 0))}
          className="h-11 min-w-0 flex-1 border border-line-strong px-3.5 text-right text-body-lg"
        />
        {toggle}
      </div>
      {value > 0 && pricing?.points?.rejectReason ? (
        <p role="alert" className="text-meta text-point">
          {m.co_points_rejected({ amount: formatMoney(points.minAmount) })}
        </p>
      ) : null}
    </div>
  );
}

function Summary({
  checkout,
  pricing,
}: {
  checkout: CheckoutSession;
  pricing: CheckoutPricing | undefined;
}) {
  const amounts = pricing?.amounts ?? { ...checkout.amounts, rewardPointAmount: undefined };
  const productCoupon = (pricing?.coupons ?? [])
    .filter((c) => c.applied && c.kind === "PRODUCT")
    .reduce((sum, c) => sum + c.discountAmount, 0);
  const orderCoupon = amounts.couponDiscountAmount - productCoupon;
  const rows: {
    label: string;
    value: string;
    point?: boolean;
    mobile?: boolean;
    desktop?: boolean;
  }[] = [
    { label: m.co_product_amount(), value: formatMoney(amounts.productAmount, checkout.currency) },
    ...(productCoupon
      ? [
          {
            label: m.co_product_coupon_amount(),
            value: minus(productCoupon),
            point: true,
            desktop: true,
          },
        ]
      : []),
    ...(orderCoupon
      ? [
          {
            label: m.co_order_coupon_amount(),
            value: minus(orderCoupon),
            point: true,
            desktop: true,
          },
        ]
      : []),
    ...(amounts.couponDiscountAmount
      ? [
          {
            label: m.co_coupon_amount(),
            value: minus(amounts.couponDiscountAmount),
            point: true,
            mobile: true,
          },
        ]
      : []),
    ...(amounts.pointAmount
      ? [{ label: m.co_points_amount(), value: minus(amounts.pointAmount), point: true }]
      : []),
    ...(amounts.deliveryDiscountAmount
      ? [{ label: m.co_delivery_fee(), value: minus(amounts.deliveryDiscountAmount), point: true }]
      : []),
    {
      label: m.co_delivery_fee(),
      value: amounts.deliveryFee
        ? formatMoney(amounts.deliveryFee, checkout.currency)
        : m.co_free(),
    },
  ];
  return (
    <div>
      <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-xl">{m.co_summary()}</h2>
      <dl className="flex flex-col gap-2.5 border-ink border-b-2 pb-4 text-body">
        {rows.map((row) => (
          <div
            key={`${row.label}${row.mobile ? "m" : ""}`}
            className={`justify-between ${row.mobile ? "flex md:hidden" : row.desktop ? "hidden md:flex" : "flex"}`}
          >
            <dt className="text-sub">{row.label}</dt>
            <dd className={row.point ? "text-point" : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between pt-5">
        <span className="font-bold text-body-lg">{m.co_total()}</span>
        <b className="font-black text-[26px] tracking-[-0.03em] md:text-[30px]">
          {formatMoney(amounts.totalAmount, checkout.currency)}
        </b>
      </div>
      {amounts.rewardPointAmount ? (
        <p className="mt-2 hidden text-right text-meta text-sub md:block">
          {m.co_reward({ amount: formatMoney(amounts.rewardPointAmount) })}
        </p>
      ) : null}
    </div>
  );
}

function CheckoutMissing() {
  return (
    <>
      <MobilePageHeader title={m.co_title()} icons={false} />
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-black text-[22px] tracking-[-0.03em]">{m.co_missing_title()}</h1>
        <p className="text-body text-sub">{m.co_missing_body()}</p>
        <Link
          to="/cart"
          className="mt-3 grid h-12 place-items-center bg-ink px-7 font-bold text-page"
        >
          {m.co_back_cart()}
        </Link>
      </main>
    </>
  );
}
