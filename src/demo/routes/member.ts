import { demoImageUrl, findDemoProduct, toCard } from "../data/catalog";
import {
  type CheckoutLine,
  type DemoClaim,
  type DemoOrder,
  demoClaims,
  demoReviews,
  findOrder,
  id,
  type LineState,
  ordersOf,
} from "../data/commerce";
import { DEMO_CODE_COUPONS, DEMO_COUPONS, DEMO_EXPIRED_COUPON, toMyCoupon } from "../data/coupons";
import { daysFromNow } from "../data/time";
import { DemoApiError, type DemoContext, DemoResponse, type DemoRoute, route } from "../http";
import { type DemoAddress, type DemoMemberState, requireMember } from "../member-state";
import { DEMO_PICKUP_LOCATIONS } from "./checkout";

/**
 * 데모 회원 API — 주문·배송·구매확정, 취소·교환·반품, 적립금, 쿠폰, 찜, 리뷰, 상품 문의, 1:1 문의, 회원 정보·동의·배송지.
 * 지난 기록은 `data/history.ts`가 데모 기본 회원에게 채운다.
 */

const PAYMENT_METHOD = {
  CARD: "CARD",
  EASY_PAY: "EASY_PAY",
  BANK_TRANSFER: "BANK_TRANSFER",
  VIRTUAL_ACCOUNT: "VIRTUAL_ACCOUNT",
  MOBILE: "MOBILE",
} as const;

const CARRIER = "CJ대한통운";
const TRACKING_NO = "686912345678";
const RETURN_DAYS = 7;
const REVIEW_DAYS = 30;

function page<T>(items: T[], query: URLSearchParams) {
  const pageNo = Math.max(1, Number(query.get("page") ?? 1));
  const size = Math.max(1, Number(query.get("size") ?? 20));
  return {
    page: pageNo,
    size,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    contents: items.slice((pageNo - 1) * size, pageNo * size),
  };
}

const plusDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();

function claimOfLine(lineId: string): DemoClaim | undefined {
  return [...demoClaims.values()]
    .filter((c) => c.lineId === lineId && c.status !== "WITHDRAWN")
    .at(-1);
}

const reviewOfLine = (lineId: string) => [...demoReviews.values()].find((r) => r.lineId === lineId);

function deliveryOf(state: LineState) {
  if (!state.dispatchedAt) return undefined;
  return {
    carrierName: CARRIER,
    trackingNumber: TRACKING_NO,
    trackingUrl: `https://trace.cjlogistics.com/next/tracking.html?wblNo=${TRACKING_NO}`,
    dispatchedAt: state.dispatchedAt,
  };
}

const STEP_LABEL: Record<string, string> = {
  PAYMENT_WAITING: "입금 대기",
  PAID: "결제 완료",
  CONFIRMED: "상품 준비",
  DISPATCHED: "배송 중",
  DELIVERING: "배송 중",
  DELIVERED: "배송 완료",
  PURCHASE_DECIDED: "구매 확정",
  CANCELED: "취소",
};

const CLAIM_LABEL = { CANCEL: "취소", RETURN: "반품", EXCHANGE: "교환" } as const;

function stepOf(state: LineState, claim: DemoClaim | undefined) {
  const delivery = deliveryOf(state);
  const data = delivery ? { data: { delivery } } : {};
  if (claim && claim.status !== "COMPLETED") {
    return {
      type: "CLAIM_IN_PROGRESS",
      label: `${CLAIM_LABEL[claim.type]} 접수`,
      actions: [],
      claimable: [],
      ...data,
    };
  }
  switch (state.status) {
    case "PAID":
    case "CONFIRMED":
      return {
        type: "SELLER_PROCESSING",
        label: STEP_LABEL[state.status] ?? "",
        actions: [],
        claimable: [{ action: "CANCEL" as const }],
      };
    case "DISPATCHED":
    case "DELIVERING":
      return { type: "IN_DELIVERY", label: "배송 중", actions: [], claimable: [], ...data };
    case "DELIVERED": {
      const until = plusDays(state.deliveredAt ?? new Date().toISOString(), RETURN_DAYS);
      return {
        type: "DELIVERED",
        label: "배송 완료",
        actions: [],
        claimable: [
          { action: "RETURN_REQUEST" as const, until },
          { action: "EXCHANGE_REQUEST" as const, until },
        ],
        ...data,
      };
    }
    case "PURCHASE_DECIDED":
      return { type: "COMPLETED", label: "구매 확정", actions: [], claimable: [], ...data };
    default:
      return { type: "CANCELED", label: "취소 완료", actions: [], claimable: [] };
  }
}

