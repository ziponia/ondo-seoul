import {
  addressFromBook,
  applicableCoupons,
  bestCoupons,
  type CheckoutLine,
  type CouponApplicationInput,
  completePayment,
  type DemoCheckout,
  type DemoPayment,
  type DemoShippingAddress,
  deliveryOf,
  type FulfillmentMethod,
  findCheckout,
  findPayment,
  lineOf,
  type PaymentOptionInput,
  priceCheckout,
  retryDemoPayment,
  saveCheckout,
  startDemoPayment,
} from "../data/commerce";
import { DemoApiError, type DemoContext, type DemoRoute, route } from "../http";
import { requireMember } from "../member-state";
import { readLines } from "./cart";

/**
 * 데모 주문서·결제 — 결제창은 이 앱의 데모 결제 화면(`/demo-pay`)이 흉내 낸다.
 * 데모 결제 화면은 승인·거절·취소를 골라 `returnUrl`로 돌려보내고, 복귀 화면의 `payments.result()`가
 * 실제와 같은 승인(`confirm`)·실패 보고(`failure`)를 부른다.
 */

/** 해외 권역 결제수단 — 데모 상점은 PayPal 하나 */
const GLOBAL_PAYMENT_OPTIONS = [
  { pg: "paypal", method: "EASY_PAY", provider: "PAYPAL", label: "PayPal", pgName: "PayPal" },
] as const;

const optionsOf = (checkout: DemoCheckout) =>
  checkout.currency === "USD" ? GLOBAL_PAYMENT_OPTIONS : PAYMENT_OPTIONS;

const PAYMENT_OPTIONS = [
  {
    pg: "naverpay",
    method: "EASY_PAY",
    provider: "NAVERPAY",
    label: "네이버페이",
    pgName: "네이버페이",
  },
  {
    pg: "kakaopay",
    method: "EASY_PAY",
    provider: "KAKAOPAY",
    label: "카카오페이",
    pgName: "카카오페이",
  },
  {
    pg: "tosspayments",
    method: "EASY_PAY",
    provider: "TOSSPAY",
    label: "토스페이",
    pgName: "토스페이먼츠",
  },
  { pg: "portone", method: "EASY_PAY", provider: "PAYCO", label: "페이코", pgName: "포트원" },
  { pg: "tosspayments", method: "CARD", label: "카드 결제", pgName: "토스페이먼츠" },
  { pg: "tosspayments", method: "BANK_TRANSFER", label: "계좌이체", pgName: "토스페이먼츠" },
  { pg: "portone", method: "MOBILE", label: "휴대폰결제", pgName: "포트원" },
] as const;

export const DEMO_PICKUP_LOCATIONS = [
  {
    locationId: "loc_demo_seongsu",
    name: "ONDO 성수 플래그십",
    address: "서울특별시 성동구 연무장길 00",
    phone: "02-000-0000",
    hours: "매일 11:00 - 21:00",
  },
  {
    locationId: "loc_demo_hannam",
    name: "ONDO 한남 쇼룸",
    address: "서울특별시 용산구 이태원로 00",
    phone: "02-000-0001",
    hours: "화-일 12:00 - 20:00",
  },
  {
    locationId: "loc_demo_busan",
    name: "ONDO 부산 서면",
    address: "부산광역시 부산진구 전포대로 00",
    phone: "051-000-0000",
    hours: "매일 11:00 - 21:00",
  },
];

/** 장소별 재고 — 부산은 데모에서 재고가 없다(방문 수령 불가 표시를 보이려는 값) */
const pickupPurchasable = (locationId: string) => locationId !== "loc_demo_busan";

function checkoutOr404(ctx: DemoContext, checkoutId: string): DemoCheckout {
  const member = requireMember(ctx);
  const checkout = findCheckout(checkoutId);
  if (!checkout || checkout.member !== member) {
    throw new DemoApiError(404, "CHECKOUT_NOT_FOUND", "주문서를 찾을 수 없습니다");
  }
  return checkout;
}

