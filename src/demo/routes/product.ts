import {
  DEMO_CATEGORIES,
  type DemoProduct,
  demoImageUrl,
  findDemoProduct,
  localizedCategoryName,
  marketPrice,
  productName,
} from "../data/catalog";
import { DEMO_COUPONS } from "../data/coupons";
import { toDetail } from "../data/product-detail";
import { demoInquiries, demoReviewSummary, demoReviews } from "../data/reviews";
import { DemoApiError, type DemoContext, type DemoRoute, route } from "../http";
import { memberState, requireMember } from "../member-state";

function productOr404(ctx: DemoContext, id: string): DemoProduct {
  const product = findDemoProduct(id);
  if (!product || ctx.scenario === "empty") {
    throw new DemoApiError(404, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다");
  }
  return product;
}

function categoryPathOf(ctx: DemoContext, product: DemoProduct) {
  const top = DEMO_CATEGORIES.find(
    (c) =>
      c.categoryId === product.categoryId ||
      c.children.some((child) => child.categoryId === product.categoryId),
  );
  const path = top
    ? [{ categoryId: top.categoryId, name: localizedCategoryName(ctx, top.categoryId) ?? top.name }]
    : [];
  if (top && top.categoryId !== product.categoryId) {
    path.push({
      categoryId: product.categoryId,
      name: localizedCategoryName(ctx, product.categoryId) ?? "",
    });
  }
  return path;
}

function page<T>(items: T[], query: URLSearchParams, defaultSize = 10) {
  const pageNo = Math.max(1, Number(query.get("page") ?? 1));
  const size = Math.max(1, Number(query.get("size") ?? defaultSize));
  return {
    page: pageNo,
    size,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    contents: items.slice((pageNo - 1) * size, pageNo * size),
  };
}

/** 데모 회원이 쓴 상품 문의 — 토큰별 메모리 */

export const productRoutes: DemoRoute[] = [
  route("GET", "/point-policy", () => ({
    reviewReward: { enabled: true, textPoint: 500, photoPoint: 1000 },
    purchaseEarn: { enabled: true, rateBp: 100 },
    expiryDays: 365,
    review: { writableDays: 30, editableDays: 7 },
  })),

  route("GET", "/products/:id", ({ ctx, params }) => {
    const product = productOr404(ctx, params.id);
    return { ...toDetail(ctx, product), categoryPath: categoryPathOf(ctx, product) };
  }),

  route("GET", "/products/:id/reviews", ({ ctx, params, query }) => {
    const product = productOr404(ctx, params.id);
    let reviews = demoReviews(ctx, product);
    const rating = query.get("rating");
    if (rating) reviews = reviews.filter((r) => r.rating === Number(rating));
    if (query.get("hasImage") === "true") reviews = reviews.filter((r) => r.images.length > 0);
    const variantId = query.get("variantId");
    if (variantId) reviews = reviews.filter((r) => r.variantId === variantId);
    const sort = query.get("sort") ?? "latest";
    if (sort === "ratingDesc") reviews = [...reviews].sort((a, b) => b.rating - a.rating);
    if (sort === "ratingAsc") reviews = [...reviews].sort((a, b) => a.rating - b.rating);
    if (sort === "helpful") {
      reviews = [...reviews].sort(
        (a, b) => Number(b.images.length > 0) - Number(a.images.length > 0) || b.rating - a.rating,
      );
    }
    return { ...page(reviews, query), summary: demoReviewSummary(product) };
  }),

  route("GET", "/products/:id/inquiries", ({ ctx, params, query }) => {
    const product = productOr404(ctx, params.id);
    const member = memberState(ctx);
    const mine = (member?.productInquiries ?? [])
      .filter((i) => i.productId === product.id)
      .map((i) => ({
        ...i,
        mine: true,
        writerMaskedName: "나",
        productName: productName(ctx, product),
        thumbnailUrl: demoImageUrl(ctx, product.image),
      }));
    return page([...mine, ...demoInquiries(ctx, product)], query);
  }),

  route("POST", "/products/:id/inquiries", ({ ctx, params, body }) => {
    const member = requireMember(ctx);
    const product = productOr404(ctx, params.id);
    const input = body as { content: string; secret?: boolean; category?: string };
    member.productInquiries.unshift({
      inquiryId: `iq_mine_${Date.now()}`,
      productId: product.id,
      category: (input.category ?? "PRODUCT") as "PRODUCT",
      content: input.content,
      secret: input.secret ?? false,
      answer: null,
      createdAt: new Date().toISOString(),
    });
    return null;
  }),

  route("GET", "/products/:id/coupon-benefit", ({ ctx, params, query }) => {
    const product = productOr404(ctx, params.id);
    const quantity = Number(query.get("quantity") ?? 1);
    const price = marketPrice(ctx, product);
    const amount = (price.discounted ?? price.sale) * quantity;
    const member = memberState(ctx);
    const welcome = DEMO_COUPONS[0];
    const discount =
      ctx.scenario === "global" || !welcome
        ? 0
        : Math.min(
            Math.floor((amount * welcome.benefit.value) / 100),
            welcome.benefit.maxDiscountAmount ?? amount,
          );
    return {
      productId: product.id,
      currency: ctx.scenario === "global" ? "USD" : "KRW",
      quantity,
      amount,
      maxDiscountAmount: discount,
      priceAfterDiscount: amount - discount,
      coupons:
        discount > 0 && welcome
          ? [
              {
                couponId: welcome.couponId,
                issueId: member?.downloadedCoupons.has(welcome.couponId)
                  ? `iss_${welcome.couponId}`
                  : null,
                name: welcome.name,
                kind: welcome.kind,
                discountAmount: discount,
                lineId: null,
                needsDownload: !member?.downloadedCoupons.has(welcome.couponId),
              },
            ]
          : [],
      withPoints: true,
      loginRequired: member === null,
    };
  }),
];
