import { useSuspenseQuery } from "@tanstack/react-query";
import {
  categoriesQuery,
  type ProductSearch,
  productQuery,
  productsQuery,
  storeQuery,
} from "../lib/queries";

/**
 * 기본 훅 — 화면은 이 훅으로 데이터를 읽는다. 라우트 loader에서 같은 queryOptions로 `ensureQueryData`를 먼저 부르면
 * 서버 렌더에 데이터가 실려 첫 화면이 바로 그려진다(`loader-first` 규칙).
 */
export function useStore() {
  return useSuspenseQuery(storeQuery()).data;
}

export function useCategories() {
  return useSuspenseQuery(categoriesQuery()).data;
}

export function useProducts(search: ProductSearch = {}) {
  return useSuspenseQuery(productsQuery(search)).data;
}

export function useProduct(productId: string) {
  return useSuspenseQuery(productQuery(productId)).data;
}