function lineView(line: CheckoutLine) {
  return {
    lineId: line.lineId,
    productId: line.productId,
    productName: line.productName,
    optionId: line.optionId,
    optionName: line.optionName,
    thumbnailUrl: line.thumbnailUrl,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
    fulfillment: { type: "SHIPPING", requiresShipping: true, method: "CARRIER" },
    optionSelections: [],
    customInputs: line.customInputs,
  };
}

function checkoutView(checkout: DemoCheckout) {
  const pricing = priceCheckout(checkout, {});
  const { rewardPointAmount: _, ...amounts } = pricing.amounts;
  return {
    checkoutId: checkout.checkoutId,
    currency: checkout.currency,
    items: checkout.lines.map(lineView),
    amounts,
    points:
      checkout.currency !== "KRW"
        ? null
        : {
            enabled: true,
            balance: checkout.member.points,
            maxUsable: pricing.points.maxUsable,
            unit: 10,
            minAmount: 1000,
            minBalance: 0,
          },
    couponsEnabled: checkout.currency === "KRW",
    additionalPayment: false,
    orderPasswordRequired: false,
    memberOrder: true,
    delivery: deliveryOf(checkout),
    requiresShipping: checkout.method !== "PICKUP",
    expiresAt: new Date(checkout.createdAt + 30 * 60_000).toISOString(),
    paymentOptions: optionsOf(checkout),
    testPayment: true,
  };
}

function paymentStartView(ctx: DemoContext, payment: DemoPayment, returnUrl: string) {
  const { rewardPointAmount: _, ...amounts } = payment.pricing.amounts;
  const pending = payment.status === "pending";
  const pay = new URL("/demo-pay", ctx.origin);
  pay.searchParams.set("paymentId", payment.paymentId);
  pay.searchParams.set("attemptId", payment.attemptId);
  pay.searchParams.set("token", payment.callbackToken);
  pay.searchParams.set("returnUrl", returnUrl);
  pay.searchParams.set("amount", String(payment.pricing.amounts.totalAmount));
  pay.searchParams.set("currency", findCheckoutCurrency(payment));
  pay.searchParams.set("method", labelOf(payment.option));
  return {
    paymentId: payment.paymentId,
    status: payment.status,
    orderId: payment.orderId,
    orderNo: null,
    attemptId: pending ? payment.attemptId : null,
    option: payment.option,
    payUrl: pending ? pay.toString() : null,
    launch: null,
    expiresAt: payment.expiresAt,
    testPayment: true,
    amounts,
    delivery: payment.pricing.delivery,
  };
}

/** 결제의 통화 — 주문서가 결제 완료로 지워졌으면 기본 통화 */
function findCheckoutCurrency(payment: DemoPayment): string {
  return findCheckout(payment.checkoutId)?.currency ?? payment.currency ?? "KRW";
}

function statusView(payment: DemoPayment) {
  return {
    paymentId: payment.paymentId,
    status: payment.status,
    result: payment.result,
    orderId: payment.orderId,
    orderNo: null,
    lastFailure: payment.lastFailure,
    testPayment: true,
    expiresAt: payment.expiresAt,
  };
}

/** 결제수단 표기 이름 — 결제 시작 응답의 `option`과 주문서의 `paymentOptions` 라벨을 잇는다 */
export function labelOf(option: PaymentOptionInput | null): string {
  const found = [...PAYMENT_OPTIONS, ...GLOBAL_PAYMENT_OPTIONS].find(
    (o) =>
      o.pg === option?.pg &&
      o.method === option.method &&
      (!("provider" in o) || ("provider" in option && o.provider === option.provider)),
  );
  return found?.label ?? "";
}

function optionOr400(option: unknown): PaymentOptionInput {
  const wanted = option as PaymentOptionInput | undefined;
  const found = [...PAYMENT_OPTIONS, ...GLOBAL_PAYMENT_OPTIONS].find(
    (o) =>
      o.pg === wanted?.pg &&
      o.method === wanted.method &&
      (!("provider" in o) || ("provider" in wanted && o.provider === wanted.provider)),
  );
  if (!found)
    throw new DemoApiError(400, "PAYMENT_OPTION_UNAVAILABLE", "쓸 수 없는 결제수단입니다");
  const { label: _l, pgName: _p, ...value } = found;
  return value as PaymentOptionInput;
}

