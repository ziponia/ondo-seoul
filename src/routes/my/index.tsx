import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { LogoutButton } from "../../components/layout/site-header";
import { OrderBox } from "../../components/my/order-box";
import { OrderItemRow } from "../../components/my/order-item-row";
import { ProductImage } from "../../components/product/product-image";
import { m } from "../../i18n";
import { meQuery } from "../../lib/account";
import { formatMoney } from "../../lib/format";
import {
  accountQuery,
  myCouponsQuery,
  myOrdersQuery,
  myReviewsQuery,
  pointsQuery,
  wishlistQuery,
} from "../../lib/my";
import { pointPolicyQuery } from "../../lib/product-queries";

/**
 * 마이페이지 첫 화면 — 회원·혜택 요약, 주문 단계별 개수, 최근 주문, 작성 가능한 리뷰. 모바일은 메뉴 목록이 이어진다.
 * 단계별 개수는 최근 주문 응답의 주문상품 상태를 센 값이다.
 */
export const Route = createFileRoute("/my/")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(myOrdersQuery({ size: 20 })),
      queryClient.ensureQueryData(myCouponsQuery()),
      queryClient.ensureQueryData(pointsQuery()),
      queryClient.ensureQueryData(wishlistQuery()),
      queryClient.ensureQueryData(myReviewsQuery()),
    ]),
  component: MyPage,
});

const STEPS = [
  { key: "PAID", statuses: ["PAID"], label: m.my_status_PAID },
  { key: "CONFIRMED", statuses: ["CONFIRMED"], label: m.my_status_CONFIRMED },
  { key: "DELIVERING", statuses: ["DISPATCHED", "DELIVERING"], label: m.my_status_DELIVERING },
  { key: "DELIVERED", statuses: ["DELIVERED"], label: m.my_status_DELIVERED },
  {
    key: "PURCHASE_DECIDED",
    statuses: ["PURCHASE_DECIDED"],
    label: m.my_status_PURCHASE_DECIDED,
  },
] as const;

const PROVIDER_NAME: Record<string, () => string> = {
  kakao: m.provider_kakao,
  naver: m.provider_naver,
  google: m.provider_google,
};

