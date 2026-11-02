import { formatOrderNo, type MyOrderItem } from "@sayren/storefront-sdk";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ClaimDialog } from "../../../components/my/claim-dialog";
import { MySubPage } from "../../../components/my/my-sub-page";
import { OrderItemRow } from "../../../components/my/order-item-row";
import { m } from "../../../i18n";
import { formatDateTime, formatFullDateTime } from "../../../lib/date";
import { formatMoney, formatPhone } from "../../../lib/format";
import { deliveryQuery, myOrderDetailQuery } from "../../../lib/my";
import { paymentMethodLabel } from "../../../lib/pay-label";

/**
 * 주문 상세 — 배송 조회(단계·이동 기록), 주문상품과 버튼(취소·교환·반품 신청 창, 구매 확정, 리뷰), 배송지, 결제 정보.
 * 금액은 주문 응답의 결제 정보 그대로다. `?item=…&panel=…`로 들어오면 그 상품의 창을 연다.
 */
export const Route = createFileRoute("/my/orders/$orderId")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    item: z.string().optional().catch(undefined),
    panel: z.enum(["track", "claim", "cancel"]).optional().catch(undefined),
  }),
  loader: async ({ context: { queryClient }, params }) => {
    const order = await queryClient.ensureQueryData(myOrderDetailQuery(params.orderId));
    if (!order) throw notFound();
  },
  head: () => ({ meta: [{ title: m.od_title() }] }),
  component: OrderDetail,
});

const STEP_INDEX: Record<string, number> = {
  PAYMENT_WAITING: 0,
  PAID: 0,
  CONFIRMED: 1,
  DISPATCHED: 2,
  DELIVERING: 2,
  DELIVERED: 3,
  PURCHASE_DECIDED: 4,
};
const STEPS = [
  m.od_step_paid,
  m.od_step_preparing,
  m.od_step_shipping,
  m.od_step_delivered,
  m.od_step_decided,
];