function itemView(order: DemoOrder, line: CheckoutLine) {
  const { checkout, pricing } = order;
  const state = order.lines[line.lineId] ?? { status: "PAID" as const };
  const share = pricing.items.find((i) => i.lineId === line.lineId);
  const pickup = DEMO_PICKUP_LOCATIONS.find((l) => l.locationId === checkout.pickupLocationId);
  const claim = claimOfLine(line.lineId);
  const review = reviewOfLine(line.lineId);
  const deliveredAt = state.deliveredAt;
  const reviewWindow =
    deliveredAt !== undefined &&
    Date.now() < new Date(plusDays(deliveredAt, REVIEW_DAYS)).getTime();
  return {
    orderItemId: `oi_${line.lineId}`,
    orderItemNo: `${order.orderNo}${String(checkout.lines.indexOf(line) + 1).padStart(2, "0")}`,
    productId: line.productId,
    productName: line.productName,
    thumbnailUrl: line.thumbnailUrl,
    optionName: line.optionName,
    quantity: line.quantity,
    canceledQuantity: state.status === "CANCELED" ? line.quantity : 0,
    activeQuantity: state.status === "CANCELED" ? 0 : line.quantity,
    totalPrice: line.totalPrice,
    couponDiscountAmount: share?.couponDiscountAmount ?? 0,
    pointAllocation: share?.pointAllocation ?? 0,
    status: state.status,
    fulfillmentSnapshot: {
      type: "SHIPPING" as const,
      requiresShipping: true as const,
      method: checkout.method,
      ...(pickup ? { pickupLocation: pickup } : {}),
    },
    fulfillment: null,
    claimStatus: claim ? claim.status : null,
    reviewWritten: review !== undefined,
    reviewWritable:
      review === undefined &&
      (claim === undefined || claim.status === "WITHDRAWN") &&
      reviewWindow &&
      (state.status === "DELIVERED" || state.status === "PURCHASE_DECIDED"),
    autoDecisionDate:
      state.status === "DELIVERED" && deliveredAt ? plusDays(deliveredAt, RETURN_DAYS) : null,
    optionSelections: [],
    customInputs: line.customInputs,
    step: stepOf(state, claim),
  };
}

