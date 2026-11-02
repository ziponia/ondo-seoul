import type { DemoContext } from "../http";
import type { DemoAddress, DemoMemberState } from "../member-state";
import {
  categoryAndDescendants,
  demoImageUrl,
  findDemoProduct,
  marketPrice,
  productName,
} from "./catalog";
import { DEMO_CODE_COUPONS, DEMO_COUPONS } from "./coupons";
import { toDetail } from "./product-detail";

/**
 * 데모 주문서·결제·주문 — 서버 메모리에 둔다(데모 dev 서버 한 대 전제). 금액 계산은 이 파일 한 곳에서 한다.
 * 실제 API의 금액 규칙을 흉내 낸 단순판이다: 상품 쿠폰(줄마다 하나) → 주문 쿠폰(하나) → 적립금 순으로 뺀다.
 */

export interface CheckoutLine {
  lineId: string;
  cartItemId: string | null;
  productId: string;
  productName: string;
  categoryId: string;
  freeShipping: boolean;
  optionId: string | null;
  optionName: string | null;
  thumbnailUrl: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customInputs: { label: string; value: string; key: string; type: string }[];
}

export type FulfillmentMethod = "CARRIER" | "PICKUP";

export interface DemoCheckout {
  checkoutId: string;
  member: DemoMemberState;
  lines: CheckoutLine[];
  method: FulfillmentMethod;
  pickupLocationId: string | null;
  zipCode: string | null;
  createdAt: number;
  /** 판매 권역 통화 — 해외 권역(USD)은 국제 배송비·PayPal만, 쿠폰·적립금 없음 */
  currency: "KRW" | "USD";
}

export interface CouponApplicationInput {
  issueId?: string;
  code?: string;
  optionId?: string;
  lineId?: string;
}

export interface DemoOrder {
  orderId: string;
  orderNo: string;
  orderedAt: string;
  paidAt: string;
  member: DemoMemberState;
  checkout: DemoCheckout;
  pricing: Pricing;
  option: PaymentOptionInput;
  address: DemoShippingAddress | null;
  paymentId: string;
  /** 주문상품(줄)마다의 진행 — 결제 직후는 PAID, 데모 기록은 배송·구매확정까지 다양하다 */
  lines: Record<string, LineState>;
}

export type ItemStatus =
  | "CANCELED"
  | "PAYMENT_WAITING"
  | "PAID"
  | "CONFIRMED"
  | "DISPATCHED"
  | "DELIVERING"
  | "DELIVERED"
  | "PURCHASE_DECIDED";

export interface LineState {
  status: ItemStatus;
  dispatchedAt?: string;
  deliveredAt?: string;
  decidedAt?: string;
}

export interface DemoClaim {
  claimId: string;
  claimNo: string;
  member: DemoMemberState;
  orderId: string;
  lineId: string;
  type: "RETURN" | "EXCHANGE" | "CANCEL";
  status: "REQUESTED" | "COLLECTING" | "COMPLETED" | "WITHDRAWN";
  reason: string;
  reasonDetail: string | null;
  quantity: number;
  expectedRefundAmount: number | null;
  requestedAt: string;
  completedAt: string | null;
}

export interface DemoReview {
  reviewId: string;
  member: DemoMemberState;
  orderId: string;
  lineId: string;
  productId: string;
  rating: number;
  content: string;
  images: string[];
  sellerReply: { content: string; repliedAt: string } | null;
  createdAt: string;
}

export interface DemoShippingAddress {
  countryCode?: string;
  city?: string;
  region?: string;
  receiverName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string | null;
  deliveryMemo?: string | null;
}

export type PaymentOptionInput =
  | { pg: string; method: "CARD" | "BANK_TRANSFER" | "VIRTUAL_ACCOUNT" | "MOBILE" }
  | { pg: string; method: "EASY_PAY"; provider: string };

export interface DemoPayment {
  paymentId: string;
  checkoutId: string;
  attemptId: string;
  callbackToken: string;
  status: "pending" | "completed";
  result: "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";
  option: PaymentOptionInput | null;
  pricing: Pricing;
  address: DemoShippingAddress | null;
  coupons: CouponApplicationInput[];
  orderId: string | null;
  lastFailure: {
    attemptId: string;
    category: string;
    code: string | null;
    message: string | null;
  } | null;
  expiresAt: string;
  returnUrl: string;
  currency: "KRW" | "USD";
}

