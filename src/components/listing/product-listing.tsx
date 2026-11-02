import type { ProductPage } from "@sayren/storefront-sdk";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { type ListSearch, PRODUCT_SORTS } from "../../lib/list-search";
import { Pager } from "./pager";
import {
  type CategoryFacet,
  FilterSheetButton,
  FilterSidebar,
  type FilterValue,
  PriceSelect,
  priceLabel,
} from "./product-filters";
import { ProductGrid } from "./product-grid";
import { SortMenu } from "./sort-menu";

/**
 * 목록 본문 — 데스크톱은 왼쪽 필터 칸 + 오른쪽(정렬 줄·적용 필터·4열 그리드·페이지), 모바일은 상품 수·필터 버튼·정렬.
 * 카테고리 목록과 검색 결과가 함께 쓴다. 바뀐 값은 `onSearch`로 주소에 쓴다(페이지는 1로 돌아간다).
 */
export function ProductListing({
  page,
  search,
  onSearch,
  emptyText,
  categories = [],
  categoryHref,
  currentCategoryId,
  wide = false,
  countLabel,
}: {
  page: ProductPage;
  search: ListSearch;
  onSearch: (next: ListSearch) => void;
  emptyText?: string;
  categories?: CategoryFacet[];
  /** 필터 칸 카테고리 링크 — 넓은 목록은 필터 칸이 없어 넘기지 않는다 */
  categoryHref?: (categoryId: string) => React.ReactNode;
  currentCategoryId?: string;
  /** 필터 칸 없는 넓은 목록(검색) — 가격은 정렬 줄의 select, 6열 */
  wide?: boolean;
  /** 모바일 개수 줄 문구 — 없으면 「상품 N개」 */
  countLabel?: string;
}) {
  const store = useStore();
  const krw = (store.market?.currency ?? "KRW") === "KRW";
  const value: FilterValue = {
    minPrice: search.min,
    maxPrice: search.max,
    freeShipping: search.free,
  };
  const onFilter = (next: FilterValue) =>
    onSearch({
      ...search,
      min: next.minPrice,
      max: next.maxPrice,
      free: next.freeShipping,
      page: undefined,
    });
  const applied = [
    search.min !== undefined || search.max !== undefined
      ? priceLabel(search.min, search.max)
      : null,
    search.free ? m.list_filter_free_shipping() : null,
  ].filter((v): v is string => v !== null);
  const sort = (
    <SortMenu
      options={PRODUCT_SORTS}
      value={search.sort ?? "recommend"}
      onChange={(next) => onSearch({ ...search, sort: next, page: undefined })}
    />
  );
  return (
    <div className={wide ? undefined : "lg:grid lg:grid-cols-[180px_1fr] lg:gap-7"}>
      {wide ? null : (
        <FilterSidebar
          value={value}
          onChange={onFilter}
          showPrice={krw}
          categories={categories}
          categoryHref={categoryHref ?? (() => null)}
          currentCategoryId={currentCategoryId}
        />
      )}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-ink border-b pb-3">
          <span className="font-bold text-body-lg lg:hidden">
            {countLabel ?? m.list_count({ count: page.totalElements.toLocaleString("ko-KR") })}
          </span>
          <span className="hidden lg:block">{sort}</span>
          <div className="flex items-center gap-2 lg:hidden">
            <FilterSheetButton
              value={value}
              onChange={onFilter}
              showPrice={krw}
              resultCount={page.totalElements}
            />
            {sort}
          </div>
          {wide && krw ? (
            <span className="hidden lg:block">
              <PriceSelect value={value} onChange={onFilter} />
            </span>
          ) : null}
          {!wide && applied.length > 0 ? (
            <span className="hidden text-meta text-muted lg:block">
              {m.list_applied({ filters: applied.join(" · ") })}
            </span>
          ) : null}
        </div>
        {applied.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-3 lg:hidden">
            {applied.map((label) => (
              <span key={label} className="bg-chip px-2.5 py-1 font-bold text-caption">
                {label}
              </span>
            ))}
          </div>
        ) : null}
        <div className="pt-4">
          <ProductGrid
            products={page.contents}
            emptyText={emptyText}
            strike
            columns={wide ? 6 : 4}
          />
        </div>
        <Pager
          page={page.page}
          totalPages={page.totalPages}
          onPage={(next) => onSearch({ ...search, page: next })}
        />
      </div>
    </div>
  );
}
