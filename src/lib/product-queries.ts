import { productInquiryCategorySchema, productReviewSortSchema } from "@sayren/storefront-sdk";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiFor } from "./api.server";
import { buyerApi, readSession } from "./session.server";

/**
 * 상품 상세의 보조 조회 — 리뷰·문의·쿠폰 혜택·적립 정책. 하나가 실패해도 그 구획만 숨긴다(null).
 * 쿠폰 혜택과 문의(내 비밀글)는 구매자에 따라 달라 구매자 토큰으로 부른다.
 */
export const reviewSearchSchema = z.object({
  sort: productReviewSortSchema.optional(),
  hasImage: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  variantId: z.string().optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(50).optional(),
});
export type ReviewSearch = z.infer<typeof reviewSearchSchema>;

const listReviews = createServerFn({ method: "GET" })
  .validator(reviewSearchSchema.extend({ productId: z.string().min(1) }))
  .handler(({ data: { productId, ...search } }) =>
    apiFor()
      .catalog.listProductReviews(productId, search)
      .catch(() => null),
  );

const listInquiries = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string().min(1), page: z.number().int().min(1) }))
  .handler(({ data }) =>
    buyerApi()
      .catalog.listProductInquiries(data.productId, { page: data.page, size: 10 })
      .catch(() => null),
  );

const getCouponBenefit = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string().min(1), optionId: z.string().optional() }))
  .handler(({ data }) =>
    buyerApi()
      .catalog.getCouponBenefit(data.productId, { quantity: 1, optionId: data.optionId })
      .catch(() => null),
  );

const getPointPolicy = createServerFn({ method: "GET" }).handler(() =>
  apiFor()
    .catalog.getPointPolicy()
    .catch(() => null),
);

export const reviewsQuery = (productId: string, search: ReviewSearch) =>
  queryOptions({
    queryKey: ["catalog", "product", productId, "reviews", search],
    queryFn: () => listReviews({ data: { productId, ...search } }),
  });

export const inquiriesQuery = (productId: string, page = 1) =>
  queryOptions({
    queryKey: ["catalog", "product", productId, "inquiries", page],
    queryFn: () => listInquiries({ data: { productId, page } }),
  });

export const couponBenefitQuery = (productId: string) =>
  queryOptions({
    queryKey: ["catalog", "product", productId, "coupon-benefit"],
    queryFn: () => getCouponBenefit({ data: { productId } }),
  });

export const pointPolicyQuery = () =>
  queryOptions({
    queryKey: ["catalog", "point-policy"],
    queryFn: () => getPointPolicy(),
    staleTime: 5 * 60_000,
  });

/** 상품 문의 쓰기 — 로그인한 구매자만. 로그인하지 않았으면 `loginRequired` */
export const createInquiry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      productId: z.string().min(1),
      category: productInquiryCategorySchema,
      content: z.string().trim().min(1).max(1000),
      secret: z.boolean(),
    }),
  )
  .handler(async ({ data: { productId, ...body } }) => {
    if (!readSession()) return { ok: false as const, loginRequired: true };
    await buyerApi().catalog.createInquiry(productId, body);
    return { ok: true as const, loginRequired: false };
  });
