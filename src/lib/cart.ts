import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buyerApi, readCartToken, readSession } from "./session.server";

/**
 * 장바구니 — 서버 장바구니가 원천이다(브라우저에 따로 두지 않는다). 토큰은 HttpOnly 쿠키.
 * 금액·합계는 응답 값을 그대로 쓴다.
 */
const EMPTY = {
  items: [],
  summary: {
    currency: "KRW",
    productAmount: 0,
    deliveryFee: 0,
    totalAmount: 0,
    requiresShipping: false,
  },
} as const;

const getCart = createServerFn({ method: "GET" }).handler(async () => {
  // 회원 토큰도 장바구니 쿠키도 없으면 빈 장바구니다 — API를 부르지 않는다
  if (!readSession() && !readCartToken()) return EMPTY;
  return buyerApi().cart.get();
});

export const lineSchema = z.object({
  productId: z.string().min(1),
  optionId: z.string().optional(),
  quantity: z.number().int().min(1).max(999),
  /** 직접 입력값 — 서버 함수 본문으로만 오간다(주소·저장소에 두지 않는다) */
  customInputs: z
    .array(z.object({ inputId: z.string().min(1), value: z.string().max(2000) }))
    .max(20)
    .optional(),
});

export const addToCart = createServerFn({ method: "POST" })
  .validator(lineSchema)
  .handler(({ data }) => buyerApi().cart.addItem(data));

export const updateCartItem = createServerFn({ method: "POST" })
  .validator(
    z.object({ cartItemId: z.string().min(1), quantity: z.number().int().min(1).max(999) }),
  )
  .handler(({ data }) => buyerApi().cart.updateItem(data.cartItemId, { quantity: data.quantity }));

export const removeCartItems = createServerFn({ method: "POST" })
  .validator(z.object({ cartItemIds: z.array(z.string().min(1)).min(1).max(100) }))
  .handler(async ({ data }) => {
    const api = buyerApi();
    for (const id of data.cartItemIds) await api.cart.removeItem(id);
    return api.cart.get();
  });

export const cartQuery = () =>
  queryOptions({ queryKey: ["cart"], queryFn: () => getCart(), staleTime: 0 });

/** 직접 입력 이미지 업로드 자리 — 브라우저가 `uploadUrl`에 파일을 PUT하고 `url`을 입력값에 넣는다 */
export const createInputUpload = createServerFn({ method: "POST" })
  .validator(z.object({ filename: z.string().min(1).max(200), size: z.number().int().positive() }))
  .handler(({ data }) => buyerApi().cart.createInputImageUpload(data));

/**
 * 장바구니에서 고른 줄로 주문서를 만든다 — 주문서 id로 이동한다.
 * 픽업 장소를 주면 방문 수령 주문서다(받는 방법을 바꾸면 같은 줄로 주문서를 다시 만든다)
 */
export const createCartCheckout = createServerFn({ method: "POST" })
  .validator(
    z.object({
      cartItemIds: z.array(z.string().min(1)).min(1).max(100),
      pickupLocationId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const checkout = await buyerApi().checkout.create({
      cartItemIds: data.cartItemIds,
      ...(data.pickupLocationId
        ? { fulfillmentMethod: "PICKUP" as const, pickupLocationId: data.pickupLocationId }
        : {}),
    });
    return { checkoutId: checkout.checkoutId };
  });

/** 바로 구매 — 장바구니를 거치지 않고 주문서를 만든다(직접 입력값은 본문으로만 오간다) */
export const createDirectCheckout = createServerFn({ method: "POST" })
  .validator(lineSchema)
  .handler(async ({ data }) => {
    const checkout = await buyerApi().checkout.create({ directItem: data });
    return { checkoutId: checkout.checkoutId };
  });
