import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { couponsQuery } from "../../lib/queries";
import { couponAmount } from "../coupon/coupon-text";

/**
 * 상단 띠 — 지금 받을 수 있는 첫 쿠폰을 알린다(문구는 쿠폰 응답으로 만든다). 받을 쿠폰이 없거나
 * 이 권역에서 쿠폰을 쓸 수 없으면 숨긴다.
 */
export function CouponBanner() {
  const store = useStore();
  const coupon = useSuspenseQuery(couponsQuery()).data.contents.find(
    (c) => !c.issueStartsAt || new Date(c.issueStartsAt) <= new Date(),
  );
  if (!coupon || store.market?.couponsEnabled === false) return null;
  return (
    <Link
      to="/coupons"
      className="block bg-ink px-4 py-2.5 text-center font-bold text-meta text-page"
    >
      {m.banner_coupon({ name: coupon.name, amount: couponAmount(coupon) })}
    </Link>
  );
}
