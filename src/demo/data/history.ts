import type { DemoContext } from "../http";
import type { DemoMemberState } from "../member-state";
import {
  type CheckoutLine,
  type DemoCheckout,
  type DemoClaim,
  type DemoOrder,
  type DemoReview,
  demoClaims,
  demoOrders,
  demoReviews,
  type ItemStatus,
  id,
  type LineState,
  lineOf,
  type PaymentOptionInput,
  priceCheckout,
} from "./commerce";

/**
 * 데모 회원의 지난 기록 — 데모 기본 회원(`sample`)이 처음 마이페이지를 열 때 한 번 채운다.
 * 주문 상태·배송·클레임·리뷰·문의·적립금이 섞여 있어 마이페이지의 모든 상태를 데이터 없이 볼 수 있다.
 * 가입한 회원은 빈 상태로 시작한다(빈 화면 확인용).
 */

interface SeedItem {
  no: number;
  /** 옵션 조합 순번(`toDetail`의 variants 순서) */
  variant: number;
  quantity: number;
  status: ItemStatus;
}

function seedOrder(
  ctx: DemoContext,
  member: DemoMemberState,
  input: {
    daysAgo: number;
    items: SeedItem[];
    option: PaymentOptionInput;
    couponDiscount?: number;
    pointAmount?: number;
  },
): DemoOrder {
  const lines = input.items.flatMap((item) => {
    const line = lineOf(ctx, {
      productId: `prd_demo_${item.no}`,
      optionId: `prd_demo_${item.no}_v${item.variant}`,
      quantity: item.quantity,
    });
    return line ? [line] : [];
  });
  const checkout: DemoCheckout = {
    checkoutId: id("chk"),
    member,
    lines,
    method: "CARRIER",
    pickupLocationId: null,
    zipCode: member.addresses[0]?.zipCode ?? null,
    createdAt: Date.now(),
    currency: "KRW",
  };
  const pricing = priceCheckout(checkout, {});
  const coupon = input.couponDiscount ?? 0;
  const points = input.pointAmount ?? 0;
  pricing.amounts.couponDiscountAmount = coupon;
  pricing.amounts.pointAmount = points;
  pricing.amounts.totalAmount -= coupon + points;
  if (pricing.items[0]) {
    pricing.items[0].couponDiscountAmount = coupon;
    pricing.items[0].pointAllocation = points;
  }
  const orderedAt = hoursAgo(input.daysAgo * 24 + 3);
  const address = member.addresses[0];
  const order: DemoOrder = {
    orderId: id("ord"),
    orderNo: `${orderedAt.slice(2, 4)}${orderedAt.slice(5, 7)}${String(input.daysAgo).padStart(4, "0")}${String(demoOrders.size + 1).padStart(6, "0")}`,
    orderedAt,
    paidAt: orderedAt,
    member,
    checkout,
    pricing,
    option: input.option,
    address: address
      ? {
          receiverName: address.receiverName,
          phone: address.phone,
          zipCode: address.zipCode,
          address1: address.address1,
          address2: address.address2,
          deliveryMemo: "문 앞에 놓아 주십시오",
        }
      : null,
    paymentId: id("pay"),
    lines: Object.fromEntries(
      lines.map((line, i) => [
        line.lineId,
        lineState(input.items[i]?.status ?? "PAID", input.daysAgo),
      ]),
    ),
  };
  demoOrders.set(order.orderId, order);
  member.orders.push(order.orderId);
  return order;
}

/** 지금부터 몇 시간 전(ISO) — 지난 기록은 실제 시각 차로 만들어 배송 이동 기록이 지금보다 앞선다 */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/** 지금부터 며칠 전(ISO) — 지난 기록 날짜. 하루 안의 시각은 두 시간 전으로 둔다 */
function daysAgo(days: number): string {
  return hoursAgo(days * 24 + 2);
}

function lineState(status: ItemStatus, daysAgo: number): LineState {
  const shipped = ["DISPATCHED", "DELIVERING", "DELIVERED", "PURCHASE_DECIDED"].includes(status);
  const ordered = daysAgo * 24 + 3;
  return {
    status,
    ...(shipped ? { dispatchedAt: hoursAgo(ordered - 18) } : {}),
    ...(status === "DELIVERED" || status === "PURCHASE_DECIDED"
      ? { deliveredAt: hoursAgo(ordered - 42) }
      : {}),
    ...(status === "PURCHASE_DECIDED" ? { decidedAt: hoursAgo(ordered - 120) } : {}),
  };
}