export const checkoutRoutes: DemoRoute[] = [
  route("GET", "/pickup-locations", ({ query }) =>
    DEMO_PICKUP_LOCATIONS.map((location) =>
      query.get("productId")
        ? { ...location, purchasable: pickupPurchasable(location.locationId) }
        : location,
    ),
  ),

  route("POST", "/checkout", ({ ctx, body }) => {
    const member = requireMember(ctx);
    const input = body as {
      cartItemIds?: string[];
      directItem?: {
        productId: string;
        optionId?: string;
        quantity: number;
        customInputs?: { inputId: string; value: string }[];
      };
      fulfillmentMethod?: FulfillmentMethod;
      pickupLocationId?: string;
    };
    let lines: CheckoutLine[];
    if (input.directItem) {
      const line = lineOf(ctx, input.directItem);
      lines = line ? [line] : [];
    } else {
      const wanted = new Set(input.cartItemIds ?? []);
      lines = readLines(ctx)
        .filter((l) => wanted.has(l.id))
        .flatMap((l) => {
          const line = lineOf(ctx, { ...l, cartItemId: l.id });
          return line ? [line] : [];
        });
    }
    if (lines.length === 0) throw new DemoApiError(400, "CHECKOUT_EMPTY", "주문할 상품이 없습니다");
    const method = input.fulfillmentMethod === "PICKUP" ? "PICKUP" : "CARRIER";
    if (method === "PICKUP") {
      const location = DEMO_PICKUP_LOCATIONS.find((l) => l.locationId === input.pickupLocationId);
      if (!location) {
        throw new DemoApiError(400, "PICKUP_LOCATION_REQUIRED", "픽업 매장을 선택해 주십시오");
      }
    }
    const checkout = saveCheckout(
      member,
      lines,
      method,
      method === "PICKUP" ? (input.pickupLocationId ?? null) : null,
      ctx.scenario === "global" ? "USD" : "KRW",
    );
    return checkoutView(checkout);
  }),

  route("GET", "/checkout/:id", ({ ctx, params }) => checkoutView(checkoutOr404(ctx, params.id))),

  route("POST", "/checkout/:id/delivery-quote", ({ ctx, params, body }) => {
    const checkout = checkoutOr404(ctx, params.id);
    const input = body as { zipCode?: string; postalCode?: string };
    const zipCode = input.zipCode ?? input.postalCode ?? null;
    const { amounts, delivery } = priceCheckout(checkout, { zipCode });
    const { rewardPointAmount: _, ...rest } = amounts;
    return { amounts: rest, delivery };
  }),

  route("POST", "/checkout/:id/pricing", ({ ctx, params, body }) => {
    const checkout = checkoutOr404(ctx, params.id);
    const input = body as {
      zipCode?: string;
      coupons: CouponApplicationInput[];
      pointAmount?: number;
    };
    const { delivery: _, ...pricing } = priceCheckout(checkout, input);
    return pricing;
  }),

  route("GET", "/checkout/:id/coupons", ({ ctx, params }) =>
    applicableCoupons(checkoutOr404(ctx, params.id)),
  ),

  route("GET", "/checkout/:id/best-coupons", ({ ctx, params }) => {
    const checkout = checkoutOr404(ctx, params.id);
    const applications = bestCoupons(checkout);
    const pricing = priceCheckout(checkout, { coupons: applications });
    return {
      applications,
      coupons: pricing.coupons
        .filter((c) => c.applied)
        .map((c) => ({
          couponId: c.couponId,
          issueId: c.issueId,
          name: c.name,
          kind: c.kind,
          discountAmount: c.discountAmount,
          lineId: c.lineId,
          needsDownload: false,
        })),
      discountAmount: pricing.amounts.couponDiscountAmount,
      totalAmount: pricing.amounts.totalAmount,
      withPoints: false,
    };
  }),

  route("POST", "/checkout/:id/payment", ({ ctx, params, body }) => {
    const checkout = checkoutOr404(ctx, params.id);
    const input = body as {
      option?: unknown;
      returnUrl: string;
      shippingAddress?: DemoShippingAddress & { addressId?: string; postalCode?: string };
      coupons?: CouponApplicationInput[];
      pointAmount?: number;
    };
    let address: DemoShippingAddress | null = null;
    if (checkout.method !== "PICKUP") {
      const saved = checkout.member.addresses.find(
        (a) => a.addressId === input.shippingAddress?.addressId,
      );
      if (saved)
        address = { ...addressFromBook(saved), deliveryMemo: input.shippingAddress?.deliveryMemo };
      else if (input.shippingAddress?.receiverName) {
        // 해외 주소는 우편번호 칸 이름이 `postalCode`다
        address = {
          ...input.shippingAddress,
          zipCode: input.shippingAddress.zipCode ?? input.shippingAddress.postalCode ?? "",
        };
      } else throw new DemoApiError(400, "SHIPPING_ADDRESS_REQUIRED", "배송지를 입력해 주십시오");
    }
    const pricing = priceCheckout(checkout, {
      zipCode: address?.zipCode,
      coupons: input.coupons,
      pointAmount: input.pointAmount,
    });
    const rejected = pricing.coupons.find((c) => !c.applied);
    if (rejected) throw new DemoApiError(400, "COUPON_NOT_APPLICABLE", "적용할 수 없는 쿠폰입니다");
    const payment = startDemoPayment(checkout, {
      option: pricing.paymentRequired ? optionOr400(input.option) : null,
      address,
      coupons: input.coupons ?? [],
      pointAmount: pricing.amounts.pointAmount,
      returnUrl: input.returnUrl,
    });
    return paymentStartView(ctx, payment, input.returnUrl);
  }),

  route("GET", "/payments/:id", ({ params }) => statusView(paymentOr404(params.id))),

  route("POST", "/payments/:id/attempts", ({ ctx, params, body }) => {
    const payment = paymentOr404(params.id);
    if (payment.status !== "pending") {
      throw new DemoApiError(409, "PAYMENT_ALREADY_COMPLETED", "이미 끝난 결제입니다");
    }
    const input = body as { option: unknown; returnUrl?: string };
    retryDemoPayment(payment, optionOr400(input.option));
    if (input.returnUrl) payment.returnUrl = input.returnUrl;
    return paymentStartView(ctx, payment, payment.returnUrl);
  }),

  route("POST", "/payments/:id/confirm", ({ params, body }) => {
    const payment = paymentOr404(params.id);
    const input = body as { attemptId: string; callbackToken: string };
    if (input.attemptId !== payment.attemptId || input.callbackToken !== payment.callbackToken) {
      throw new DemoApiError(403, "PAYMENT_TOKEN_MISMATCH", "결제 정보가 맞지 않습니다");
    }
    const order = completePayment(payment);
    return {
      orderId: order.orderId,
      status: "PAID",
      totalAmount: order.pricing.amounts.totalAmount,
      paidAt: order.paidAt,
    };
  }),

  route("POST", "/payments/:id/failure", ({ params, body }) => {
    const payment = paymentOr404(params.id);
    const input = body as {
      attemptId: string;
      callbackToken: string;
      category: string;
      code?: string;
      message?: string;
    };
    if (input.attemptId !== payment.attemptId || input.callbackToken !== payment.callbackToken) {
      throw new DemoApiError(403, "PAYMENT_TOKEN_MISMATCH", "결제 정보가 맞지 않습니다");
    }
    if (payment.status === "pending") {
      payment.result = input.category === "USER_CANCELED" ? "CANCELED" : "FAILED";
      payment.lastFailure = {
        attemptId: input.attemptId,
        category: input.category,
        code: input.code ?? null,
        message: input.message ?? null,
      };
    }
    return { paymentId: payment.paymentId, attemptId: input.attemptId, category: input.category };
  }),
];

function paymentOr404(paymentId: string): DemoPayment {
  const payment = findPayment(paymentId);
  if (!payment) throw new DemoApiError(404, "PAYMENT_NOT_FOUND", "결제를 찾을 수 없습니다");
  return payment;
}