// dev 서버가 코드를 고쳐 모듈을 다시 읽어도 데모 상태가 남도록 globalThis에 둔다
interface CommerceStore {
  checkouts: Map<string, DemoCheckout>;
  payments: Map<string, DemoPayment>;
  orders: Map<string, DemoOrder>;
  claims: Map<string, DemoClaim>;
  reviews: Map<string, DemoReview>;
  consumed: Set<string>;
}
const holder = globalThis as { __ondoDemoCommerce?: Partial<CommerceStore> };
const kept = holder.__ondoDemoCommerce ?? {};
// 저장소 모양이 바뀌어도(필드 추가) 남은 값은 두고 빠진 것만 만든다
const store: CommerceStore = {
  checkouts: kept.checkouts ?? new Map(),
  payments: kept.payments ?? new Map(),
  orders: kept.orders ?? new Map(),
  claims: kept.claims ?? new Map(),
  reviews: kept.reviews ?? new Map(),
  consumed: kept.consumed ?? new Set(),
};
holder.__ondoDemoCommerce = store;

const { checkouts, payments, orders } = store;
export const demoOrders = store.orders;
export const demoClaims = store.claims;
export const demoReviews = store.reviews;
/** 주문으로 넘어간 장바구니 줄 — 장바구니 토큰은 브라우저 쿠키라 서버가 지우지 못해 여기서 거른다 */
export const consumedCartItems = store.consumed;

export const id = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;

/** 상품·옵션으로 주문서 줄을 만든다 — 금액은 데모 상품 가격이 원천이다 */
export function lineOf(
  ctx: DemoContext,
  input: {
    productId: string;
    optionId?: string | null;
    quantity: number;
    cartItemId?: string | null;
    customInputs?: { inputId: string; value: string }[];
  },
): CheckoutLine | null {
  const product = findDemoProduct(input.productId);
  if (!product) return null;
  const detail = toDetail(ctx, product);
  const variant = detail.variants.find((v) => v.variantId === input.optionId) ?? detail.variants[0];
  const price = marketPrice(ctx, product);
  const unitPrice = (price.discounted ?? price.sale) + (variant?.additionalPrice ?? 0);
  const inputs = (input.customInputs ?? []).flatMap((entry) => {
    const def = detail.customInputs?.find((c) => c.inputId === entry.inputId);
    return def
      ? [{ label: def.label, value: entry.value, key: def.inputId, type: def.type ?? "TEXT" }]
      : [];
  });
  return {
    lineId: id("line"),
    cartItemId: input.cartItemId ?? null,
    productId: product.id,
    productName: productName(ctx, product),
    categoryId: product.categoryId,
    freeShipping: product.freeShipping,
    optionId: variant?.variantId ?? null,
    optionName: variant?.name || null,
    thumbnailUrl: demoImageUrl(ctx, product.image),
    quantity: input.quantity,
    unitPrice,
    totalPrice: unitPrice * input.quantity,
    customInputs: inputs,
  };
}

export function saveCheckout(
  member: DemoMemberState,
  lines: CheckoutLine[],
  method: FulfillmentMethod,
  pickupLocationId: string | null,
  currency: "KRW" | "USD" = "KRW",
): DemoCheckout {
  const checkout: DemoCheckout = {
    checkoutId: id("chk"),
    member,
    lines,
    method,
    pickupLocationId,
    zipCode:
      currency === "KRW" ? (member.addresses.find((a) => a.isDefault)?.zipCode ?? null) : null,
    createdAt: Date.now(),
    currency,
  };
  checkouts.set(checkout.checkoutId, checkout);
  return checkout;
}

export const findCheckout = (checkoutId: string) => checkouts.get(checkoutId);
export const findPayment = (paymentId: string) => payments.get(paymentId);
/** dev 서버에서 모양이 바뀌기 전에 만든 주문 — 줄 상태가 없으면 결제 완료로 채운다 */
function normalize(order: DemoOrder | undefined): DemoOrder | undefined {
  if (order && !order.lines) {
    order.lines = Object.fromEntries(
      order.checkout.lines.map((l) => [l.lineId, { status: "PAID" as const }]),
    );
  }
  return order;
}
export const findOrder = (orderId: string) => normalize(orders.get(orderId));
export const ordersOf = (member: DemoMemberState) =>
  [...orders.values()]
    .filter((order) => order.member === member)
    .map((order) => normalize(order) as DemoOrder);

