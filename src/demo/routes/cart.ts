import {
  demoImageUrl,
  findDemoProduct,
  isSoldOut,
  marketPrice,
  productName,
} from "../data/catalog";
import { consumedCartItems } from "../data/commerce";
import { toDetail } from "../data/product-detail";
import { DemoApiError, type DemoContext, DemoResponse, type DemoRoute, route } from "../http";

/**
 * 데모 장바구니 — 줄 목록을 장바구니 토큰 안에 담는다(서버 메모리 없이 여러 인스턴스에서 같다).
 * 바뀔 때마다 새 토큰을 `x-cart-token`으로 내려 SDK의 `onCartToken`이 쿠키를 바꾼다.
 */
interface Line {
  id: string;
  productId: string;
  optionId: string | null;
  quantity: number;
}

const PREFIX = "demo-cart.";

export function readLines(ctx: DemoContext): Line[] {
  const token = ctx.cartToken;
  if (!token?.startsWith(PREFIX)) return [];
  try {
    const lines = JSON.parse(atob(token.slice(PREFIX.length))) as Line[];
    // 주문으로 넘어간 줄은 뺀다(실제 API는 결제 완료 때 장바구니에서 지운다)
    return Array.isArray(lines) ? lines.filter((line) => !consumedCartItems.has(line.id)) : [];
  } catch {
    return [];
  }
}

function tokenOf(lines: Line[]): string {
  return PREFIX + btoa(JSON.stringify(lines));
}

/** 장바구니 응답 — 금액은 데모 상품 가격으로 서버(데모)가 정한다 */
export function cartOf(ctx: DemoContext, lines: Line[]) {
  const items = lines.flatMap((line) => {
    const product = findDemoProduct(line.productId);
    if (!product) return [];
    const detail = toDetail(ctx, product);
    const variant =
      detail.variants.find((v) => v.variantId === line.optionId) ?? detail.variants[0];
    const price = marketPrice(ctx, product);
    const unitPrice = (price.discounted ?? price.sale) + (variant?.additionalPrice ?? 0);
    const soldOut = isSoldOut(ctx, product) || variant?.soldOut === true;
    return [
      {
        cartItemId: line.id,
        productId: product.id,
        productNo: product.no,
        productName: productName(ctx, product),
        thumbnailUrl: demoImageUrl(ctx, product.image),
        optionId: variant?.variantId ?? null,
        optionName: variant?.name || null,
        quantity: line.quantity,
        unitPrice,
        totalPrice: unitPrice * line.quantity,
        fulfillment: { type: "SHIPPING", requiresShipping: true, method: "CARRIER" },
        purchasable: !soldOut,
        unpurchasableReason: soldOut ? ("SOLD_OUT" as const) : null,
        originalUnitPrice: price.sale,
      },
    ];
  });
  const purchasable = items.filter((item) => item.purchasable);
  const productAmount = purchasable.reduce((sum, item) => sum + item.totalPrice, 0);
  const allFree = purchasable.every((item) => findDemoProduct(item.productId)?.freeShipping);
  const global = ctx.scenario === "global";
  // 해외 권역 배송비는 주문서에서 배송지로 계산한다(장바구니에서는 0)
  const deliveryFee =
    global || purchasable.length === 0 || allFree || productAmount >= 50000 ? 0 : 3000;
  return {
    items: items.map(({ originalUnitPrice: _, ...item }) => item),
    summary: {
      currency: global ? "USD" : "KRW",
      productAmount,
      deliveryFee,
      totalAmount: productAmount + deliveryFee,
      requiresShipping: purchasable.length > 0,
    },
  };
}

function respond(ctx: DemoContext, lines: Line[]) {
  return new DemoResponse(cartOf(ctx, lines), { "x-cart-token": tokenOf(lines) });
}

export const cartRoutes: DemoRoute[] = [
  route("GET", "/cart", ({ ctx }) => cartOf(ctx, ctx.scenario === "empty" ? [] : readLines(ctx))),

  route("POST", "/cart/items", ({ ctx, body }) => {
    const input = body as { productId: string; optionId?: string; quantity: number };
    const product = findDemoProduct(input.productId);
    if (!product) throw new DemoApiError(404, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다");
    const variant = toDetail(ctx, product).variants.find((v) => v.variantId === input.optionId);
    if (isSoldOut(ctx, product) || variant?.soldOut) {
      throw new DemoApiError(409, "OUT_OF_STOCK", "품절된 옵션입니다");
    }
    const lines = readLines(ctx);
    const same = lines.find(
      (line) => line.productId === product.id && line.optionId === (input.optionId ?? null),
    );
    if (same) same.quantity = Math.min(999, same.quantity + input.quantity);
    else {
      lines.push({
        id: `ci_${crypto.randomUUID().slice(0, 12)}`,
        productId: product.id,
        optionId: input.optionId ?? null,
        quantity: input.quantity,
      });
    }
    return respond(ctx, lines);
  }),

  route("PATCH", "/cart/items/:id", ({ ctx, params, body }) => {
    const input = body as { quantity?: number; optionId?: string };
    const lines = readLines(ctx);
    const line = lines.find((l) => l.id === params.id);
    if (!line)
      throw new DemoApiError(404, "CART_ITEM_NOT_FOUND", "장바구니 상품을 찾을 수 없습니다");
    if (input.quantity) line.quantity = input.quantity;
    if (input.optionId) line.optionId = input.optionId;
    return respond(ctx, lines);
  }),

  route("DELETE", "/cart/items/:id", ({ ctx, params }) => {
    const lines = readLines(ctx).filter((l) => l.id !== params.id);
    return new DemoResponse(null, { "x-cart-token": tokenOf(lines) }, 204);
  }),
];
