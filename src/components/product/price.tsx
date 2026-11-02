import { type ProductCard, priceViewOf } from "@sayren/storefront-sdk";
import { formatMoney } from "../../lib/format";

type Size = "card" | "card-sm" | "detail";

const PRICE_SIZE: Record<Size, string> = {
  "card-sm": "text-[15px]",
  card: "text-[17px]",
  detail: "text-3xl",
};

/**
 * 가격 — 낼 가격·취소선·할인율은 `priceViewOf`가 정한다(화면에서 계산하지 않는다).
 * 취소선 가격이 없으면 할인율도 보이지 않는다.
 */
export function Price({
  product,
  size = "card",
  strike = false,
  muted = false,
}: {
  product: Pick<ProductCard, "salePrice" | "discountedPrice" | "originalPrice" | "currency">;
  size?: Size;
  /** 취소선 가격을 위에 따로 보인다(상세·기획전 카드) */
  strike?: boolean;
  /** 품절 — 가격을 흐리게 */
  muted?: boolean;
}) {
  const { price, compareAt, discountRate } = priceViewOf(product);
  return (
    <span className="flex flex-col gap-0.5">
      {strike && compareAt !== null ? (
        <s className="tabular text-faint text-meta">{formatMoney(compareAt, product.currency)}</s>
      ) : null}
      <span
        className={`tabular flex gap-1.5 font-black ${PRICE_SIZE[size]} ${muted ? "text-faint" : ""}`}
      >
        {compareAt !== null && discountRate ? (
          <span className={muted ? "" : "text-point"}>{discountRate}%</span>
        ) : null}
        {formatMoney(price, product.currency)}
      </span>
    </span>
  );
}