// ── 배송비 ──────────────────────────────────────────────

const BASE_FEE = 3000;
const FREE_THRESHOLD = 50000;
const JEJU_SURCHARGE = 3000;

function remoteAreaOf(zipCode: string | null) {
  // 제주 우편번호는 63으로 시작한다(도서 산간은 데모에서 다루지 않는다)
  return zipCode?.startsWith("63") ? ("JEJU" as const) : ("NONE" as const);
}

/** 해외 배송비 — 데모 상점의 국제 배송 한 건 18달러(센트) */
const INTERNATIONAL_FEE = 1800;

export function deliveryOf(checkout: DemoCheckout, zipCode = checkout.zipCode) {
  if (checkout.currency === "USD") {
    return {
      baseFee: INTERNATIONAL_FEE,
      remoteSurcharge: 0,
      remoteArea: "NONE" as const,
      remoteAreaLabel: null,
      bundleCount: 1,
      freeByThreshold: false,
      zipCode,
    };
  }
  const productAmount = sum(checkout.lines.map((l) => l.totalPrice));
  const pickup = checkout.method === "PICKUP";
  const freeByThreshold = productAmount >= FREE_THRESHOLD;
  const allFree = checkout.lines.every((l) => l.freeShipping);
  const baseFee = pickup || allFree || freeByThreshold ? 0 : BASE_FEE;
  const remoteArea = pickup ? "NONE" : remoteAreaOf(zipCode);
  const remoteSurcharge = remoteArea === "JEJU" ? JEJU_SURCHARGE : 0;
  return {
    baseFee,
    remoteSurcharge,
    remoteArea,
    remoteAreaLabel: remoteArea === "JEJU" ? "제주" : null,
    bundleCount: 1,
    freeByThreshold: !pickup && freeByThreshold,
    zipCode,
  };
}

// ── 쿠폰·적립금 ──────────────────────────────────────────

type Coupon = (typeof DEMO_COUPONS)[number];

/** 이 회원이 지금 쓸 수 있는 발급 쿠폰 */
export function issuedCoupons(member: DemoMemberState): (Coupon & { issueId: string })[] {
  return [...DEMO_COUPONS, ...DEMO_CODE_COUPONS]
    .filter(
      (c) =>
        member.downloadedCoupons.has(c.couponId) &&
        !member.usedCoupons.has(c.couponId) &&
        c.reward?.type !== "BUY_X_GET_Y",
    )
    .map((c) => ({ ...c, issueId: `iss_${c.couponId}` }));
}

function eligibleLine(coupon: Coupon, line: CheckoutLine): boolean {
  const target = coupon.target;
  if (target.allProducts) return true;
  return target.includeCategoryIds.some((cid) =>
    categoryAndDescendants(cid).includes(line.categoryId),
  );
}

/** 쿠폰 하나의 할인(또는 적립) — 10원 미만은 버린다 */
function benefitOf(coupon: Coupon, base: number): { discount: number; reward: number } {
  let benefit = coupon.benefit;
  if (coupon.reward?.type === "TIERED") {
    const tier = [...(coupon.reward.tiers ?? [])]
      .filter((t) => base >= t.minAmount)
      .sort((a, b) => b.minAmount - a.minAmount)[0];
    if (!tier) return { discount: 0, reward: 0 };
    benefit = tier.benefit;
  }
  const raw =
    benefit.type === "RATE" ? Math.floor((base * benefit.value) / 100 / 10) * 10 : benefit.value;
  const amount = Math.min(raw, benefit.maxDiscountAmount ?? Number.POSITIVE_INFINITY, base);
  return coupon.reward?.type === "POINT"
    ? { discount: 0, reward: amount }
    : { discount: amount, reward: 0 };
}

const POINT_MIN = 1000;
const POINT_UNIT = 10;
const EARN_RATE = 0.01;

export interface Pricing {
  amounts: {
    productAmount: number;
    deliveryFee: number;
    couponDiscountAmount: number;
    deliveryDiscountAmount: number;
    pointAmount: number;
    totalAmount: number;
    rewardPointAmount: number;
  };
  coupons: {
    couponId: string;
    issueId: string | null;
    code: string | null;
    name: string;
    kind: string;
    benefit: Coupon["benefit"];
    reward: NonNullable<Coupon["reward"]> | null;
    applied: boolean;
    discountAmount: number;
    rewardPoint: number;
    rejectReason: string | null;
    optionId: string | null;
    lineId: string | null;
  }[];
  items: {
    lineId: string;
    optionId: string | null;
    couponDiscountAmount: number;
    pointAllocation: number;
  }[];
  points: {
    balance: number;
    maxUsable: number;
    adjustReason: string | null;
    rejectReason: string | null;
  };
  payable: boolean;
  paymentRequired: boolean;
  delivery: ReturnType<typeof deliveryOf>;
}

