import {
  categoryAndDescendants,
  DEMO_PRODUCTS,
  type DemoProduct,
  localizedCategories,
  localizedCategoryName,
  payPrice,
  productName,
  toCard,
} from "../data/catalog";
import { DEMO_COLLECTIONS, toCollection } from "../data/collections";
import { DEMO_COUPONS, toMyCoupon } from "../data/coupons";
import { demoStore } from "../data/store";
import { DemoApiError, type DemoContext, type DemoRoute, route } from "../http";
import { memberState, requireMember } from "../member-state";

const SORTS: Record<string, (a: DemoProduct, b: DemoProduct) => number> = {
  recommend: (a, b) => b.reviews * b.rating - a.reviews * a.rating,
  latest: (a, b) => b.arrival - a.arrival,
  priceAsc: (a, b) => payPrice(a) - payPrice(b),
  priceDesc: (a, b) => payPrice(b) - payPrice(a),
  reviewCount: (a, b) => b.reviews - a.reviews,
  ratingDesc: (a, b) => b.rating - a.rating,
};

function catalog(ctx: DemoContext): DemoProduct[] {
  return ctx.scenario === "empty" ? [] : DEMO_PRODUCTS;
}

function page<T>(items: T[], query: URLSearchParams, defaultSize = 20) {
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

function priceFilter(products: DemoProduct[], query: URLSearchParams): DemoProduct[] {
  const min = query.get("minPrice");
  const max = query.get("maxPrice");
  return products.filter(
    (product) =>
      (min === null || payPrice(product) >= Number(min)) &&
      (max === null || payPrice(product) <= Number(max)),
  );
}

export const catalogRoutes: DemoRoute[] = [
  route("GET", "/store", ({ ctx }) => demoStore(ctx.scenario)),

  route("GET", "/categories", ({ ctx }) =>
    ctx.scenario === "empty" ? [] : localizedCategories(ctx),
  ),

  route("GET", "/products", ({ ctx, query }) => {
    const keyword = query.get("keyword")?.trim();
    const categoryId = query.get("categoryId");
    let products = catalog(ctx).filter(
      (product) =>
        !keyword ||
        product.name.includes(keyword) ||
        productName(ctx, product).toLowerCase().includes(keyword.toLowerCase()),
    );
    if (categoryId) {
      const ids = categoryAndDescendants(categoryId);
      products = products.filter((product) => ids.includes(product.categoryId));
    }
    if (query.get("freeShipping") === "true") products = products.filter((p) => p.freeShipping);
    const prices = products.map(payPrice);
    products = priceFilter(products, query);
    // 실제 API와 같다 — 필터를 적용한 결과를 상품이 속한 카테고리(말단) 단위로 센다
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }
    const sorted = [...products].sort(SORTS[query.get("sort") ?? "recommend"] ?? SORTS.recommend);
    return {
      ...page(
        sorted.map((product) => toCard(ctx, product)),
        query,
      ),
      facets: {
        categories: [...counts].map(([id, count]) => ({
          categoryId: id,
          name: localizedCategoryName(ctx, id) ?? id,
          count,
        })),
        priceRange: prices.length
          ? { min: Math.min(...prices), max: Math.max(...prices) }
          : undefined,
      },
    };
  }),

  route("GET", "/collections", ({ ctx, query }) =>
    page(ctx.scenario === "empty" ? [] : DEMO_COLLECTIONS.map((c) => toCollection(ctx, c)), query),
  ),

  route("GET", "/collections/:slug", ({ ctx, params }) => {
    const found = DEMO_COLLECTIONS.find((c) => c.detail.slug === params.slug);
    if (!found || ctx.scenario === "empty") {
      throw new DemoApiError(404, "COLLECTION_NOT_FOUND", "기획전을 찾을 수 없습니다");
    }
    return toCollection(ctx, found);
  }),

  route("GET", "/collections/:slug/products", ({ ctx, params, query }) => {
    const found = DEMO_COLLECTIONS.find((c) => c.detail.slug === params.slug);
    if (!found) throw new DemoApiError(404, "COLLECTION_NOT_FOUND", "기획전을 찾을 수 없습니다");
    const inCollection = found.productNos
      .map((no) => DEMO_PRODUCTS.find((product) => product.no === no))
      .filter((product): product is DemoProduct => product !== undefined);
    const sort = query.get("sort") ?? found.detail.productSort;
    const filtered = priceFilter(inCollection, query);
    const sorted =
      sort === "manual" ? filtered : [...filtered].sort(SORTS[sort] ?? SORTS.recommend);
    return page(
      sorted.map((product) => toCard(ctx, product)),
      query,
    );
  }),

  route("GET", "/coupons", ({ ctx, query }) => {
    const member = memberState(ctx);
    const coupons = ctx.scenario === "empty" || ctx.scenario === "global" ? [] : DEMO_COUPONS;
    return page(
      coupons.map((coupon) => {
        const downloaded = member ? member.downloadedCoupons.has(coupon.couponId) : null;
        return {
          ...coupon,
          loginRequired: member === null,
          downloaded,
          downloadable: member ? !downloaded : null,
        };
      }),
      query,
    );
  }),

  route("POST", "/coupons/:couponId/download", ({ ctx, params }) => {
    const member = requireMember(ctx);
    const coupon = DEMO_COUPONS.find((c) => c.couponId === params.couponId);
    if (!coupon) throw new DemoApiError(404, "COUPON_NOT_FOUND", "쿠폰을 찾을 수 없습니다");
    if (coupon.issueStartsAt && new Date(coupon.issueStartsAt) > new Date()) {
      throw new DemoApiError(409, "COUPON_NOT_STARTED", "아직 받을 수 없는 쿠폰입니다");
    }
    if (member.downloadedCoupons.has(coupon.couponId)) {
      throw new DemoApiError(409, "COUPON_ALREADY_DOWNLOADED", "이미 받은 쿠폰입니다");
    }
    member.downloadedCoupons.add(coupon.couponId);
    return toMyCoupon(coupon, new Date().toISOString());
  }),
];
