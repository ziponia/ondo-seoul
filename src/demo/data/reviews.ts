import type { publicInquirySchema, publicReviewSchema } from "@sayren/storefront-sdk";
import type { z } from "zod";
import type { DemoContext } from "../http";
import { type DemoProduct, demoImageUrl } from "./catalog";
import { daysFromNow } from "./time";

type ReviewInput = z.input<typeof publicReviewSchema>;
type InquiryInput = z.input<typeof publicInquirySchema>;

const BODIES: [number, string, number, string | null][] = [
  [
    5,
    "어깨가 자연스럽게 떨어지고 기장도 무릎 위라 165cm에 딱 맞습니다. 안에 니트를 입어도 여유가 있습니다.",
    3,
    "따뜻한 후기 감사합니다. 이번 겨울 내내 잘 입으시길 바랍니다.",
  ],
  [5, "색감이 사진보다 조금 더 따뜻합니다. 소재 대비 가볍고 보풀도 아직 없습니다.", 2, null],
  [
    4,
    "핏은 좋은데 L은 소매가 약간 깁니다. 한 치수 작게 사도 될 것 같습니다.",
    1,
    "사이즈 의견 감사합니다. 상세 페이지 실측표를 함께 확인해 주십시오.",
  ],
  [5, "두 번째 구매입니다. 작년 것보다 원단이 도톰해졌습니다.", 0, null],
  [
    3,
    "배송은 빨랐는데 단추 하나가 살짝 헐거웠습니다.",
    0,
    "불편을 드려 죄송합니다. 1:1 문의로 연락 주시면 도와드리겠습니다.",
  ],
  [5, "매일 손이 가는 옷입니다. 세탁 후에도 형태가 그대로입니다.", 2, null],
  [4, "가격 대비 만족합니다. 다만 배송 포장이 조금 아쉬웠습니다.", 0, null],
  [5, "선물용으로 샀는데 받는 사람이 아주 좋아했습니다.", 1, null],
];

const NAMES = ["ko***", "ji***", "sy***", "mi***", "ha***", "do***", "yu***", "se***"];

/** 상품 리뷰 — 상품 리뷰 수와 상관없이 데모는 8개를 돌려 쓴다 */
export function demoReviews(ctx: DemoContext, product: DemoProduct): ReviewInput[] {
  if (ctx.scenario === "empty" || product.reviews === 0) return [];
  const sizes = ["S", "M", "L"];
  return BODIES.map(([rating, content, photos, reply], index) => ({
    reviewId: `rv_${product.no}_${index}`,
    rating,
    content,
    images: Array.from({ length: photos }, () => demoImageUrl(ctx, product.image)),
    optionName: `차콜 / ${sizes[index % 3]}`,
    variantId: `${product.id}_v${index % 3}`,
    writerMaskedName: NAMES[index] ?? "an***",
    sellerReply: reply ? { content: reply, repliedAt: daysFromNow(-index * 3) } : null,
    createdAt: daysFromNow(-index * 3 - 1),
  }));
}

/** 평점 분포 — 상품의 평균·리뷰 수에서 만든 데모 값 */
export function demoReviewSummary(product: DemoProduct) {
  const total = product.reviews;
  const five = Math.round(total * 0.8);
  const four = Math.round(total * 0.15);
  const three = Math.max(0, Math.round(total * 0.03));
  const two = Math.max(0, Math.round(total * 0.01));
  return {
    averageRating: product.rating,
    totalCount: total,
    distribution: {
      "5": five,
      "4": four,
      "3": three,
      "2": two,
      "1": Math.max(0, total - five - four - three - two),
    },
  };
}

export function demoInquiries(ctx: DemoContext, product: DemoProduct): InquiryInput[] {
  if (ctx.scenario === "empty") return [];
  const base = {
    productId: product.id,
    productName: product.name,
    thumbnailUrl: demoImageUrl(ctx, product.image),
  };
  return [
    {
      ...base,
      inquiryId: `iq_${product.no}_1`,
      category: "PRODUCT",
      content: "키 165cm에 M 사이즈 기장이 어느 정도 됩니까?",
      secret: false,
      mine: false,
      writerMaskedName: "ko***",
      answer: { content: "M 사이즈 총장은 98cm로 무릎 위에 옵니다.", answeredAt: daysFromNow(-1) },
      createdAt: daysFromNow(-2),
    },
    {
      ...base,
      inquiryId: `iq_${product.no}_2`,
      category: "DELIVERY",
      content: null,
      secret: true,
      mine: false,
      writerMaskedName: "ji***",
      answer: null,
      createdAt: daysFromNow(-1),
    },
    {
      ...base,
      inquiryId: `iq_${product.no}_3`,
      category: "EXCHANGE",
      content: "오트밀로 교환할 수 있습니까?",
      secret: false,
      mine: false,
      writerMaskedName: "sy***",
      answer: { content: "수령 후 7일 안에 교환 신청이 가능합니다.", answeredAt: daysFromNow(-4) },
      createdAt: daysFromNow(-5),
    },
  ];
}
