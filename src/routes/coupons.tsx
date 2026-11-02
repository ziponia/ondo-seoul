import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { CouponAction } from "../components/coupon/coupon-action";
import { couponOpensAt } from "../components/coupon/coupon-text";
import { CouponTicket } from "../components/coupon/coupon-ticket";
import { m } from "../i18n";
import { couponsQuery, downloadCoupons } from "../lib/queries";

/**
 * 쿠폰존 — 셀러가 「다운로드」로 만든 쿠폰 중 지금 받을 수 있는 것. 받기는 회원 전용이다.
 * 받기는 `me.downloadCoupon`이고 받은 뒤 목록을 다시 읽어 받음으로 보인다.
 */
export const Route = createFileRoute("/coupons")({
  staticData: { mobileHeader: "page" },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(couponsQuery()),
  component: CouponZone,
});

function CouponZone() {
  const coupons = useSuspenseQuery(couponsQuery()).data.contents;
  const queryClient = useQueryClient();
  const now = new Date();
  const take = useMutation({
    mutationFn: (couponIds: string[]) => downloadCoupons({ data: { couponIds } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: couponsQuery().queryKey }),
  });
  // 모두 받기는 로그인 회원에게만 — 지금 받을 수 있는 쿠폰(오픈 전 제외)이 대상이다
  const member = coupons.length > 0 && coupons.every((c) => !c.loginRequired);
  const open = coupons.filter((c) => !couponOpensAt(c, now));
  const takeable = open.filter((c) => c.downloadable).map((c) => c.couponId);
  const allDone = open.length > 0 && takeable.length === 0;
  const takeAll = member ? (
    <button
      type="button"
      disabled={allDone || take.isPending}
      onClick={() => take.mutate(takeable)}
      className="grid h-[52px] place-items-center bg-point px-7 font-bold text-base text-page disabled:bg-sub disabled:text-faint max-md:w-full md:h-13"
    >
      {allDone ? m.coupons_all_taken() : m.coupons_take_all()}
    </button>
  ) : null;
  const todayLeft = (count: number | null) =>
    count !== null ? m.coupon_today_left({ count }) : null;
  return (
    <main>
      <section className="bg-ink text-page">
        <DarkBar />
        <div className="mx-auto flex max-w-page flex-wrap items-end justify-between gap-4 px-4 pt-3 pb-6 md:gap-6 md:px-6 md:py-14">
          <div className="flex flex-col gap-3">
            <span className="font-bold font-display text-meta tracking-[0.14em]">COUPON ZONE</span>
            <h1 className="font-black text-[28px] leading-[1.1] tracking-[-0.05em] md:text-[52px]">
              {m.coupons_title()}
            </h1>
            <p className="text-body-lg text-line-strong">{m.coupons_note()}</p>
          </div>
          <div className="flex gap-2 max-md:w-full max-md:flex-col">
            <Link
              to="/my/coupons"
              search={{ register: true }}
              className="grid h-11 place-items-center border border-page px-4 font-bold text-body max-md:self-start md:h-13 md:px-5 md:text-body-lg"
            >
              {m.coupons_register()}
            </Link>
            {takeAll}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-page px-4 pt-8 pb-10 md:px-6 md:pt-10">
        {take.data && !take.data.ok ? (
          <p role="alert" className="mb-4 text-meta text-point">
            {take.data.message || m.coupons_failed()}
          </p>
        ) : null}
        {coupons.length === 0 ? (
          <p className="py-24 text-center text-muted">{m.coupons_empty()}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] md:gap-4">
            {coupons.map((coupon) => {
              const opensAt = couponOpensAt(coupon, now);
              return (
                <CouponTicket
                  key={coupon.couponId}
                  coupon={coupon}
                  tone="outlined"
                  opensAt={opensAt}
                  flag={opensAt ? m.coupon_soon() : todayLeft(coupon.remainingTodayCount)}
                  action={
                    <CouponAction
                      coupon={coupon}
                      opensAt={opensAt}
                      pending={take.isPending}
                      onTake={() => take.mutate([coupon.couponId])}
                    />
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

/** 모바일 상단 — 검은 히어로 안의 바(뒤로·가운데 제목) */
function DarkBar() {
  const router = useRouter();
  return (
    <div className="flex h-14 items-center px-2 md:hidden">
      <button
        type="button"
        aria-label={m.search_back()}
        onClick={() => router.history.back()}
        className="grid h-11 w-11 place-items-center"
      >
        <ChevronLeft size={22} aria-hidden />
      </button>
      <span className="flex-1 text-center font-bold text-[17px]">{m.coupons_page()}</span>
      <span className="w-11" />
    </div>
  );
}
