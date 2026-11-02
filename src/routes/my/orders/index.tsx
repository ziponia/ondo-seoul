import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Pager } from "../../../components/listing/pager";
import { MySubPage } from "../../../components/my/my-sub-page";
import { OrderBox } from "../../../components/my/order-box";
import { m } from "../../../i18n";
import { myOrdersQuery } from "../../../lib/my";

/**
 * 주문 내역 — 기간(주문일 `from`)·상태(`status`)로 거른 주문 목록. 상태로 거르면 그 상태의 주문상품 줄만 보인다.
 */
const STATUSES = [
  "PAID",
  "CONFIRMED",
  "DELIVERING",
  "DELIVERED",
  "PURCHASE_DECIDED",
  "CANCELED",
] as const;
const PERIODS = { "1m": 1, "3m": 3, "6m": 6, all: null } as const;
const ITEM_STATUS: Record<(typeof STATUSES)[number], string[]> = {
  PAID: ["PAID"],
  CONFIRMED: ["CONFIRMED"],
  DELIVERING: ["DISPATCHED", "DELIVERING"],
  DELIVERED: ["DELIVERED"],
  PURCHASE_DECIDED: ["PURCHASE_DECIDED"],
  CANCELED: ["CANCELED"],
};
const SIZE = 10;

export const Route = createFileRoute("/my/orders/")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    status: z.enum(STATUSES).optional().catch(undefined),
    period: z.enum(["1m", "3m", "6m", "all"]).optional().catch(undefined),
    page: z.number().int().min(1).optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: m.oh_title() }] }),
  component: OrderHistory,
});

/** 기간의 시작일(한국 날짜 자정) — 서버가 이 날 이후 주문만 준다 */
function fromOf(period: keyof typeof PERIODS): string | undefined {
  const months = PERIODS[period];
  if (months === null) return undefined;
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

const STATUS_LABEL = {
  PAID: m.my_status_PAID,
  CONFIRMED: m.my_status_CONFIRMED,
  DELIVERING: m.my_status_DELIVERING,
  DELIVERED: m.my_status_DELIVERED,
  PURCHASE_DECIDED: m.my_status_PURCHASE_DECIDED,
  CANCELED: m.my_status_CANCELED,
};

function OrderHistory() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const period = search.period ?? "3m";
  const page = search.page ?? 1;
  const orders = useQuery({
    ...myOrdersQuery({ page, size: SIZE, status: search.status, from: fromOf(period) }),
    placeholderData: keepPreviousData,
  }).data;
  const setStatus = (value: string) =>
    navigate({
      search: {
        ...search,
        status: (value || undefined) as (typeof STATUSES)[number] | undefined,
        page: undefined,
      },
    });
  const visible = (orders?.contents ?? [])
    .map((order) => ({
      order,
      items: search.status
        ? order.items.filter((i) =>
            ITEM_STATUS[search.status as keyof typeof ITEM_STATUS].includes(i.status),
          )
        : order.items,
    }))
    .filter((row) => row.items.length > 0);
  return (
    <MySubPage title={m.oh_title()}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 md:bg-surface md:px-[18px] md:py-3.5">
        <div className="grid flex-1 grid-cols-4 gap-1.5 md:flex md:flex-none">
          {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={period === key}
              onClick={() => navigate({ search: { ...search, period: key, page: undefined } })}
              className={`h-9 px-3.5 font-bold text-meta md:h-[38px] ${
                period === key ? "bg-ink text-page" : "border border-line-strong bg-page"
              }`}
            >
              {m[`oh_period_${key}`]()}
            </button>
          ))}
        </div>
        <label className="hidden items-center gap-2 font-bold text-meta md:flex">
          {m.oh_status()}
          <select
            value={search.status ?? ""}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 border border-line-strong bg-page px-2.5 font-normal md:h-[38px] md:w-[88px]"
          >
            <option value="">{m.oh_status_all()}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between px-4 pt-4 pb-3.5 md:px-0 md:pt-6">
        <p className="text-body text-sub">{m.oh_summary({ count: orders?.totalElements ?? 0 })}</p>
        <select
          aria-label={m.oh_status()}
          value={search.status ?? ""}
          onChange={(event) => setStatus(event.target.value)}
          className="bg-page font-bold text-body md:hidden"
        >
          <option value="">{m.oh_status_all_mobile()}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]()}
            </option>
          ))}
        </select>
      </div>
      {orders && visible.length === 0 ? (
        <p className="py-24 text-center text-body text-sub">{m.oh_empty()}</p>
      ) : (
        <div className="flex flex-col gap-2 md:gap-5">
          {visible.map(({ order, items }) => (
            <OrderBox key={order.orderId} order={order} items={items} />
          ))}
        </div>
      )}
      {orders && orders.totalPages > 1 ? (
        <div className="mt-10">
          <Pager
            page={page}
            totalPages={orders.totalPages}
            onPage={(next) => navigate({ search: { ...search, page: next } })}
          />
        </div>
      ) : null}
    </MySubPage>
  );
}
