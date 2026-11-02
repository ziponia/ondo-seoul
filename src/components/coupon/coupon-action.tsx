import type { StorefrontCoupon } from "@sayren/storefront-sdk";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { m } from "../../i18n";

/**
 * 쿠폰 받기 칸 — 받기 전(오픈 예정)·로그인 필요·받음·받기를 응답 값(`loginRequired`·`downloaded`·`downloadable`)으로 가른다.
 * 받기 호출은 화면이 `onTake`로 넣는다.
 */
export function CouponAction({
  coupon,
  opensAt,
  onTake,
  pending = false,
}: {
  coupon: StorefrontCoupon;
  opensAt: string | null;
  onTake?: () => void;
  pending?: boolean;
}) {
  const base =
    "flex w-full flex-col items-center justify-center gap-1.5 font-bold text-meta disabled:cursor-not-allowed";
  if (opensAt) {
    return (
      <button type="button" disabled className={`${base} bg-chip text-faint`}>
        {m.coupon_soon()}
      </button>
    );
  }
  if (coupon.loginRequired) {
    return (
      <Link
        to="/login"
        search={{ redirect: "/coupons" }}
        className={`${base} bg-ink px-2 text-center text-page`}
      >
        <Download size={20} aria-hidden />
        {m.coupon_login_take()}
      </Link>
    );
  }
  if (coupon.downloaded && !coupon.downloadable) {
    return (
      <button type="button" disabled className={`${base} bg-chip text-faint`}>
        {m.coupon_taken()}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onTake}
      disabled={pending || !onTake}
      aria-label={m.coupon_take_aria({ name: coupon.name })}
      className={`${base} bg-ink text-page`}
    >
      <Download size={20} aria-hidden />
      {m.coupon_take()}
    </button>
  );
}