function MyPage() {
  const me = useSuspenseQuery(meQuery()).data;
  const orders = useSuspenseQuery(myOrdersQuery({ size: 20 })).data;
  const coupons = useSuspenseQuery(myCouponsQuery()).data;
  const { points } = useSuspenseQuery(pointsQuery()).data;
  const wishlist = useSuspenseQuery(wishlistQuery()).data;
  const reviews = useSuspenseQuery(myReviewsQuery()).data;
  const identities = useQuery(accountQuery()).data?.identities;
  const policy = useQuery(pointPolicyQuery()).data;
  if (!me) return null;
  const items = orders.contents.flatMap((o) => o.items);
  const counts = STEPS.map((step) => ({
    ...step,
    count: items.filter((i) => (step.statuses as readonly string[]).includes(i.status)).length,
  }));
  const linked = identities?.identities[0]?.provider;
  const reward = policy?.reviewReward.enabled ? policy.reviewReward.textPoint : 0;
  const stats = [
    {
      label: m.my_stat_coupons(),
      value: String(coupons.available.length),
      to: "/my/coupons" as const,
    },
    {
      label: m.my_stat_points(),
      value: points.balance.toLocaleString("ko-KR"),
      to: "/my/points" as const,
    },
    { label: m.my_stat_wish(), value: String(wishlist.totalElements), to: "/my/wishlist" as const },
  ];
  // 모바일 — 지금 움직이는 주문상품 하나(배송 중·상품 준비 순)
  const live = orders.contents
    .flatMap((o) => o.items.map((item) => ({ order: o, item })))
    .find(({ item }) => ["DELIVERING", "DISPATCHED", "CONFIRMED", "PAID"].includes(item.status));
  return (
    <>
      <MobilePageHeader title={m.my_title()} back={false} />
      {/* 회원 요약 */}
      <section className="hidden items-center justify-between bg-ink px-8 py-7 text-page md:flex">
        <div className="flex flex-col gap-2">
          <h2 className="font-black text-[26px] tracking-[-0.03em]">
            {m.my_hello({ name: me.name })}
          </h2>
          <p className="text-body text-on-dark-sub">
            {[
              linked ? m.my_linked({ provider: PROVIDER_NAME[linked]?.() ?? linked }) : null,
              me.email,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <dl className="flex">
          {[
            ...stats,
            { label: m.my_stat_orders(), value: String(orders.totalElements), to: "/my" as const },
          ].map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className="flex w-24 flex-col gap-1.5 border-on-dark-sub/30 border-l px-3"
            >
              <dt className="text-caption text-on-dark-sub">{stat.label}</dt>
              <dd className="font-black text-[22px]">{stat.value}</dd>
            </Link>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-4 px-4 pt-5 pb-6 md:hidden">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-black text-[22px] tracking-[-0.03em]">
              {m.my_hello_mobile({ name: me.name })}
            </h2>
            {me.email ? <p className="text-body text-sub">{me.email}</p> : null}
          </div>
          <Link to="/my/account" className="flex items-center gap-0.5 text-body text-sub">
            {m.my_profile_link()}
            <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
        <dl className="grid grid-cols-4 border border-line">
          {[
            ...stats,
            {
              label: m.my_stat_reviews(),
              value: String(reviews.writable.length),
              to: "/my/reviews" as const,
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className="flex flex-col items-center gap-1.5 border-line border-l py-4 first:border-l-0"
            >
              <dt className="text-caption text-sub">{stat.label}</dt>
              <dd className="font-black text-lg">{stat.value}</dd>
            </Link>
          ))}
        </dl>
      </section>

      {/* 주문·배송 */}
      <section className="border-surface border-t-8 px-4 py-6 md:mt-12 md:border-0 md:p-0">
        <div className="flex items-center justify-between md:border-ink md:border-b-2 md:pb-4">
          <h2 className="font-black text-lg tracking-[-0.03em] md:text-2xl">
            {m.my_menu_orders()}
          </h2>
          <Link
            to="/my/orders"
            className="flex items-center text-body text-sub md:text-meta md:text-ink md:underline md:underline-offset-4"
          >
            <span className="md:hidden">{m.my_all()}</span>
            <span className="hidden md:inline">{m.my_all_orders()}</span>
            <ChevronRight size={16} aria-hidden className="md:hidden" />
          </Link>
        </div>
        <ol className="grid grid-cols-5 py-4 md:border-line md:border-b md:py-7">
          {counts.map((step) => (
            <li key={step.key} className="flex flex-col items-center gap-2">
              <Link
                to="/my/orders"
                search={{ status: step.key }}
                className={`font-black text-[22px] md:text-[30px] ${step.count ? "text-ink" : "text-disabled"}`}
              >
                {step.count}
              </Link>
              <span className="text-caption text-sub md:text-meta">{step.label()}</span>
            </li>
          ))}
        </ol>
        {live ? (
          <div className="flex flex-col gap-3 border-line border-t pt-4 md:hidden">
            <OrderItemRow orderId={live.order.orderId} item={live.item} actions={false} />
            <div className="grid grid-cols-2 gap-2">
              {live.item.step?.data?.delivery ? (
                <Link
                  to="/my/orders/$orderId"
                  params={{ orderId: live.order.orderId }}
                  search={{ item: live.item.orderItemId, panel: "track" }}
                  className="grid h-12 place-items-center border border-line-strong font-bold text-body"
                >
                  {m.my_act_track()}
                </Link>
              ) : null}
              <Link
                to="/my/orders/$orderId"
                params={{ orderId: live.order.orderId }}
                className="col-start-2 grid h-12 place-items-center border border-line-strong font-bold text-body"
              >
                {m.my_order_detail()}
              </Link>
            </div>
          </div>
        ) : null}
        <div className="mt-5 hidden flex-col gap-5 md:flex">
          {orders.contents.length === 0 ? (
            <p className="py-16 text-center text-body text-sub">{m.my_no_orders()}</p>
          ) : (
            orders.contents
              .slice(0, 2)
              .map((order) => <OrderBox key={order.orderId} order={order} />)
          )}
        </div>
      </section>

      {/* 작성 가능한 리뷰 */}
      {reviews.writable.length > 0 ? (
        <section className="mt-12 hidden md:block">
          <h2 className="mb-4 font-black text-xl tracking-[-0.03em]">
            {m.my_writable({ count: reviews.writable.length })}
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {reviews.writable.slice(0, 4).map((w) => (
              <li key={w.orderItemId} className="flex items-center gap-4 bg-surface p-3.5">
                <div className="w-14 shrink-0">
                  <ProductImage product={{ name: w.productName, thumbnailUrl: w.thumbnailUrl }} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body-lg">{w.productName}</span>
                  {reward ? (
                    <span className="text-meta text-muted">
                      {m.my_review_reward({ amount: formatMoney(reward) })}
                    </span>
                  ) : null}
                </div>
                <Link
                  to="/my/reviews/write/$orderItemId"
                  params={{ orderItemId: w.orderItemId }}
                  className="grid h-10 shrink-0 place-items-center bg-ink px-4 font-bold text-meta text-page"
                >
                  {m.my_act_review()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MobileMenu />
    </>
  );
}

const MOBILE_MENU: {
  title: () => string;
  items: { label: () => string; to: string; search?: object }[];
}[] = [
  {
    title: m.my_group_shopping,
    items: [
      { label: m.my_menu_order_history, to: "/my/orders" },
      { label: m.my_menu_claims, to: "/my/claims" },
    ],
  },
  {
    title: m.my_group_benefit,
    items: [
      { label: m.my_menu_coupons, to: "/my/coupons" },
      { label: m.my_menu_coupon_zone, to: "/coupons" },
      { label: m.my_menu_points, to: "/my/points" },
    ],
  },
  {
    title: m.my_group_activity,
    items: [
      { label: m.my_menu_reviews, to: "/my/reviews" },
      { label: m.my_menu_inquiries, to: "/my/inquiries" },
      { label: m.my_menu_support, to: "/my/support" },
    ],
  },
  {
    title: m.my_group_info,
    items: [
      { label: m.my_menu_account, to: "/my/account" },
      { label: m.my_menu_addresses, to: "/my/account", search: { tab: "addresses" } },
      { label: m.my_menu_consents, to: "/my/account", search: { tab: "consents" } },
    ],
  },
];

/** 모바일 메뉴 목록 — 데스크톱은 왼쪽 메뉴가 같은 역할을 한다 */
function MobileMenu() {
  return (
    <nav aria-label={m.my_title()} className="md:hidden">
      {MOBILE_MENU.map((group) => (
        <section key={group.title()} className="border-surface border-t-8 px-4 pt-5 pb-2">
          <h2 className="mb-1 text-meta text-sub">{group.title()}</h2>
          <ul>
            {group.items.map((item) => (
              <li key={`${item.to}${JSON.stringify(item.search ?? {})}`}>
                <Link
                  to={item.to as "/my"}
                  search={item.search as never}
                  className="flex h-[50px] items-center justify-between text-body-lg"
                >
                  {item.label()}
                  <ChevronRight size={16} aria-hidden className="text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="border-surface border-t-8 bg-surface px-4 pt-6 pb-8">
        <LogoutButton className="text-meta text-sub underline underline-offset-4" />
      </div>
    </nav>
  );
}
