import {
  ApiError,
  checkoutPricingRequestSchema,
  internationalShippingAddressInputSchema,
  memberAddressRequestSchema,
  paymentOptionSchema,
} from "@sayren/storefront-sdk";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import type { PublicConfig } from "./config";
import { API_BASE_URL, DEMO_MODE, resolveStoreCode } from "./config.server";
import { buyerApi, readSession } from "./session.server";

/**
 * 주문서 — 주문서·회원·배송지·쿠폰을 서버 함수로 읽고, 금액은 언제나 서버 계산(`checkout.pricing`)을 쓴다.
 * 결제 시작(`startPayment`)도 서버에서 하고, 받은 값으로 브라우저 결제 모듈이 결제창을 연다.
 */

const getCheckoutPage = createServerFn({ method: "GET" })
  .validator(z.object({ checkoutId: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!readSession()) return { kind: "login" as const };
    const api = buyerApi();
    try {
      const checkout = await api.checkout.get(data.checkoutId);
      const [me, addresses, coupons, best] = await Promise.all([
        api.member.me(),
        checkout.requiresShipping ? api.member.listAddresses() : Promise.resolve([]),
        checkout.couponsEnabled ? api.checkout.applicableCoupons(data.checkoutId) : [],
        checkout.couponsEnabled ? api.checkout.bestCoupons(data.checkoutId) : null,
      ]);
      return { kind: "ok" as const, checkout, me, addresses, coupons, best };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return { kind: "missing" as const };
      if (error instanceof ApiError && error.status === 401) return { kind: "login" as const };
      throw error;
    }
  });

export const checkoutPageQuery = (checkoutId: string) =>
  queryOptions({
    queryKey: ["checkout", checkoutId],
    queryFn: () => getCheckoutPage({ data: { checkoutId } }),
    staleTime: 0,
  });

const pricingInput = checkoutPricingRequestSchema.extend({ checkoutId: z.string().min(1) });

const getPricing = createServerFn({ method: "POST" })
  .validator(pricingInput)
  .handler(({ data: { checkoutId, ...body } }) => buyerApi().checkout.pricing(checkoutId, body));

export const pricingQuery = (input: z.infer<typeof pricingInput>) =>
  queryOptions({
    queryKey: ["checkout-pricing", input],
    queryFn: () => getPricing({ data: input }),
    placeholderData: (previous) => previous,
  });

/** 해외 배송비 미리보기 — 배송 국가가 바뀌면 다시 부른다 */
const getInternationalQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({ checkoutId: z.string().min(1), countryCode: z.string().regex(/^[A-Z]{2}$/) }),
  )
  .handler(({ data }) =>
    buyerApi().checkout.quoteDelivery(data.checkoutId, { countryCode: data.countryCode }),
  );

export const internationalQuoteQuery = (checkoutId: string, countryCode: string) =>
  queryOptions({
    queryKey: ["checkout-quote", checkoutId, countryCode],
    queryFn: () => getInternationalQuote({ data: { checkoutId, countryCode } }),
  });

export const addAddress = createServerFn({ method: "POST" })
  .validator(memberAddressRequestSchema)
  .handler(async ({ data }) => {
    const api = buyerApi();
    await api.member.createAddress(data);
    return api.member.listAddresses();
  });

const getPickupLocations = createServerFn({ method: "GET" })
  .validator(z.object({ productId: z.string().optional(), optionId: z.string().optional() }))
  .handler(({ data }) => buyerApi().pickupLocations.list(data));

export const pickupLocationsQuery = (input: { productId?: string; optionId?: string }) =>
  queryOptions({
    queryKey: ["pickup-locations", input],
    queryFn: () => getPickupLocations({ data: input }),
  });

/** 복귀 주소 — 실패 화면이 주문서로 돌아가고 다시 결제할 수 있도록 주문서 id를 싣는다 */
export function returnUrlFor(origin: string, checkoutId: string) {
  const url = new URL("/checkout/return", origin);
  url.searchParams.set("checkoutId", checkoutId);
  return url.toString();
}

/** 결제 시작 — 응답(`PaymentStart`)을 그대로 돌려주고 브라우저가 `payments.open`으로 연다 */
export const startCheckoutPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      checkoutId: z.string().min(1),
      option: paymentOptionSchema.optional(),
      shippingAddress: z
        .object({
          addressId: z.string().min(1),
          deliveryMemo: z.string().max(100).optional(),
        })
        .optional(),
      /** 해외 배송지 — 해외 권역 주문서는 주소록 대신 입력한 주소를 그대로 보낸다 */
      internationalAddress: internationalShippingAddressInputSchema.optional(),
      pickup: z.boolean(),
      coupons: checkoutPricingRequestSchema.shape.coupons,
      pointAmount: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const api = buyerApi();
    let shippingAddress: Parameters<typeof api.checkout.startPayment>[1]["shippingAddress"] =
      data.internationalAddress;
    if (!data.pickup && !shippingAddress && data.shippingAddress) {
      const saved = (await api.member.listAddresses()).find(
        (a) => a.addressId === data.shippingAddress?.addressId,
      );
      if (!saved) return { ok: false as const, message: "배송지를 다시 선택해 주십시오" };
      shippingAddress = {
        addressId: saved.addressId,
        receiverName: saved.receiverName,
        phone: saved.phone,
        zipCode: saved.zipCode,
        address1: saved.address1,
        ...(saved.address2 ? { address2: saved.address2 } : {}),
        ...(data.shippingAddress.deliveryMemo
          ? { deliveryMemo: data.shippingAddress.deliveryMemo }
          : {}),
      };
    }
    try {
      const start = await api.checkout.startPayment(data.checkoutId, {
        option: data.option,
        returnUrl: returnUrlFor(getRequestUrl().origin, data.checkoutId),
        shippingAddress,
        coupons: data.coupons,
        ...(data.pointAmount ? { pointAmount: data.pointAmount } : {}),
      });
      // `launch`는 PG별 임의 값이라 서버 함수 직렬화 타입에 맞지 않는다 — 문자열로 넘기고 브라우저가 `paymentStartSchema`로 읽는다
      return { ok: true as const, start: JSON.stringify(start) };
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) {
        return { ok: false as const, message: error.message };
      }
      throw error;
    }
  });

/** 브라우저 결제 모듈이 쓰는 공개 설정 */
export const getPublicConfig = createServerFn({ method: "GET" }).handler(
  (): PublicConfig => ({
    apiBaseUrl: API_BASE_URL,
    storeCode: resolveStoreCode(),
    demo: DEMO_MODE,
  }),
);