function claim(
  order: DemoOrder,
  line: CheckoutLine,
  input: Pick<DemoClaim, "type" | "status" | "reason" | "reasonDetail"> & { daysAgo: number },
) {
  const value: DemoClaim = {
    claimId: id("clm"),
    claimNo: `C${order.orderNo.slice(0, 8)}${String(demoClaims.size + 1).padStart(2, "0")}`,
    member: order.member,
    orderId: order.orderId,
    lineId: line.lineId,
    type: input.type,
    status: input.status,
    reason: input.reason,
    reasonDetail: input.reasonDetail,
    quantity: line.quantity,
    expectedRefundAmount: input.type === "EXCHANGE" ? null : line.totalPrice,
    requestedAt: daysAgo(input.daysAgo),
    completedAt: input.status === "COMPLETED" ? daysAgo(input.daysAgo - 3) : null,
  };
  demoClaims.set(value.claimId, value);
}

function review(
  order: DemoOrder,
  line: CheckoutLine,
  input: Pick<DemoReview, "rating" | "content" | "sellerReply"> & {
    daysAgo: number;
    photo: boolean;
  },
) {
  const value: DemoReview = {
    reviewId: id("rv"),
    member: order.member,
    orderId: order.orderId,
    lineId: line.lineId,
    productId: line.productId,
    rating: input.rating,
    content: input.content,
    images: input.photo ? [line.thumbnailUrl] : [],
    sellerReply: input.sellerReply,
    createdAt: daysAgo(input.daysAgo),
  };
  demoReviews.set(value.reviewId, value);
}

const KAKAOPAY: PaymentOptionInput = { pg: "kakaopay", method: "EASY_PAY", provider: "KAKAOPAY" };
const CARD: PaymentOptionInput = { pg: "tosspayments", method: "CARD" };
const NAVERPAY: PaymentOptionInput = { pg: "naverpay", method: "EASY_PAY", provider: "NAVERPAY" };

