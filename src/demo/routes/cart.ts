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
import { memberState } from "../member-state";

/**
 * 데모 장바구니 — 비회원은 줄 목록을 장바구니 토큰 안에 담는다(바뀔 때마다 새 토큰을 `x-cart-token`으로 내려
 * SDK의 `onCartToken`이 쿠키를 바꾼다). 회원은 실제 API처럼 회원 장바구니(서버 메모리)이고,
 * 로그인·가입이 비회원 장바구니를 회원 장바구니에 합친다(`mergeGuestCart`).
 */
export interface Line {
  id: string;
  productId: string;
  optionId: string | null;
  quantity: number;
}

const PREFIX = "demo-cart.";

function linesOfToken(token: string | null | undefined): Line[] {
  if (!token?.startsWith(PREFIX)) return [];
  try {
    const lines = JSON.parse(atob(token.slice(PREFIX.length))) as Line[];
    return Array.isArray(lines) ? lines : [];
  } catch {
    return [];
  }
}

export function readLines(ctx: DemoContext): Line[] {
  const member = memberState(ctx);
  const lines = member ? member.cartLines : linesOfToken(ctx.cartToken);
  // 주문으로 넘어간 줄은 뺀다(실제 API는 결제 완료 때 장바구니에서 지운다)
  return lines.filter((line) => !consumedCartItems.has(line.id));
}

/** 로그인·가입 — 비회원 장바구니 줄을 회원 장바구니에 합친다(같은 상품·옵션은 수량을 더한다) */
export function mergeGuestCart(member: { cartLines: Line[] }, cartToken: string | undefined) {
  for (const line of linesOfToken(cartToken)) {
    const same = member.cartLines.find(
      (own) => own.productId === line.productId && own.optionId === line.optionId,
    );
    if (same) same.quantity = Math.min(999, same.quantity + line.quantity);
    else member.cartLines.push(line);
  }
}

/** 바뀐 줄을 저장한다 — 회원은 회원 장바구니, 비회원은 새 토큰 */
function save(ctx: DemoContext, lines: Line[]): Record<string, string> {
  const member = memberState(ctx);
  if (member) {
    member.cartLines = lines;
    return {};
  }
  return { "x-cart-token": tokenOf(lines) };
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
  return new DemoResponse(cartOf(ctx, lines), save(ctx, lines));
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
    return new DemoResponse(null, save(ctx, lines), 204);
  }),
];