export function priceCheckout(
  checkout: DemoCheckout,
  input: { zipCode?: string | null; coupons?: CouponApplicationInput[]; pointAmount?: number },
): Pricing {
  const { member, lines } = checkout;
  const delivery = deliveryOf(checkout, input.zipCode ?? checkout.zipCode);
  const deliveryFee = delivery.baseFee + delivery.remoteSurcharge;
  const productAmount = sum(lines.map((l) => l.totalPrice));
  const issued = checkout.currency === "KRW" ? issuedCoupons(member) : [];
  const lineDiscount = new Map<string, number>();
  const results: Pricing["coupons"] = [];
  const used = new Set<string>();
  let orderCouponUsed = false;
  let reward = 0;

  const ordered = [...(input.coupons ?? [])].sort((a, b) => {
    const kind = (x: CouponApplicationInput) =>
      issued.find((c) => c.issueId === x.issueId)?.kind === "PRODUCT" ? 0 : 1;
    return kind(a) - kind(b);
  });
  for (const application of ordered) {
    const coupon = issued.find((c) => c.issueId === application.issueId);
    const view = (
      fields: Partial<Pricing["coupons"][number]> & { rejectReason: string | null },
    ) => {
      results.push({
        couponId: coupon?.couponId ?? "",
        issueId: application.issueId ?? null,
        code: application.code ?? null,
        name: coupon?.name ?? "",
        kind: coupon?.kind ?? "ORDER",
        benefit: coupon?.benefit ?? { type: "AMOUNT", value: 0, maxDiscountAmount: null },
        reward: coupon?.reward ?? null,
        applied: fields.rejectReason === null,
        discountAmount: 0,
        rewardPoint: 0,
        optionId: null,
        lineId: null,
        ...fields,
      });
    };
    if (!coupon) {
      view({ rejectReason: "COUPON_NOT_FOUND" });
      continue;
    }
    if (used.has(coupon.issueId)) {
      view({ rejectReason: "DUPLICATED" });
      continue;
    }
    if (coupon.kind === "PRODUCT") {
      const line =
        lines.find((l) => l.lineId === application.lineId) ??
        lines.find((l) => !lineDiscount.has(l.lineId) && eligibleLine(coupon, l));
      if (!line || !eligibleLine(coupon, line)) {
        view({ rejectReason: "NOT_APPLICABLE_PRODUCT" });
        continue;
      }
      if (lineDiscount.has(line.lineId)) {
        view({ rejectReason: "LINE_ALREADY_DISCOUNTED", lineId: line.lineId });
        continue;
      }
      const { discount, reward: point } = benefitOf(coupon, line.totalPrice);
      lineDiscount.set(line.lineId, discount);
      reward += point;
      used.add(coupon.issueId);
      view({
        rejectReason: null,
        discountAmount: discount,
        rewardPoint: point,
        lineId: line.lineId,
        optionId: line.optionId,
      });
      continue;
    }
    const base = productAmount - sum([...lineDiscount.values()]);
    if (orderCouponUsed) {
      view({ rejectReason: "ORDER_COUPON_LIMIT" });
      continue;
    }
    if (base < coupon.minOrderAmount) {
      view({ rejectReason: "MIN_ORDER_AMOUNT_NOT_MET" });
      continue;
    }
    const { discount, reward: point } = benefitOf(coupon, base);
    orderCouponUsed = true;
    reward += point;
    used.add(coupon.issueId);
    view({ rejectReason: null, discountAmount: discount, rewardPoint: point });
  }

  const productCouponTotal = sum([...lineDiscount.values()]);
  const orderCouponTotal = sum(
    results.filter((r) => r.applied && r.kind === "ORDER").map((r) => r.discountAmount),
  );
  const couponDiscountAmount = productCouponTotal + orderCouponTotal;
  const beforePoints = productAmount + deliveryFee - couponDiscountAmount;

  const maxUsable = Math.max(
    0,
    checkout.currency === "KRW"
      ? Math.floor(Math.min(member.points, beforePoints) / POINT_UNIT) * POINT_UNIT
      : 0,
  );
  let pointAmount = input.pointAmount ?? 0;
  let adjustReason: string | null = null;
  let rejectReason: string | null = null;
  if (pointAmount > 0 && pointAmount < POINT_MIN) {
    rejectReason = "BELOW_MIN_AMOUNT";
    pointAmount = 0;
  } else if (pointAmount > maxUsable) {
    adjustReason = "EXCEEDS_MAX_USABLE";
    pointAmount = maxUsable;
  } else if (pointAmount % POINT_UNIT !== 0) {
    adjustReason = "UNIT";
    pointAmount -= pointAmount % POINT_UNIT;
  }
  const totalAmount = beforePoints - pointAmount;

  // 주문 쿠폰·적립금은 줄 금액 비율로 나누고 끝전은 마지막 줄에 둔다
  const afterProduct = lines.map((l) => l.totalPrice - (lineDiscount.get(l.lineId) ?? 0));
  const orderShare = prorate(orderCouponTotal, afterProduct);
  const pointShare = prorate(
    pointAmount,
    afterProduct.map((a, i) => a - orderShare[i]),
  );
  return {
    amounts: {
      productAmount,
      deliveryFee,
      couponDiscountAmount,
      deliveryDiscountAmount: 0,
      pointAmount,
      totalAmount,
      rewardPointAmount:
        checkout.currency === "KRW" ? Math.floor(totalAmount * EARN_RATE) + reward : 0,
    },
    coupons: results,
    items: lines.map((l, i) => ({
      lineId: l.lineId,
      optionId: l.optionId,
      couponDiscountAmount: (lineDiscount.get(l.lineId) ?? 0) + orderShare[i],
      pointAllocation: pointShare[i],
    })),
    points: { balance: member.points, maxUsable, adjustReason, rejectReason },
    payable: totalAmount === 0 || totalAmount >= 100,
    paymentRequired: totalAmount > 0,
    delivery,
  };
}