export function orderView(order: DemoOrder) {
  const { checkout, pricing } = order;
  const items = checkout.lines.map((line) => itemView(order, line));
  const active = items.find((i) => i.status !== "CANCELED") ?? items[0];
  return {
    orderId: order.orderId,
    orderNo: order.orderNo,
    orderedAt: order.orderedAt,
    items,
    requiresShipping: checkout.method !== "PICKUP",
    shippingAddress: order.address
      ? {
          receiverName: order.address.receiverName,
          phone: order.address.phone,
          zipCode: order.address.zipCode,
          ...(order.address.countryCode
            ? {
                countryCode: order.address.countryCode,
                city: order.address.city ?? null,
                region: order.address.region ?? null,
              }
            : {}),
          address1: order.address.address1,
          address2: order.address.address2 ?? null,
          deliveryMemo: order.address.deliveryMemo ?? null,
        }
      : {
          receiverName: order.member.name,
          phone: order.member.phone ?? "",
          zipCode: "",
          address1: "",
        },
    payment: {
      method: PAYMENT_METHOD[order.option.method],
      easyPayProvider: "provider" in order.option ? order.option.provider : null,
      couponDiscountAmount: pricing.amounts.couponDiscountAmount,
      deliveryDiscountAmount: 0,
      pointAmount: pricing.amounts.pointAmount,
      discounts: pricing.coupons
        .filter((c) => c.applied && c.discountAmount > 0)
        .map((c) => ({
          couponId: c.couponId,
          name: c.name,
          kind: c.kind,
          discountAmount: c.discountAmount,
        })),
      totalAmount: pricing.amounts.totalAmount,
      paidAt: order.paidAt,
      receiptUrl: null,
      refundedAmount: [...demoClaims.values()]
        .filter((c) => c.orderId === order.orderId && c.status === "COMPLETED")
        .reduce((sum, c) => sum + (c.expectedRefundAmount ?? 0), 0),
      refundPendingAmount: 0,
      pointRefundedAmount: 0,
    },
    testPayment: true,
    payments: [
      {
        paymentId: order.paymentId,
        additional: false,
        amount: pricing.amounts.totalAmount,
        approvedMethod: PAYMENT_METHOD[order.option.method],
        easyPayProvider: "provider" in order.option ? order.option.provider : null,
        paidAt: order.paidAt,
        refundedAmount: 0,
      },
    ],
    progressStatus: active?.status,
    currency: order.checkout.currency ?? "KRW",
  };
}

function orderOr404(ctx: DemoContext, orderId: string): DemoOrder {
  const member = requireMember(ctx);
  const order = findOrder(orderId);
  if (!order || order.member !== member) {
    throw new DemoApiError(404, "ORDER_NOT_FOUND", "주문을 찾을 수 없습니다");
  }
  return order;
}

/** 주문상품 id(`oi_{lineId}`)로 주문과 줄을 찾는다 */
function lineOr404(ctx: DemoContext, orderItemId: string) {
  const member = requireMember(ctx);
  const lineId = orderItemId.replace(/^oi_/, "");
  for (const order of ordersOf(member)) {
    const line = order.checkout.lines.find((l) => l.lineId === lineId);
    if (line) return { member, order, line, state: order.lines[lineId] as LineState };
  }
  throw new DemoApiError(404, "ORDER_ITEM_NOT_FOUND", "주문상품을 찾을 수 없습니다");
}

const ORDER_STATUS_FILTER: Record<string, string[]> = {
  PAID: ["PAID"],
  CONFIRMED: ["PAID", "CONFIRMED"],
  DISPATCHED: ["DISPATCHED", "DELIVERING"],
  DELIVERING: ["DISPATCHED", "DELIVERING"],
  DELIVERED: ["DELIVERED"],
  PURCHASE_DECIDED: ["PURCHASE_DECIDED"],
  CANCELED: ["CANCELED"],
};

function claimView(claim: DemoClaim) {
  const order = findOrder(claim.orderId);
  const line = order?.checkout.lines.find((l) => l.lineId === claim.lineId);
  return {
    claimId: claim.claimId,
    claimNo: claim.claimNo,
    type: claim.type,
    status: claim.status,
    orderItemId: `oi_${claim.lineId}`,
    productName: line?.productName ?? "",
    quantity: claim.quantity,
    reason: claim.reason,
    expectedRefundAmount: claim.expectedRefundAmount,
    expectedDeliveryFeeRefundAmount: null,
    expectedPointRefundAmount: 0,
    rejectReason: null,
    returnAddress:
      claim.type === "CANCEL"
        ? null
        : {
            name: "ONDO SEOUL 물류센터",
            contactName: "ONDO SEOUL",
            phone: "0200000000",
            zipCode: "04780",
            address1: "서울특별시 성동구 성수일로 00",
            address2: null,
          },
    requestedAt: claim.requestedAt,
    completedAt: claim.completedAt,
  };
}

