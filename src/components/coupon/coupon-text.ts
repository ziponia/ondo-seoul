import type { StorefrontCoupon } from "@sayren/storefront-sdk";
import { m } from "../../i18n";
import { formatDate, formatDateTime } from "../../lib/date";
import { formatMoney } from "../../lib/format";

type CouponView = Pick<
  StorefrontCoupon,
  "benefit" | "reward" | "minOrderAmount" | "kind" | "endsAt" | "validDaysAfterIssue"
> &
  Partial<Pick<StorefrontCoupon, "perMemberIssueLimit">>;

/** 크게 보이는 혜택 — 할인율·할인액, 구간 할인은 가장 높은 구간, 적립·N+1은 그 표기 */
export function couponAmount(coupon: CouponView): string {
  const { benefit, reward } = coupon;
  if (reward?.type === "TIERED" && reward.tiers?.length) {
    const top = reward.tiers[reward.tiers.length - 1];
    if (top?.benefit.type === "RATE") return m.coupon_tiered({ rate: top.benefit.value });
  }
  if (reward?.type === "BUY_X_GET_Y" && reward.buy && reward.get) {
    return m.coupon_bxgy({ buy: reward.buy, get: reward.get });
  }
  const value = benefit.type === "RATE" ? `${benefit.value}%` : formatMoney(benefit.value);
  return reward?.type === "POINT" ? m.coupon_point({ value }) : value;
}

/** 조건 한 줄 — 최대 할인액, 최소 주문 금액, 구간, N+1 */
export function couponCondition(coupon: CouponView): string {
  const { benefit, reward } = coupon;
  if (reward?.type === "TIERED" && reward.tiers?.length) {
    return reward.tiers
      .filter((tier) => tier.benefit.type === "RATE")
      .map((tier) =>
        m.coupon_tier_row({ amount: formatMoney(tier.minAmount), rate: tier.benefit.value }),
      )
      .join(" · ");
  }
  if (reward?.type === "BUY_X_GET_Y" && reward.buy && reward.get) {
    const args = { total: reward.buy + reward.get, get: reward.get, rate: reward.rate ?? 100 };
    return (reward.rate ?? 100) >= 100 ? m.coupon_bxgy_free(args) : m.coupon_bxgy_note(args);
  }
  const parts: string[] = [];
  if (reward?.type === "POINT") parts.push(m.coupon_point_note());
  if (benefit.maxDiscountAmount) {
    const amount = formatMoney(benefit.maxDiscountAmount);
    parts.push(
      reward?.type === "POINT" ? m.coupon_max_point({ amount }) : m.coupon_max_discount({ amount }),
    );
  }
  if (coupon.minOrderAmount > 0) {
    parts.push(m.coupon_min_order({ amount: formatMoney(coupon.minOrderAmount) }));
  }
  if (coupon.perMemberIssueLimit) {
    parts.push(m.coupon_per_member({ count: coupon.perMemberIssueLimit }));
  }
  return parts.join(" · ");
}

/** 기간 — 받은 뒤 유효 일수가 먼저, 아니면 종료일 */
export function couponPeriod(coupon: CouponView): string | null {
  if (coupon.validDaysAfterIssue) return m.coupon_valid_days({ days: coupon.validDaysAfterIssue });
  if (coupon.endsAt) return m.coupon_until({ date: formatDate(coupon.endsAt) });
  return null;
}

export function couponKind(coupon: Pick<StorefrontCoupon, "kind">): string {
  return coupon.kind === "PRODUCT" ? m.coupon_kind_product() : m.coupon_kind_order();
}

/** 받기 시작 전이면 그 시각 */
export function couponOpensAt(
  coupon: Pick<StorefrontCoupon, "issueStartsAt">,
  now: Date,
): string | null {
  return coupon.issueStartsAt && new Date(coupon.issueStartsAt) > now
    ? m.coupon_open_at({ date: formatDateTime(coupon.issueStartsAt) })
    : null;
}