function OrderDetail() {
  const { orderId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const order = useSuspenseQuery(myOrderDetailQuery(orderId)).data;
  if (!order) return null;
  const tracked =
    order.items.find((i) => i.orderItemId === search.item && i.step?.data?.delivery) ??
    order.items.find((i) => i.step?.data?.delivery);
  const panelItem =
    search.panel === "claim" || search.panel === "cancel"
      ? order.items.find((i) => i.orderItemId === search.item)
      : undefined;
  const { payment, shippingAddress: address } = order;
  const close = () => navigate({ search: {}, replace: true });
  return (
    <MySubPage title={m.od_title()} back={{ label: m.od_back(), to: "/my" }}>
      <p className="px-4 pt-4 text-body text-sub max-md:hidden md:-mt-3 md:px-0 md:pt-0">
        {m.od_meta({
          date: formatFullDateTime(order.orderedAt),
          no: formatOrderNo(order.orderNo) || order.orderId,
        })}
      </p>
      <p className="flex flex-col gap-0.5 px-4 pt-4 pb-1 md:hidden">
        <b className="text-body-lg">
          {m.od_meta_date({ date: formatFullDateTime(order.orderedAt) })}
        </b>
        <span className="text-body text-sub">
          {m.my_order_no({ no: formatOrderNo(order.orderNo) || order.orderId })}
        </span>
      </p>

      {tracked ? <Tracking item={tracked} /> : null}

      <section className="mt-2 border-surface border-t-8 px-4 py-6 md:mt-14 md:border-0 md:p-0">
        <h2 className="mb-4 font-black text-lg tracking-[-0.03em] md:text-2xl">{m.od_items()}</h2>
        <ul className="border-line border-t md:border-ink md:border-t-2">
          {order.items.map((item) => (
            <li key={item.orderItemId} className="border-line border-b py-5">
              <OrderItemRow
                orderId={order.orderId}
                item={item}
                onPanel={(panel) =>
                  navigate({ search: { item: item.orderItemId, panel }, replace: true })
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-2 md:mt-14 md:grid-cols-2 md:gap-6">
        {order.requiresShipping ? (
          <section className="border-surface border-t-8 px-4 py-6 md:border-0 md:p-0">
            <h2 className="mb-4 border-ink pb-4 font-black text-lg tracking-[-0.03em] md:border-b-2 md:text-2xl">
              {m.od_address()}
            </h2>
            <dl className="flex flex-col gap-3 text-body">
              <Row label={m.od_receiver()} value={address.receiverName} />
              <Row label={m.od_phone()} value={formatPhone(address.phone)} />
              <Row
                label={m.od_addr()}
                value={[address.address1, address.address2].filter(Boolean).join(" ")}
              />
              {address.deliveryMemo ? (
                <Row label={m.od_memo()} value={address.deliveryMemo} />
              ) : null}
            </dl>
          </section>
        ) : null}
        <section className="border-surface border-t-8 px-4 py-6 md:border-0 md:p-0">
          <h2 className="mb-4 border-ink pb-4 font-black text-lg tracking-[-0.03em] md:border-b-2 md:text-2xl">
            {m.od_payment()}
          </h2>
          <dl className="flex flex-col gap-3 border-line border-b pb-4 text-body">
            {payment.couponDiscountAmount ? (
              <Amount label={m.co_coupon_amount()} value={-payment.couponDiscountAmount} />
            ) : null}
            {payment.deliveryDiscountAmount ? (
              <Amount label={m.done_delivery_discount()} value={-payment.deliveryDiscountAmount} />
            ) : null}
            {payment.pointAmount ? (
              <Amount label={m.co_points_amount()} value={-payment.pointAmount} />
            ) : null}
            {payment.refundedAmount ? (
              <Amount label={m.od_refunded()} value={-payment.refundedAmount} />
            ) : null}
          </dl>
          <div className="flex items-center justify-between pt-4">
            <span className="font-bold text-body-lg">{m.pay_amount()}</span>
            <b className="font-black text-[26px] tracking-[-0.03em]">
              {formatMoney(payment.totalAmount)}
            </b>
          </div>
          <div className="mt-2 flex justify-between text-body">
            <span className="text-sub">{m.pay_method()}</span>
            <span>{paymentMethodLabel(payment.method, payment.easyPayProvider)}</span>
          </div>
        </section>
      </div>
      {panelItem && (search.panel === "claim" || search.panel === "cancel") ? (
        <ClaimDialog item={panelItem} mode={search.panel} onClose={close} />
      ) : null}
    </MySubPage>
  );
}

function Tracking({ item }: { item: MyOrderItem }) {
  const delivery = item.step?.data?.delivery;
  const tracking = useQuery(deliveryQuery(item.orderItemId)).data;
  const events = tracking?.ok ? tracking.data.trackingEvents : [];
  const current = STEP_INDEX[item.status] ?? 0;
  return (
    <section className="mt-2 border-surface border-t-8 px-4 py-6 md:mt-12 md:border-0 md:p-0">
      <h2 className="mb-5 font-black text-lg tracking-[-0.03em] md:text-2xl">{m.od_tracking()}</h2>
      <ol className="grid grid-cols-5">
        {STEPS.map((label, index) => (
          <li
            key={label()}
            aria-current={index === current ? "step" : undefined}
            className={`border-t-4 pt-3 text-center text-caption md:text-body ${
              index <= current ? "border-ink" : "border-line"
            } ${index === current ? "font-bold" : index < current ? "" : "text-faint"}`}
          >
            {label()}
          </li>
        ))}
      </ol>
      <div className="mt-5 grid border border-line md:grid-cols-2">
        <div className="flex flex-col gap-2 border-line p-5 max-md:border-b md:border-r md:p-6">
          <span className="text-meta text-sub">{m.od_carrier()}</span>
          <b className="text-lg">
            {delivery?.carrierName} · {delivery?.trackingNumber}
          </b>
          <span className="text-meta text-sub">{item.productName}</span>
          {delivery?.trackingUrl ? (
            <a
              href={delivery.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="self-start text-meta underline underline-offset-4"
            >
              {m.od_tracking_link()}
            </a>
          ) : null}
        </div>
        <ol className="flex flex-col gap-3 p-5 text-body md:p-6">
          {events.length === 0 ? (
            <li className="text-sub">{m.od_no_events()}</li>
          ) : (
            events.map((event, index) => (
              <li key={event.occurredAt} className="flex items-start gap-4 md:items-center">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full md:mt-0 ${index === 0 ? "bg-ink" : "bg-disabled"}`}
                />
                <span className="flex flex-col-reverse gap-0.5 md:flex-row md:gap-4">
                  <span className="text-meta text-sub md:w-24 md:shrink-0 md:text-body">
                    {formatDateTime(event.occurredAt)}
                  </span>
                  <span className={index === 0 ? "font-bold" : undefined}>
                    {event.status} · {event.location}
                  </span>
                </span>
              </li>
            ))
          )}
        </ol>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <dt className="w-16 shrink-0 text-sub">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Amount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sub">{label}</dt>
      <dd className={value < 0 ? "text-point" : undefined}>
        {value < 0 ? `−${formatMoney(-value)}` : formatMoney(value)}
      </dd>
    </div>
  );
}
