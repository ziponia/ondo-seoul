import type { StorefrontCoupon } from "@sayren/storefront-sdk";
import { couponAmount, couponCondition, couponKind, couponPeriod } from "./coupon-text";

/**
 * 쿠폰 티켓 — 왼쪽 혜택, 점선 오른쪽 받기 칸. 받기 동작은 화면이 `action`으로 넣는다(로그인·받기·받음 판정이 화면마다 같다).
 */
export function CouponTicket({
  coupon,
  action,
  flag,
  tone = "plain",
  opensAt,
}: {
  coupon: StorefrontCoupon;
  /** 받기 시작 전이면 그 안내 — 기간 대신 보인다 */
  opensAt?: string | null;
  action: React.ReactNode;
  /** 오늘 남은 수량·오픈 예정 같은 강조 한 줄 */
  flag?: string | null;
  tone?: "plain" | "outlined";
}) {
  const period = opensAt ?? couponPeriod(coupon);
  return (
    <article className={`flex min-h-32 bg-page ${tone === "outlined" ? "border border-ink" : ""}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-1 border-dash border-r border-dashed px-4 py-4 md:gap-1.5 md:px-6 md:py-5">
        <div className="flex items-center gap-1.5 font-bold text-caption">
          <span className="border border-ink px-1.5">{couponKind(coupon)}</span>
          {flag ? <span className="text-point">{flag}</span> : null}
        </div>
        <span className="font-display font-extrabold text-[26px] text-point leading-tight tracking-[-0.03em] md:text-[30px]">
          {couponAmount(coupon)}
        </span>
        <span className="font-bold text-body-lg">{coupon.name}</span>
        <span className="text-meta text-sub">{couponCondition(coupon)}</span>
        {period ? <span className="mt-auto text-caption text-muted">{period}</span> : null}
      </div>
      <div className="flex w-[78px] shrink-0 md:w-[104px]">{action}</div>
    </article>
  );
}
