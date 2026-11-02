import { ApiError, collectionProductSortSchema, productSortSchema } from "@sayren/storefront-sdk";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiFor } from "./api.server";
import { nullOn404 } from "./errors";
import { buyerApi } from "./session.server";

/**
 * 기본 조회 — TanStack Query의 queryOptions 팩토리다. 라우트 loader(`ensureQueryData`)와 화면(`useSuspenseQuery`, `src/hooks`)이
 * 같은 팩토리를 써서 queryKey가 갈라지지 않는다. 데이터는 서버 함수로 받는다(첫 요청은 서버가 받아 HTML에 싣는다).
 * 금액·재고·주문 가능 여부는 응답 값을 그대로 보인다 — 화면에서 계산하지 않는다.
 */

const getStore = createServerFn({ method: "GET" }).handler(() => apiFor().store.get());

const listCategories = createServerFn({ method: "GET" }).handler(() =>
  apiFor().catalog.listCategories(),
);

export const productSearchSchema = z.object({
  keyword: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
  freeShipping: z.boolean().optional(),
  sort: productSortSchema.optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(60).optional(),
});
export type ProductSearch = z.infer<typeof productSearchSchema>;

const searchProducts = createServerFn({ method: "GET" })
  .validator(productSearchSchema)
  .handler(({ data }) =>
    apiFor().catalog.searchProducts({ ...data, page: data.page ?? 1, size: data.size ?? 24 }),
  );

const getProduct = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string().min(1) }))
  .handler(({ data }) => apiFor().catalog.getProduct(data.productId).catch(nullOn404));

/** 상점 이름·로고·연락처 — 상점 플랫폼 설정 › 상점 정보 값 */
export const storeQuery = () =>
  queryOptions({ queryKey: ["store"], queryFn: () => getStore(), staleTime: 5 * 60_000 });

/** 카테고리는 자주 바뀌지 않는다 — 5분 동안 다시 받지 않는다 */
export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["catalog", "categories"],
    queryFn: () => listCategories(),
    staleTime: 5 * 60_000,
  });

export const productsQuery = (search: ProductSearch) =>
  queryOptions({
    queryKey: ["catalog", "products", search],
    queryFn: () => searchProducts({ data: search }),
  });

/** 상품 하나 — 상품 id 또는 상점별 상품번호. 없으면 null */
export const productQuery = (productId: string) =>
  queryOptions({
    queryKey: ["catalog", "product", productId],
    queryFn: () => getProduct({ data: { productId } }),
  });

const listCollections = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.number().int().min(1), size: z.number().int().min(1).max(100) }))
  .handler(({ data }) => apiFor().catalog.listCollections(data));

const getCollection = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(({ data }) => apiFor().catalog.getCollection(data.slug).catch(nullOn404));

export const collectionProductSearchSchema = z.object({
  sort: collectionProductSortSchema.optional(),
  page: z.number().int().min(1).optional(),
  size: z.number().int().min(1).max(60).optional(),
});
export type CollectionProductSearch = z.infer<typeof collectionProductSearchSchema>;

const listCollectionProducts = createServerFn({ method: "GET" })
  .validator(collectionProductSearchSchema.extend({ slug: z.string().min(1) }))
  .handler(({ data: { slug, ...search } }) =>
    apiFor().catalog.listCollectionProducts(slug, {
      ...search,
      page: search.page ?? 1,
      size: search.size ?? 24,
    }),
  );

// 회원이면 받음 여부(`downloaded`·`downloadable`)가 실려야 해 구매자 토큰으로 부른다
const listCoupons = createServerFn({ method: "GET" }).handler(() =>
  buyerApi().catalog.listCoupons({ size: 50 }),
);

/** 쿠폰 받기 — 회원 전용. 실패하면 문구만 돌려준다 */
export const downloadCoupons = createServerFn({ method: "POST" })
  .validator(z.object({ couponIds: z.array(z.string().min(1)).min(1).max(50) }))
  .handler(async ({ data }) => {
    const api = buyerApi();
    try {
      for (const couponId of data.couponIds) await api.me.downloadCoupon(couponId);
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) {
        return { ok: false as const, message: error.message };
      }
      throw error;
    }
  });

/** 기획전 목록 — 노출 중인 것만 온다 */
export const collectionsQuery = (page = 1, size = 20) =>
  queryOptions({
    queryKey: ["catalog", "collections", page, size],
    queryFn: () => listCollections({ data: { page, size } }),
    staleTime: 60_000,
  });

export const collectionQuery = (slug: string) =>
  queryOptions({
    queryKey: ["catalog", "collection", slug],
    queryFn: () => getCollection({ data: { slug } }),
  });

export const collectionProductsQuery = (slug: string, search: CollectionProductSearch) =>
  queryOptions({
    queryKey: ["catalog", "collection", slug, "products", search],
    queryFn: () => listCollectionProducts({ data: { slug, ...search } }),
  });

/** 받을 수 있는 쿠폰 — 회원이면 받음 여부가 함께 온다 */
export const couponsQuery = () =>
  queryOptions({ queryKey: ["catalog", "coupons"], queryFn: () => listCoupons() });
