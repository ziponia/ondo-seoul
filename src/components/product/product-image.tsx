import type { ProductCard } from "@sayren/storefront-sdk";

/**
 * 상품 사진(4:5) — 사진이 없으면 같은 비율 자리에 상품 이름을 크게 둔다(빈 회색 상자를 두지 않는다).
 */
export function ProductImage({
  product,
  className = "",
}: {
  product: Pick<ProductCard, "name" | "thumbnailUrl">;
  className?: string;
}) {
  if (product.thumbnailUrl) {
    return (
      <img
        src={product.thumbnailUrl}
        alt={product.name}
        loading="lazy"
        className={`block aspect-[4/5] w-full bg-chip object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex aspect-[4/5] w-full items-end bg-surface p-4 font-black text-xl leading-tight tracking-[-0.03em] ${className}`}
    >
      {product.name}
    </span>
  );
}
