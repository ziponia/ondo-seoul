import type { ProductCard as ProductCardData } from "@sayren/storefront-sdk";
import { Link } from "@tanstack/react-router";
import { m } from "../../i18n";
import { Price } from "./price";
import { ProductImage } from "./product-image";

/** 상품 주소 값 — 상품번호가 있으면 번호, 옛 응답은 id(`product-link` 규칙) */
export function productParam(product: Pick<ProductCardData, "productNo" | "productId">): string {
  return String(product.productNo ?? product.productId);
}

/**
 * 상품 카드 — 사진, 이름, 가격, 별점, 무료배송·품절 배지. 값은 모두 카드 응답이다.
 * `rank`를 주면 사진 왼쪽 위에 순위를 보인다(홈 랭킹).
 */
export function ProductCard({
  product,
  rank,
  compact = false,
  badge,
}: {
  product: ProductCardData;
  rank?: number;
  /** 사진 왼쪽 위 글자 배지(신상품 등) */
  badge?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to="/p/$productNo"
      params={{ productNo: productParam(product) }}
      className="group flex min-w-0 flex-col gap-2"
    >
      <span className="relative block">
        <ProductImage product={product} />
        {rank !== undefined ? (
          <span className="absolute top-0 left-0 grid h-[26px] w-[26px] place-items-center bg-ink font-display font-extrabold text-[13px] text-page md:h-8 md:w-8 md:text-[15px]">
            {rank}
          </span>
        ) : null}
        {badge ? (
          <span className="absolute top-2 left-2 bg-page px-1.5 py-0.5 font-display font-extrabold text-[11px]">
            {badge}
          </span>
        ) : null}
        {product.soldOut ? (
          <span className="absolute inset-0 grid place-items-center bg-page/55 font-black text-lg">
            {m.product_sold_out()}
          </span>
        ) : null}
      </span>
      <span
        className={`line-clamp-2 leading-[1.45] group-hover:underline ${compact ? "text-meta" : "text-[15px]"}`}
      >
        {product.name}
      </span>
      {/* 목록 카드는 할인율·판매가만 — 정가 취소선은 상세에서 보인다 */}
      <Price product={product} size={compact ? "card-sm" : "card"} />
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-sub [&>*+*]:before:mr-1.5 [&>*+*]:before:text-line-strong [&>*+*]:before:content-['·']">
        {product.reviewCount > 0 ? (
          <span>
            <span className="sr-only">
              {m.product_rating({
                rating: product.averageRating.toFixed(1),
                count: product.reviewCount,
              })}
            </span>
            <span aria-hidden>
              <span className="text-ink">★</span> {product.averageRating.toFixed(1)} (
              {product.reviewCount.toLocaleString("ko-KR")})
            </span>
          </span>
        ) : null}
        {product.freeShipping ? <span>{m.product_free_shipping()}</span> : null}
        {product.availableInMarket ? null : <span>{m.product_not_in_market()}</span>}
      </span>
    </Link>
  );
}
