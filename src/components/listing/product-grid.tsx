import type { ProductCard as ProductCardData } from "@sayren/storefront-sdk";
import { m } from "../../i18n";
import { ProductCard } from "../product/product-card";

const LG_COLUMNS = { 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" } as const;

/** 목록 그리드 — 모바일 2열, 태블릿 3열, 데스크톱 4열(넓은 목록 5열) */
export function ProductGrid({
  products,
  emptyText = m.list_empty(),
  strike = false,
  columns = 4,
}: {
  products: ProductCardData[];
  emptyText?: string;
  strike?: boolean;
  /** 데스크톱 열 수 — 필터 칸 옆 4열, 넓은 목록 5·6열 */
  columns?: 4 | 5 | 6;
}) {
  if (products.length === 0) {
    return <p className="py-24 text-center text-body text-muted">{emptyText}</p>;
  }
  return (
    <div
      className={`grid grid-cols-2 gap-x-2 gap-y-7 md:grid-cols-3 md:gap-x-3.5 md:gap-y-11 ${LG_COLUMNS[columns]}`}
    >
      {products.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          strike={strike}
          compact={columns === 6}
        />
      ))}
    </div>
  );
}
