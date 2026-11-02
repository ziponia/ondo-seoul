import { formatOrderNo } from "@sayren/storefront-sdk";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MobileLogoBar } from "../../components/layout/mobile-logo-bar";
import { ProductImage } from "../../components/product/product-image";
import { m } from "../../i18n";
import { formatFullDateTime } from "../../lib/date";
import { formatMoney, formatPhone } from "../../lib/format";
import { myOrderQuery } from "../../lib/orders";
import { paymentMethodLabel } from "../../lib/pay-label";

/** 주문 완료 — 주문 상세(`myOrders.get`) 응답만 보인다 */
export const Route = createFileRoute("/checkout/complete/$orderId")({
  staticData: { mobileHeader: "page", hideTabBar: true, checkoutStep: 3 },
  loader: async ({ context: { queryClient }, params, location }) => {
    const page = await queryClient.ensureQueryData(myOrderQuery(params.orderId));
    if (page.kind === "login")
      throw redirect({ to: "/login", search: { redirect: location.href } });
    if (page.kind === "missing") throw notFound();
  },
  head: () => ({ meta: [{ title: m.done_title() }] }),
  component: OrderComplete,
});

function OrderComplete() {
  const { orderId } = Route.useParams();
  const page = useSuspenseQuery(myOrderQuery(orderId)).data;
  if (page.kind !== "ok") return null;
  const { order } = page;
  const { payment } = order;
  // 주문 응답에는 상품 금액·배송비 합계가 없다 — 화면에서 빼고 더해 만들지 않고 응답에 있는 값만 줄마다 보인다
  const discounts = [
    { label: m.co_coupon_amount(), amount: payment.couponDiscountAmount },
    { label: m.done_delivery_discount(), amount: payment.deliveryDiscountAmount },
    { label: m.co_points_amount(), amount: payment.pointAmount },
  ].filter((row) => row.amount > 0);
  const pickup = order.items
    .map((item) => item.fulfillmentSnapshot)
    .map((snapshot) => ("pickupLocation" in snapshot ? snapshot.pickupLocation : undefined))
    .find(Boolean) as { name: string; address: string } | undefined;
  const section = "bg-page px-5 py-7 md:px-8";
  return (
    <div className="bg-surface pb-28 md:pb-16">
      <MobileLogoBar />
      <main className="mx-auto flex max-w-[760px] flex-col gap-2 md:gap-4 md:pt-14">
        <section className={`${section} flex flex-col items-center text-center md:py-12`}>
          <span
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-full bg-ink text-page"
          >
            <Check size={28} strokeWidth={2.4} />
          </span>
          <h1 className="mt-5 font-black text-[24px] tracking-[-0.04em] md:text-[32px]">
            {m.done_title()}
          </h1>
          <p className="mt-3 text-body text-sub">
            {m.done_order_no()}{" "}
            <b className="text-ink">{formatOrderNo(order.orderNo) || order.orderId}</b>
            <span className="max-md:hidden"> · </span>
            <span className="max-md:mt-1.5 max-md:block">
              {formatFullDateTime(order.orderedAt)}
            </span>
          </p>
          <p className="mt-3 text-body text-sub">{pickup ? m.done_pickup_hint() : m.done_hint()}</p>
          {order.testPayment ? <p className="mt-2 text-meta text-muted">{m.done_test()}</p> : null}
          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-row-reverse gap-2 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:mt-7 md:flex-row md:border-0 md:p-0">
            <Link
              to="/my"
              className="grid h-[52px] flex-1 place-items-center whitespace-nowrap bg-ink px-7 font-bold text-body-lg text-page"
            >
              {m.done_detail()}
            </Link>
            <Link
              to="/"
              className="grid h-[52px] flex-1 place-items-center whitespace-nowrap border border-ink px-7 font-bold text-body-lg"
            >
              {m.done_continue()}
            </Link>
          </div>
        </section>
        <section className={section}>
          <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-xl">
            {m.done_payment()}
          </h2>
          <dl className="flex flex-col gap-3 border-ink border-b pb-4 text-body">
            <Row
              label={m.pay_method()}
              value={paymentMethodLabel(payment.method, payment.easyPayProvider)}
            />
            {discounts.map((row) => (
              <Row
                key={row.label}
                label={row.label}
                value={`−${formatMoney(row.amount, order.currency)}`}
                point
              />
            ))}
          </dl>
          <div className="flex items-center justify-between pt-5">
            <span className="font-bold text-body-lg">{m.pay_amount()}</span>
            <b className="font-black text-[26px] tracking-[-0.03em]">
              {formatMoney(payment.totalAmount, order.currency)}
            </b>
          </div>
        </section>
        <section className={section}>
          <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-xl">
            {m.done_delivery()}
          </h2>
          {pickup ? (
            <dl className="flex flex-col gap-3 text-body">
              <InfoRow label={m.done_pickup_place()} value={pickup.name} />
              <InfoRow label={m.done_address()} value={pickup.address} />
            </dl>
          ) : (
            <dl className="flex flex-col gap-3 text-body">
              <InfoRow
                label={m.done_receiver()}
                value={`${order.shippingAddress.receiverName} · ${formatPhone(order.shippingAddress.phone)}`}
              />
              <InfoRow
                label={m.done_address()}
                value={[
                  order.shippingAddress.address1,
                  order.shippingAddress.address2,
                  // 해외 배송지 — 도시·주·우편번호를 이어 쓴다
                  ...(order.shippingAddress.countryCode &&
                  order.shippingAddress.countryCode !== "KR"
                    ? [
                        order.shippingAddress.city,
                        order.shippingAddress.region,
                        order.shippingAddress.zipCode,
                        order.shippingAddress.countryCode,
                      ]
                    : []),
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </dl>
          )}
        </section>
        <section className={section}>
          <h2 className="mb-2 font-black text-lg tracking-[-0.03em] md:text-xl">
            {m.done_items({ count: order.items.length })}
          </h2>
          <ul className="border-line border-t">
            {order.items.map((item) => (
              <li
                key={item.orderItemId}
                className="flex items-center gap-4 border-line border-b py-4 last:border-b-0"
              >
                <div className="w-14 shrink-0">
                  <ProductImage
                    product={{ name: item.productName, thumbnailUrl: item.thumbnailUrl }}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-body-lg">{item.productName}</p>
                  <p className="text-meta text-muted">
                    {[item.optionName, m.co_qty({ count: item.quantity })]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <b className="shrink-0 text-body-lg">
                  {formatMoney(item.totalPrice, order.currency)}
                </b>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Row({ label, value, point }: { label: string; value: string; point?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sub">{label}</dt>
      <dd className={point ? "text-point" : undefined}>{value}</dd>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <dt className="w-16 shrink-0 text-sub">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