/** 데모 기본 회원의 지난 기록을 한 번 채운다 */
export function ensureHistory(ctx: DemoContext, member: DemoMemberState) {
  if (!member.sample || member.seeded || ctx.scenario === "empty") return;
  member.seeded = true;

  // 1) 어제 주문 — 코트는 배송 중, 니트는 상품 준비(취소 가능)
  seedOrder(ctx, member, {
    daysAgo: 1,
    items: [
      { no: 1, variant: 1, quantity: 1, status: "DELIVERING" },
      { no: 4, variant: 0, quantity: 2, status: "CONFIRMED" },
    ],
    option: KAKAOPAY,
    couponDiscount: 25000,
    pointAmount: 3500,
  });
  // 2) 9일 전 — 슬랙스는 배송 완료(구매 확정·반품·교환 가능), 볼캡은 구매 확정 + 리뷰
  const second = seedOrder(ctx, member, {
    daysAgo: 9,
    items: [
      { no: 7, variant: 1, quantity: 1, status: "DELIVERED" },
      { no: 13, variant: 2, quantity: 1, status: "PURCHASE_DECIDED" },
    ],
    option: NAVERPAY,
  });
  // 3) 12일 전 — 데님은 배송 완료 뒤 교환 접수(진행 중 클레임)
  const third = seedOrder(ctx, member, {
    daysAgo: 12,
    items: [{ no: 5, variant: 0, quantity: 1, status: "DELIVERED" }],
    option: CARD,
  });
  // 4) 16일 전 — 로퍼 반품 완료
  const fourth = seedOrder(ctx, member, {
    daysAgo: 16,
    items: [{ no: 8, variant: 2, quantity: 1, status: "CANCELED" }],
    option: KAKAOPAY,
  });
  // 5) 28일 전 — 볼캡 주문 취소 완료
  const fifth = seedOrder(ctx, member, {
    daysAgo: 28,
    items: [{ no: 13, variant: 1, quantity: 1, status: "CANCELED" }],
    option: CARD,
  });
  // 6) 77일 전 — 머플러 구매 확정 + 리뷰
  const sixth = seedOrder(ctx, member, {
    daysAgo: 77,
    items: [{ no: 10, variant: 2, quantity: 1, status: "PURCHASE_DECIDED" }],
    option: CARD,
  });
  // 7) 245일 전 — 블레이저 구매 확정 + 사진 리뷰
  const seventh = seedOrder(ctx, member, {
    daysAgo: 245,
    items: [{ no: 23, variant: 4, quantity: 1, status: "PURCHASE_DECIDED" }],
    option: NAVERPAY,
  });

  const lineOfOrder = (order: DemoOrder, index = 0) => order.checkout.lines[index] as CheckoutLine;
  claim(third, lineOfOrder(third), {
    type: "EXCHANGE",
    status: "REQUESTED",
    reason: "WRONG_ORDER",
    reasonDetail: "S 사이즈가 작아 M으로 교환을 원합니다.",
    daysAgo: 1,
  });
  claim(fourth, lineOfOrder(fourth), {
    type: "RETURN",
    status: "COMPLETED",
    reason: "CHANGE_OF_MIND",
    reasonDetail: null,
    daysAgo: 13,
  });
  claim(fifth, lineOfOrder(fifth), {
    type: "CANCEL",
    status: "COMPLETED",
    reason: "WRONG_ORDER",
    reasonDetail: null,
    daysAgo: 28,
  });

  review(second, lineOfOrder(second, 1), {
    rating: 5,
    content: "챙이 적당히 짧아 얼굴이 작아 보입니다. 워싱이 자연스럽습니다.",
    sellerReply: { content: "예쁘게 착용해 주셔서 감사합니다.", repliedAt: daysAgo(1) },
    daysAgo: 2,
    photo: true,
  });
  review(sixth, lineOfOrder(sixth), {
    rating: 4,
    content: "부드럽고 따뜻합니다. 처음에 털빠짐이 조금 있었습니다.",
    sellerReply: null,
    daysAgo: 69,
    photo: false,
  });
  review(seventh, lineOfOrder(seventh), {
    rating: 5,
    content: "어깨 패드가 과하지 않아 출근룩으로 자주 입습니다.",
    sellerReply: null,
    daysAgo: 237,
    photo: true,
  });

  member.productInquiries = [
    {
      inquiryId: id("iq"),
      productId: "prd_demo_2",
      category: "DELIVERY",
      content: "오늘 주문하면 언제 출고됩니까?",
      secret: true,
      answer: null,
      createdAt: daysAgo(0),
    },
    {
      inquiryId: id("iq"),
      productId: "prd_demo_1",
      category: "PRODUCT",
      content: "키 165cm에 M 사이즈 기장이 어느 정도 됩니까?",
      secret: false,
      answer: { content: "M 사이즈 총장은 98cm입니다.", answeredAt: daysAgo(1) },
      createdAt: daysAgo(1),
    },
    {
      inquiryId: id("iq"),
      productId: "prd_demo_6",
      category: "PRODUCT",
      content: "어깨끈 길이 조절이 됩니까?",
      secret: false,
      answer: { content: "3단계로 조절됩니다.", answeredAt: daysAgo(15) },
      createdAt: daysAgo(15),
    },
  ];
  const firstItem = `oi_${lineOfOrder(third).lineId}`;
  member.customerInquiries = [
    {
      inquiryId: id("ci"),
      category: "DELIVERY",
      title: "배송지 변경이 가능합니까?",
      content: "아직 출고 전이라면 회사 주소로 바꾸고 싶습니다.",
      orderItemId: null,
      answer: null,
      createdAt: daysAgo(0),
    },
    {
      inquiryId: id("ci"),
      category: "EXCHANGE",
      title: "데님 사이즈 교환 문의드립니다",
      content: "S 사이즈가 작아 M으로 교환하고 싶습니다. 택은 떼지 않았습니다.",
      orderItemId: firstItem,
      answer: {
        content: "주문 상세에서 교환 신청을 해 주시면 확인 후 안내드리겠습니다.",
        answeredAt: daysAgo(1),
      },
      createdAt: daysAgo(2),
    },
  ];
  // 적립금 내역 — 합계가 지금 잔액(3,500원)과 맞는다
  const entries: [string, number, number][] = [
    ["EARN_PURCHASE", 1290, 238],
    ["EARN_REVIEW", 1000, 237],
    ["EARN_PURCHASE", 337, 72],
    ["EARN_REVIEW", 500, 69],
    ["EARN_PURCHASE", 2873, 4],
    ["EARN_REVIEW", 1000, 2],
    ["USE_RESERVE", -3500, 1],
  ];
  let balance = 0;
  member.pointEntries = entries
    .map(([type, amount, days]) => {
      balance += amount;
      return {
        entryId: id("pt"),
        type,
        amount,
        balanceAfter: balance,
        createdAt: daysAgo(days),
      };
    })
    .reverse();
  member.points = balance;
}