function claimPreview(
  line: CheckoutLine,
  input: { type: "RETURN" | "EXCHANGE" | "CANCEL"; reason: string },
) {
  // 구매자 사유(변심·주문 실수)의 반품·교환은 왕복 배송비를 받는다 — 데모 상품의 반품 배송비(3,000원) 기준
  const buyerFault = input.reason === "CHANGE_OF_MIND" || input.reason === "WRONG_ORDER";
  const fee = input.type === "CANCEL" || !buyerFault ? 0 : input.type === "EXCHANGE" ? 6000 : 3000;
  return {
    quantity: line.quantity,
    approved: input.type === "CANCEL",
    expectedRefundAmount: input.type === "EXCHANGE" ? null : line.totalPrice - fee,
    claimDeliveryFee: fee,
    deliveryFeeRefundAmount: 0,
    couponChargeAmount: 0,
    couponChargeRefundAmount: 0,
    pointRefundAmount: 0,
    deductAmount: fee,
  };
}

function myCouponsOf(member: DemoMemberState, status: string | null) {
  const now = Date.now();
  const all = [
    ...[...DEMO_COUPONS, ...DEMO_CODE_COUPONS]
      .filter((c) => member.downloadedCoupons.has(c.couponId))
      .map((c) => ({
        ...toMyCoupon(c, daysFromNow(-3)),
        status: member.usedCoupons.has(c.couponId) ? "USED" : "AVAILABLE",
      })),
    ...(member.sample
      ? [{ ...toMyCoupon(DEMO_EXPIRED_COUPON, daysFromNow(-40)), status: "EXPIRED" }]
      : []),
  ].map((c) =>
    c.status === "AVAILABLE" && c.validUntil && new Date(c.validUntil).getTime() < now
      ? { ...c, status: "EXPIRED" }
      : c,
  );
  if (!status) return all;
  return all.filter((c) => c.status === status.toUpperCase());
}

function inquiryView(ctx: DemoContext, inquiry: DemoMemberState["productInquiries"][number]) {
  const product = findDemoProduct(inquiry.productId);
  return {
    inquiryId: inquiry.inquiryId,
    content: inquiry.content,
    secret: inquiry.secret,
    mine: true,
    writerMaskedName: "나",
    answer: inquiry.answer,
    createdAt: inquiry.createdAt,
    productId: inquiry.productId,
    productName: product?.name ?? null,
    thumbnailUrl: product ? demoImageUrl(ctx, product.image) : null,
    category: inquiry.category,
  };
}

const customerView = (inquiry: DemoMemberState["customerInquiries"][number]) => ({
  ...inquiry,
  answered: inquiry.answer !== null,
});

function consentsOf(member: DemoMemberState) {
  const at = member.joinedAt;
  const row = (kind: "TERMS" | "PRIVACY" | "MARKETING", agreed: boolean) => ({
    kind,
    agreed,
    agreedVersion: agreed ? "2026-01-01" : null,
    currentVersion: "2026-01-01",
    currentDocumentUrl: null,
    updatedAt: at,
    reconsentRequired: false,
  });
  return {
    terms: row("TERMS", true),
    privacy: row("PRIVACY", true),
    marketing: row("MARKETING", member.marketingAgreed),
    reconsentRequired: false,
  };
}

const addressView = (a: DemoAddress) => ({ ...a, countryCode: "KR", city: null, region: null });