/** 줄마다 가장 큰 상품 쿠폰, 그 뒤 가장 큰 주문 쿠폰 — 적립 쿠폰은 할인이 아니라 고르지 않는다 */
export function bestCoupons(checkout: DemoCheckout): CouponApplicationInput[] {
  if (checkout.currency !== "KRW") return [];
  const issued = issuedCoupons(checkout.member);
  const picked: CouponApplicationInput[] = [];
  const taken = new Set<string>();
  for (const line of checkout.lines) {
    const best = issued
      .filter((c) => c.kind === "PRODUCT" && !taken.has(c.issueId) && eligibleLine(c, line))
      .map((c) => ({ c, d: benefitOf(c, line.totalPrice).discount }))
      .sort((a, b) => b.d - a.d)[0];
    if (best && best.d > 0) {
      taken.add(best.c.issueId);
      picked.push({ issueId: best.c.issueId, lineId: line.lineId });
    }
  }
  const { productAmount: base, couponDiscountAmount: productDiscount } = priceCheckout(checkout, {
    coupons: picked,
  }).amounts;
  const order = issued
    .filter((c) => c.kind === "ORDER" && base - productDiscount >= c.minOrderAmount)
    .map((c) => ({ c, d: benefitOf(c, base - productDiscount).discount }))
    .sort((a, b) => b.d - a.d)[0];
  if (order && order.d > 0) picked.push({ issueId: order.c.issueId });
  return picked;
}

export function applicableCoupons(checkout: DemoCheckout) {
  if (checkout.currency !== "KRW") return [];
  const productAmount = sum(checkout.lines.map((l) => l.totalPrice));
  return issuedCoupons(checkout.member).map((coupon) => {
    const expected =
      coupon.kind === "PRODUCT"
        ? Math.max(
            0,
            ...checkout.lines
              .filter((l) => eligibleLine(coupon, l))
              .map((l) => benefitOf(coupon, l.totalPrice).discount),
          )
        : benefitOf(coupon, productAmount).discount;
    const eligible =
      coupon.kind === "PRODUCT"
        ? checkout.lines.some((l) => eligibleLine(coupon, l))
        : productAmount >= coupon.minOrderAmount;
    const rejectReason = eligible
      ? null
      : coupon.kind === "PRODUCT"
        ? "NOT_APPLICABLE_PRODUCT"
        : "MIN_ORDER_AMOUNT_NOT_MET";
    return {
      issueId: coupon.issueId,
      couponId: coupon.couponId,
      name: coupon.name,
      description: coupon.description ?? null,
      kind: coupon.kind,
      benefit: coupon.benefit,
      reward: coupon.reward ?? null,
      minOrderAmount: coupon.minOrderAmount,
      requirements: [],
      validUntil: coupon.endsAt ?? null,
      applicable: eligible,
      expectedDiscountAmount: eligible ? expected : 0,
      rejectReason,
    };
  });
}

