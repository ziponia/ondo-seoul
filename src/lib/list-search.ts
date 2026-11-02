import { productSortSchema } from "@sayren/storefront-sdk";
import { z } from "zod";
import type { ProductSearch } from "./queries";

/**
 * 목록 주소 값 — 정렬·페이지·가격·무료배송을 URL에 둔다(새로고침·공유해도 같은 목록).
 * 잘못된 값은 버리고 기본값으로 연다.
 */
export const listSearchSchema = z.object({
  sort: productSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  min: z.coerce.number().int().min(0).optional().catch(undefined),
  max: z.coerce.number().int().min(0).optional().catch(undefined),
  free: z.coerce.boolean().optional().catch(undefined),
});
export type ListSearch = z.infer<typeof listSearchSchema>;

export const LIST_PAGE_SIZE = 20;

/** 주소 값 → SDK 조회 값 */
export function toProductSearch(
  search: ListSearch,
  extra: Partial<ProductSearch> = {},
): ProductSearch {
  return {
    sort: search.sort ?? "recommend",
    page: search.page ?? 1,
    size: LIST_PAGE_SIZE,
    minPrice: search.min,
    maxPrice: search.max,
    freeShipping: search.free,
    ...extra,
  };
}

export const PRODUCT_SORTS = productSortSchema.options;