export const memberRoutes: DemoRoute[] = [
  // ── 회원 정보·동의 ──
  route("PATCH", "/me", ({ ctx, body }) => {
    const member = requireMember(ctx);
    const input = body as { name?: string; phone?: string; marketingAgreed?: boolean };
    if (input.name !== undefined) member.name = input.name;
    if (input.phone !== undefined) member.phone = input.phone || null;
    if (input.marketingAgreed !== undefined) member.marketingAgreed = input.marketingAgreed;
    return new DemoResponse(null, {}, 204);
  }),
  route("GET", "/me/consents", ({ ctx }) => consentsOf(requireMember(ctx))),
  route("POST", "/me/consents", ({ ctx, body }) => {
    const member = requireMember(ctx);
    const input = body as { marketing?: boolean };
    if (input.marketing !== undefined) member.marketingAgreed = input.marketing;
    return consentsOf(member);
  }),

  // ── 배송지 ──
  route("GET", "/me/addresses", ({ ctx }) => requireMember(ctx).addresses.map(addressView)),
  route("POST", "/me/addresses", ({ ctx, body }) => {
    const member = requireMember(ctx);
    const input = body as Omit<DemoAddress, "addressId" | "isDefault"> & { isDefault?: boolean };
    const address: DemoAddress = {
      addressId: id("adr"),
      alias: input.alias,
      isDefault: input.isDefault === true || member.addresses.length === 0,
      receiverName: input.receiverName,
      phone: input.phone,
      zipCode: input.zipCode,
      address1: input.address1,
      address2: input.address2 ?? null,
    };
    if (address.isDefault) for (const a of member.addresses) a.isDefault = false;
    member.addresses.push(address);
    return new DemoResponse(null, {}, 204);
  }),
  route("PUT", "/me/addresses/:id", ({ ctx, params, body }) => {
    const member = requireMember(ctx);
    const address = member.addresses.find((a) => a.addressId === params.id);
    if (!address) throw new DemoApiError(404, "ADDRESS_NOT_FOUND", "배송지를 찾을 수 없습니다");
    const input = body as Partial<DemoAddress>;
    Object.assign(address, {
      alias: input.alias ?? address.alias,
      receiverName: input.receiverName ?? address.receiverName,
      phone: input.phone ?? address.phone,
      zipCode: input.zipCode ?? address.zipCode,
      address1: input.address1 ?? address.address1,
      address2: input.address2 ?? null,
    });
    if (input.isDefault) for (const a of member.addresses) a.isDefault = a === address;
    return new DemoResponse(null, {}, 204);
  }),
  route("DELETE", "/me/addresses/:id", ({ ctx, params }) => {
    const member = requireMember(ctx);
    const wasDefault = member.addresses.find((a) => a.addressId === params.id)?.isDefault;
    member.addresses = member.addresses.filter((a) => a.addressId !== params.id);
    if (wasDefault && member.addresses[0]) member.addresses[0].isDefault = true;
    return new DemoResponse(null, {}, 204);
  }),

  // ── 주문 ──
  route("GET", "/me/orders", ({ ctx, query }) => {
    const member = requireMember(ctx);
    const status = query.get("status");
    const from = query.get("from");
    const wanted = status ? (ORDER_STATUS_FILTER[status] ?? [status]) : null;
    const orders = ordersOf(member)
      .filter((o) => !from || new Date(o.orderedAt) >= new Date(from))
      .filter((o) => !wanted || Object.values(o.lines).some((l) => wanted.includes(l.status)))
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
      .map(orderView);
    return page(orders, query);
  }),
  route("GET", "/me/orders/:id", ({ ctx, params }) => orderView(orderOr404(ctx, params.id))),
  route("GET", "/me/order-items/:id/delivery", ({ ctx, params }) => {
    const { state } = lineOr404(ctx, params.id);
    const delivery = deliveryOf(state);
    if (!delivery) throw new DemoApiError(404, "DELIVERY_NOT_FOUND", "아직 출고 전입니다");
    const delivered = state.status === "DELIVERED" || state.status === "PURCHASE_DECIDED";
    const at = (hours: number) =>
      new Date(new Date(delivery.dispatchedAt).getTime() + hours * 3_600_000).toISOString();
    const events = [
      { status: "집화 처리", location: "서울 성동", occurredAt: at(0), stage: "PICKED_UP" },
      { status: "간선 상차", location: "옥천 HUB", occurredAt: at(6), stage: "IN_TRANSIT" },
      { status: "배송 출발", location: "서울 성수", occurredAt: at(16), stage: "OUT_FOR_DELIVERY" },
      ...(delivered
        ? [{ status: "배송 완료", location: "서울 성수", occurredAt: at(20), stage: "DELIVERED" }]
        : []),
    ].filter((e) => new Date(e.occurredAt).getTime() <= Date.now());
    return {
      carrierName: delivery.carrierName,
      trackingNumber: delivery.trackingNumber,
      trackingUrl: delivery.trackingUrl,
      status: delivered ? "DELIVERED" : "DELIVERING",
      trackingEvents: [...events].reverse(),
      trackingStage: events.at(-1)?.stage ?? null,
      trackingCheckedAt: new Date().toISOString(),
    };
  }),
  route("POST", "/me/order-items/:id/purchase-decision", ({ ctx, params }) => {
    const { state } = lineOr404(ctx, params.id);
    if (state.status !== "DELIVERED") {
      throw new DemoApiError(
        409,
        "PURCHASE_DECISION_NOT_ALLOWED",
        "배송 완료된 상품만 구매 확정합니다",
      );
    }
    state.status = "PURCHASE_DECIDED";
    state.decidedAt = new Date().toISOString();
    return new DemoResponse(null, {}, 204);
  }),

  // ── 취소·교환·반품 ──
  route("POST", "/me/order-items/:id/claims/preview", ({ ctx, params, body }) => {
    const { line } = lineOr404(ctx, params.id);
    return claimPreview(line, body as { type: "RETURN" | "EXCHANGE" | "CANCEL"; reason: string });
  }),
  route("POST", "/me/order-items/:id/claims", ({ ctx, params, body }) => {
    const { member, order, line, state } = lineOr404(ctx, params.id);
    const input = body as {
      type: "RETURN" | "EXCHANGE" | "CANCEL";
      reason: string;
      reasonDetail?: string;
    };
    if (claimOfLine(line.lineId)?.status === "REQUESTED") {
      throw new DemoApiError(409, "CLAIM_IN_PROGRESS", "이미 신청한 상품입니다");
    }
    const preview = claimPreview(line, input);
    const claim: DemoClaim = {
      claimId: id("clm"),
      claimNo: `C${order.orderNo.slice(0, 8)}${String(demoClaims.size + 1).padStart(2, "0")}`,
      member,
      orderId: order.orderId,
      lineId: line.lineId,
      type: input.type,
      // 결제 완료·상품 준비의 취소는 바로 끝난다
      status: input.type === "CANCEL" ? "COMPLETED" : "REQUESTED",
      reason: input.reason,
      reasonDetail: input.reasonDetail ?? null,
      quantity: line.quantity,
      expectedRefundAmount: preview.expectedRefundAmount,
      requestedAt: new Date().toISOString(),
      completedAt: input.type === "CANCEL" ? new Date().toISOString() : null,
    };
    demoClaims.set(claim.claimId, claim);
    if (input.type === "CANCEL") state.status = "CANCELED";
    return { claimId: claim.claimId, claimNo: claim.claimNo, status: "REQUESTED", ...preview };
  }),
  route("GET", "/me/claims", ({ ctx, query }) => {
    const member = requireMember(ctx);
    const status = query.get("status");
    const claims = [...demoClaims.values()]
      .filter((c) => c.member === member && (!status || c.status === status))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .map(claimView);
    return page(claims, query);
  }),
  route("POST", "/me/claims/:id/withdraw", ({ ctx, params }) => {
    const member = requireMember(ctx);
    const claim = demoClaims.get(params.id);
    if (!claim || claim.member !== member) {
      throw new DemoApiError(404, "CLAIM_NOT_FOUND", "신청 내역을 찾을 수 없습니다");
    }
    if (claim.status !== "REQUESTED") {
      throw new DemoApiError(409, "CLAIM_NOT_WITHDRAWABLE", "철회할 수 없는 상태입니다");
    }
    claim.status = "WITHDRAWN";
    return new DemoResponse(null, {}, 204);
  }),

  // ── 적립금·쿠폰 ──
  route("GET", "/me/points", ({ ctx }) => ({
    balance: requireMember(ctx).points,
    expiringSoon: 0,
  })),
  route("GET", "/me/points/history", ({ ctx, query }) =>
    page(requireMember(ctx).pointEntries, query),
  ),
  route("GET", "/me/coupons", ({ ctx, query }) =>
    myCouponsOf(requireMember(ctx), query.get("status")),
  ),
  route("POST", "/coupons/register", ({ ctx, body }) => {
    const member = requireMember(ctx);
    const code = (body as { code: string }).code.trim().toUpperCase().replaceAll("-", "");
    const coupon = DEMO_CODE_COUPONS.find((c) => c.code === code);
    if (!coupon) throw new DemoApiError(404, "COUPON_CODE_NOT_FOUND", "없는 쿠폰 번호입니다");
    if (member.downloadedCoupons.has(coupon.couponId)) {
      throw new DemoApiError(409, "COUPON_CODE_USED", "이미 등록한 쿠폰 번호입니다");
    }
    member.downloadedCoupons.add(coupon.couponId);
    const { code: _, ...rest } = coupon;
    return toMyCoupon(rest, new Date().toISOString());
  }),

  // ── 찜 ──
  route("GET", "/me/wishlist", ({ ctx, query }) => {
    const member = requireMember(ctx);
    const cards = [...member.wishlist].flatMap((productId) => {
      const product = findDemoProduct(productId);
      return product ? [toCard(ctx, product)] : [];
    });
    return page(cards, query);
  }),
  route("POST", "/me/wishlist", ({ ctx, body }) => {
    requireMember(ctx).wishlist.add((body as { productId: string }).productId);
    return new DemoResponse(null, {}, 204);
  }),
  route("DELETE", "/me/wishlist/:id", ({ ctx, params }) => {
    requireMember(ctx).wishlist.delete(params.id);
    return new DemoResponse(null, {}, 204);
  }),

  // ── 리뷰 ──
  route("GET", "/me/reviews", ({ ctx, query }) => {
    const member = requireMember(ctx);
    const reviews = [...demoReviews.values()]
      .filter((r) => r.member === member)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => {
        const line = findOrder(r.orderId)?.checkout.lines.find((l) => l.lineId === r.lineId);
        const editableUntil = plusDays(r.createdAt, 30);
        return {
          reviewId: r.reviewId,
          productId: r.productId,
          productName: line?.productName ?? null,
          thumbnailUrl: line?.thumbnailUrl ?? null,
          optionName: line?.optionName ?? null,
          rating: r.rating,
          content: r.content,
          images: r.images,
          sellerReply: r.sellerReply,
          blinded: false,
          editable: Date.now() < new Date(editableUntil).getTime(),
          editableUntil,
          createdAt: r.createdAt,
        };
      });
    return page(reviews, query);
  }),
  route("GET", "/me/reviews/writable", ({ ctx }) =>
    ordersOf(requireMember(ctx)).flatMap((order) =>
      order.checkout.lines.flatMap((line) => {
        const item = itemView(order, line);
        if (!item.reviewWritable) return [];
        const deliveredAt = order.lines[line.lineId]?.deliveredAt ?? order.orderedAt;
        return [
          {
            orderItemId: item.orderItemId,
            productId: line.productId,
            productName: line.productName,
            optionName: line.optionName,
            thumbnailUrl: line.thumbnailUrl,
            writableUntil: plusDays(deliveredAt, REVIEW_DAYS),
          },
        ];
      }),
    ),
  ),
  route("POST", "/me/order-items/:id/review", ({ ctx, params, body }) => {
    const { member, order, line } = lineOr404(ctx, params.id);
    if (reviewOfLine(line.lineId)) {
      throw new DemoApiError(409, "REVIEW_ALREADY_WRITTEN", "이미 리뷰를 쓴 상품입니다");
    }
    const input = body as { rating: number; content: string; images?: string[] };
    const reviewId = id("rv");
    demoReviews.set(reviewId, {
      reviewId,
      member,
      orderId: order.orderId,
      lineId: line.lineId,
      productId: line.productId,
      rating: input.rating,
      content: input.content,
      images: input.images ?? [],
      sellerReply: null,
      createdAt: new Date().toISOString(),
    });
    // 리뷰 적립 — 데모 상점 정책(글 500원·사진 1,000원)
    const rewardPoint = (input.images?.length ?? 0) > 0 ? 1000 : 500;
    member.points += rewardPoint;
    member.pointEntries.unshift({
      entryId: id("pt"),
      type: "EARN_REVIEW",
      amount: rewardPoint,
      balanceAfter: member.points,
      createdAt: new Date().toISOString(),
    });
    return { reviewId, rewardPoint };
  }),
  route("PUT", "/me/reviews/:id", ({ ctx, params, body }) => {
    const member = requireMember(ctx);
    const review = demoReviews.get(params.id);
    if (!review || review.member !== member) {
      throw new DemoApiError(404, "REVIEW_NOT_FOUND", "리뷰를 찾을 수 없습니다");
    }
    const input = body as { rating?: number; content?: string; images?: string[] };
    if (input.rating !== undefined) review.rating = input.rating;
    if (input.content !== undefined) review.content = input.content;
    if (input.images !== undefined) review.images = input.images;
    return new DemoResponse(null, {}, 204);
  }),
  route("DELETE", "/me/reviews/:id", ({ ctx, params }) => {
    const member = requireMember(ctx);
    const review = demoReviews.get(params.id);
    if (!review || review.member !== member) {
      throw new DemoApiError(404, "REVIEW_NOT_FOUND", "리뷰를 찾을 수 없습니다");
    }
    demoReviews.delete(params.id);
    return new DemoResponse(null, {}, 204);
  }),

  // ── 상품 문의·1:1 문의 ──
  route("GET", "/me/inquiries", ({ ctx, query }) => {
    const answered = query.get("answered");
    const rows = requireMember(ctx)
      .productInquiries.filter(
        (i) => answered === null || (answered === "true") === (i.answer !== null),
      )
      .map((i) => inquiryView(ctx, i));
    return page(rows, query);
  }),
  route("GET", "/me/customer-inquiries", ({ ctx, query }) => {
    const answered = query.get("answered");
    const category = query.get("category");
    const rows = requireMember(ctx)
      .customerInquiries.filter(
        (i) =>
          (answered === null || (answered === "true") === (i.answer !== null)) &&
          (!category || i.category === category),
      )
      .map(customerView);
    return page(rows, query);
  }),
  route("GET", "/me/customer-inquiries/:id", ({ ctx, params }) => {
    const inquiry = requireMember(ctx).customerInquiries.find((i) => i.inquiryId === params.id);
    if (!inquiry) throw new DemoApiError(404, "INQUIRY_NOT_FOUND", "문의를 찾을 수 없습니다");
    return customerView(inquiry);
  }),
  route("POST", "/me/customer-inquiries", ({ ctx, body }) => {
    const member = requireMember(ctx);
    const input = body as {
      category: DemoMemberState["customerInquiries"][number]["category"];
      title: string;
      content: string;
      orderItemId?: string;
    };
    const inquiry = {
      inquiryId: id("ci"),
      category: input.category,
      title: input.title,
      content: input.content,
      orderItemId: input.orderItemId ?? null,
      answer: null,
      createdAt: new Date().toISOString(),
    };
    member.customerInquiries.unshift(inquiry);
    return customerView(inquiry);
  }),
];