// ── 결제 ────────────────────────────────────────────────

export function startDemoPayment(
  checkout: DemoCheckout,
  input: {
    option: PaymentOptionInput | null;
    address: DemoShippingAddress | null;
    coupons: CouponApplicationInput[];
    pointAmount: number;
    returnUrl: string;
  },
): DemoPayment {
  const pricing = priceCheckout(checkout, {
    zipCode: input.address?.zipCode ?? checkout.zipCode,
    coupons: input.coupons,
    pointAmount: input.pointAmount,
  });
  const payment: DemoPayment = {
    paymentId: id("pay"),
    checkoutId: checkout.checkoutId,
    attemptId: id("att"),
    callbackToken: id("cbt"),
    status: "pending",
    result: "PENDING",
    option: input.option,
    pricing,
    address: input.address,
    coupons: input.coupons,
    orderId: null,
    lastFailure: null,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    returnUrl: input.returnUrl,
    currency: checkout.currency,
  };
  payments.set(payment.paymentId, payment);
  if (!pricing.paymentRequired) completePayment(payment);
  return payment;
}

export function retryDemoPayment(payment: DemoPayment, option: PaymentOptionInput) {
  payment.option = option;
  payment.attemptId = id("att");
  payment.callbackToken = id("cbt");
  payment.result = "PENDING";
  return payment;
}

/** 승인 — 주문을 만들고 쿠폰·적립금을 쓴다. 두 번 불려도 주문은 하나다 */
export function completePayment(payment: DemoPayment): DemoOrder {
  const existing = payment.orderId ? orders.get(payment.orderId) : undefined;
  if (existing) return existing;
  const checkout = checkouts.get(payment.checkoutId);
  if (!checkout) throw new Error("checkout gone");
  const now = new Date();
  // 실제 번호 체계처럼 연월 4자리 + 숫자 10자리(14자리)다 — 표기는 SDK `formatOrderNo`가 한다
  const yymm = now.toISOString().slice(2, 7).replace("-", "");
  const digits = String(Date.now()).slice(-8) + String(orders.size + 1).padStart(2, "0");
  const order: DemoOrder = {
    orderId: id("ord"),
    orderNo: `${yymm}${digits}`,
    orderedAt: now.toISOString(),
    paidAt: now.toISOString(),
    member: checkout.member,
    checkout,
    pricing: payment.pricing,
    option: payment.option ?? { pg: "tosspayments", method: "CARD" },
    address: payment.address,
    paymentId: payment.paymentId,
    lines: Object.fromEntries(checkout.lines.map((l) => [l.lineId, { status: "PAID" as const }])),
  };
  orders.set(order.orderId, order);
  payment.orderId = order.orderId;
  payment.status = "completed";
  payment.result = "COMPLETED";
  for (const c of payment.pricing.coupons)
    if (c.applied) checkout.member.usedCoupons.add(c.couponId);
  checkout.member.points -= payment.pricing.amounts.pointAmount;
  checkout.member.orders.push(order.orderId);
  for (const line of checkout.lines) if (line.cartItemId) consumedCartItems.add(line.cartItemId);
  checkouts.delete(checkout.checkoutId);
  // 결제가 끝난 주문서는 다시 열지 못한다 — 같은 객체는 주문이 계속 들고 있다
  return order;
}

export function addressFromBook(address: DemoAddress): DemoShippingAddress {
  return {
    receiverName: address.receiverName,
    phone: address.phone,
    zipCode: address.zipCode,
    address1: address.address1,
    address2: address.address2,
  };
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function prorate(total: number, weights: number[]): number[] {
  const base = sum(weights);
  if (total === 0 || base <= 0) return weights.map(() => 0);
  const shares = weights.map((w) => Math.floor((total * w) / base));
  shares[shares.length - 1] += total - sum(shares);
  return shares;
}
