import type { MyOrder, MyOrderItem } from "@sayren/storefront-sdk";
import { formatOrderNo } from "@sayren/storefront-sdk";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";
import { OrderItemRow } from "./order-item-row";

/** 주문 한 건 — 주문일·주문번호·주문 상세 링크와 주문상품 줄. `items`로 보일 줄을 고를 수 있다 */
export function OrderBox({
  order,
  items = order.items,
}: {
  order: MyOrder;
  items?: MyOrderItem[];
}) {
  return (
    <article className="border-line md:border max-md:border-surface max-md:border-t-8">
      <header className="flex items-center justify-between border-line border-b px-4 py-3.5 md:bg-surface/60 md:px-5 text-body">
        <span>
          <b>{formatDate(order.orderedAt)}</b>
          <span className="ml-3 text-sub max-md:hidden">
            {m.my_order_no({ no: formatOrderNo(order.orderNo) || order.orderId })}
          </span>
          <span className="ml-2.5 text-sub md:hidden">
            {formatOrderNo(order.orderNo) || order.orderId}
          </span>
        </span>
        <Link
          to="/my/orders/$orderId"
          params={{ orderId: order.orderId }}
          className="flex items-center text-meta text-sub md:text-ink md:underline md:underline-offset-4"
        >
          <span className="max-md:hidden">{m.my_order_detail()}</span>
          <span className="md:hidden">{m.my_order_detail_short()}</span>
          <ChevronRight size={14} aria-hidden className="md:hidden" />
        </Link>
      </header>
      <ul>
        {items.map((item) => (
          <li
            key={item.orderItemId}
            className="border-line border-b px-4 py-4 last:border-b-0 md:px-5 md:py-5"
          >
            <OrderItemRow orderId={order.orderId} item={item} />
          </li>
        ))}
      </ul>
    </article>
  );
}
