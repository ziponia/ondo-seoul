import type { myCouponSchema, storefrontCouponSchema } from "@sayren/storefront-sdk";
import type { z } from "zod";
import { daysFromNow } from "./time";

type CouponInput = z.input<typeof storefrontCouponSchema>;
type MyCouponInput = z.input<typeof myCouponSchema>;

const ALL_PRODUCTS = {
  allProducts: true,
  includeProductIds: [],
  includeCategoryIds: [],
  excludeProductIds: [],
  excludeCategoryIds: [],
};

/** 받을 수 있는 쿠폰 — 받음 여부(`downloaded`·`downloadable`)는 회원 상태로 채운다 */
export const DEMO_COUPONS: Omit<CouponInput, "downloaded" | "downloadable" | "loginRequired">[] = [
  {
    couponId: "cpn_demo_welcome",
    name: "신규 가입 쿠폰",
    description: "첫 주문에 쓸 수 있습니다",
    kind: "ORDER",
    benefit: { type: "RATE", value: 15, maxDiscountAmount: 20000 },
    minOrderAmount: 0,
    stackWithInstantDiscount: true,
    target: ALL_PRODUCTS,
    startsAt: null,
    endsAt: null,
    validDaysAfterIssue: 7,
    perMemberIssueLimit: 1,
  },
  {
    couponId: "cpn_demo_outer",
    name: "겨울 아우터 기획전 쿠폰",
    description: null,
    kind: "PRODUCT",
    benefit: { type: "RATE", value: 10, maxDiscountAmount: 30000 },
    minOrderAmount: 0,
    stackWithInstantDiscount: true,
    target: { ...ALL_PRODUCTS, allProducts: false, includeCategoryIds: ["outer"] },
    startsAt: daysFromNow(-1),
    endsAt: daysFromNow(13),
    validDaysAfterIssue: null,
    remainingTodayCount: 128,
    perMemberIssueLimit: 1,
  },
  {
    couponId: "cpn_demo_cart",
    name: "장바구니 쿠폰",
    description: null,
    kind: "ORDER",
    benefit: { type: "AMOUNT", value: 5000, maxDiscountAmount: null },
    minOrderAmount: 50000,
    stackWithInstantDiscount: true,
    target: ALL_PRODUCTS,
    startsAt: null,
    endsAt: daysFromNow(13),
    validDaysAfterIssue: null,
    perMemberIssueLimit: 1,
  },
  {
    couponId: "cpn_demo_tiered",
    name: "많이 살수록 할인",
    description: null,
    kind: "ORDER",
    benefit: { type: "RATE", value: 5, maxDiscountAmount: null },
    reward: {
      type: "TIERED",
      tiers: [
        { minAmount: 100000, benefit: { type: "RATE", value: 5, maxDiscountAmount: null } },
        { minAmount: 200000, benefit: { type: "RATE", value: 10, maxDiscountAmount: null } },
        { minAmount: 300000, benefit: { type: "RATE", value: 15, maxDiscountAmount: null } },
      ],
    },
    minOrderAmount: 100000,
    stackWithInstantDiscount: true,
    target: ALL_PRODUCTS,
    startsAt: null,
    endsAt: daysFromNow(27),
    validDaysAfterIssue: null,
    perMemberIssueLimit: 1,
  },
  {
    couponId: "cpn_demo_point",
    name: "구매 확정 적립 쿠폰",
    description: null,
    kind: "ORDER",
    benefit: { type: "RATE", value: 3, maxDiscountAmount: 5000 },
    reward: { type: "POINT" },
    minOrderAmount: 0,
    stackWithInstantDiscount: true,
    target: ALL_PRODUCTS,
    startsAt: null,
    endsAt: daysFromNow(27),
    validDaysAfterIssue: null,
    perMemberIssueLimit: 1,
  },
  {
    couponId: "cpn_demo_socks",
    name: "양말 1+1 쿠폰",
    description: null,
    kind: "PRODUCT",
    benefit: { type: "RATE", value: 100, maxDiscountAmount: null },
    reward: { type: "BUY_X_GET_Y", buy: 1, get: 1 },
    minOrderAmount: 0,
    stackWithInstantDiscount: true,
    target: { ...ALL_PRODUCTS, allProducts: false, includeCategoryIds: ["acc"] },
    startsAt: daysFromNow(7),
    endsAt: daysFromNow(27),
    issueStartsAt: daysFromNow(7),
    validDaysAfterIssue: null,
    perMemberIssueLimit: 1,
  },
];

export function toMyCoupon(coupon: (typeof DEMO_COUPONS)[number], issuedAt: string): MyCouponInput {
  return {
    issueId: `iss_${coupon.couponId}`,
    couponId: coupon.couponId,
    name: coupon.name,
    description: coupon.description ?? null,
    kind: coupon.kind,
    benefit: coupon.benefit,
    reward: coupon.reward ?? null,
    minOrderAmount: coupon.minOrderAmount,
    status: "AVAILABLE",
    validFrom: issuedAt,
    validUntil: coupon.endsAt ?? null,
    usedOrderId: null,
    issuedAt,
    source: "DOWNLOAD",
  };
}

/** 쿠폰 번호 등록용 — 셀러가 나눠 준 번호로만 받는다(쿠폰존에 나오지 않는다). 데모 번호는 `ONDO-VIP-2026`(하이픈·대소문자 무시) */
export const DEMO_CODE_COUPONS: (Omit<
  CouponInput,
  "downloaded" | "downloadable" | "loginRequired"
> & { code: string })[] = [
  {
    code: "ONDOVIP2026",
    couponId: "cpn_demo_vip",
    name: "VIP 감사 쿠폰",
    description: null,
    kind: "ORDER",
    benefit: { type: "RATE", value: 20, maxDiscountAmount: 30000 },
    minOrderAmount: 0,
    stackWithInstantDiscount: true,
    target: ALL_PRODUCTS,
    startsAt: null,
    endsAt: daysFromNow(59),
    validDaysAfterIssue: null,
    perMemberIssueLimit: 1,
  },
];

/** 데모 기본 회원의 기간 지난 쿠폰 — 내 쿠폰의 「기간 만료」 탭을 보이려는 값 */
export const DEMO_EXPIRED_COUPON: (typeof DEMO_COUPONS)[number] = {
  couponId: "cpn_demo_autumn",
  name: "가을 아우터 쿠폰",
  description: null,
  kind: "PRODUCT",
  benefit: { type: "RATE", value: 10, maxDiscountAmount: 20000 },
  minOrderAmount: 0,
  stackWithInstantDiscount: true,
  target: { ...ALL_PRODUCTS, allProducts: false, includeCategoryIds: ["outer"] },
  startsAt: daysFromNow(-40),
  endsAt: daysFromNow(-10),
  validDaysAfterIssue: null,
  perMemberIssueLimit: 1,
};
