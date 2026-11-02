import {
  ApiError,
  claimStatusSchema,
  consentUpdateRequestSchema,
  createClaimRequestSchema,
  createCustomerInquiryRequestSchema,
  createReviewRequestSchema,
  memberAddressRequestSchema,
  orderItemStatusSchema,
  registerCouponRequestSchema,
  reviewImageUploadRequestSchema,
  updateProfileRequestSchema,
  updateReviewRequestSchema,
} from "@sayren/storefront-sdk";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buyerApi } from "./session.server";

/**
 * 마이페이지 — 모든 호출은 회원 토큰(HttpOnly 쿠키)으로 서버 함수에서 한다. 화면은 응답 값만 그린다.
 * 바꾸는 호출은 실패 문구를 돌려주고(4xx), 그 밖의 오류는 던진다.
 */

type Result<T = null> = { ok: true; data: T } | { ok: false; message: string; code: string };

async function attempt<T>(run: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      return { ok: false, message: error.message, code: error.code };
    }
    throw error;
  }
}

const pageInput = z.object({
  page: z.number().int().min(1).optional(),
  size: z.number().int().max(50).optional(),
});

// ── 조회 ──

const getOrders = createServerFn({ method: "GET" })
  .validator(
    pageInput.extend({
      status: orderItemStatusSchema.optional(),
      from: z.string().optional(),
    }),
  )
  .handler(({ data }) => buyerApi().myOrders.list(data));

export const myOrdersQuery = (
  params: z.infer<typeof pageInput> & {
    status?: z.infer<typeof orderItemStatusSchema>;
    from?: string;
  } = {},
) =>
  queryOptions({ queryKey: ["my", "orders", params], queryFn: () => getOrders({ data: params }) });

const getOrder = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(({ data }) =>
    buyerApi()
      .myOrders.get(data.orderId)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
  );

export const myOrderDetailQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["my", "order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
  });

const getDelivery = createServerFn({ method: "GET" })
  .validator(z.object({ orderItemId: z.string().min(1) }))
  .handler(({ data }) => attempt(() => buyerApi().myOrders.getDelivery(data.orderItemId)));

export const deliveryQuery = (orderItemId: string) =>
  queryOptions({
    queryKey: ["my", "delivery", orderItemId],
    queryFn: () => getDelivery({ data: { orderItemId } }),
  });

const getClaims = createServerFn({ method: "GET" })
  .validator(pageInput.extend({ status: claimStatusSchema.optional() }))
  .handler(({ data }) => buyerApi().myClaims.list(data));

export const myClaimsQuery = () =>
  queryOptions({ queryKey: ["my", "claims"], queryFn: () => getClaims({ data: { size: 50 } }) });

const getPoints = createServerFn({ method: "GET" }).handler(async () => {
  const api = buyerApi();
  const [points, history] = await Promise.all([
    api.member.getPoints(),
    api.member.listPointHistory({ size: 50 }),
  ]);
  return { points, history };
});

export const pointsQuery = () =>
  queryOptions({ queryKey: ["my", "points"], queryFn: () => getPoints() });

const getCoupons = createServerFn({ method: "GET" }).handler(async () => {
  const api = buyerApi();
  const [available, used, expired] = await Promise.all([
    api.me.coupons({ status: "available" }),
    api.me.coupons({ status: "used" }),
    api.me.coupons({ status: "expired" }),
  ]);
  return { available, used, expired };
});

export const myCouponsQuery = () =>
  queryOptions({ queryKey: ["my", "coupons"], queryFn: () => getCoupons() });

const getWishlist = createServerFn({ method: "GET" }).handler(() =>
  buyerApi().member.listWishlist({ size: 50 }),
);

export const wishlistQuery = () =>
  queryOptions({ queryKey: ["my", "wishlist"], queryFn: () => getWishlist() });

const getReviews = createServerFn({ method: "GET" }).handler(async () => {
  const api = buyerApi();
  const [writable, mine] = await Promise.all([
    api.reviews.listWritable(),
    api.reviews.listMine({ size: 50 }),
  ]);
  return { writable, mine };
});

export const myReviewsQuery = () =>
  queryOptions({ queryKey: ["my", "reviews"], queryFn: () => getReviews() });

const getInquiries = createServerFn({ method: "GET" }).handler(() =>
  buyerApi().inquiries.listMine({ size: 50 }),
);

export const myInquiriesQuery = () =>
  queryOptions({ queryKey: ["my", "inquiries"], queryFn: () => getInquiries() });

const getCustomerInquiries = createServerFn({ method: "GET" }).handler(() =>
  buyerApi().me.customerInquiries.list({ size: 50 }),
);

export const customerInquiriesQuery = () =>
  queryOptions({ queryKey: ["my", "support"], queryFn: () => getCustomerInquiries() });

const getCustomerInquiry = createServerFn({ method: "GET" })
  .validator(z.object({ inquiryId: z.string().min(1) }))
  .handler(({ data }) =>
    buyerApi()
      .me.customerInquiries.get(data.inquiryId)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
  );

export const customerInquiryQuery = (inquiryId: string) =>
  queryOptions({
    queryKey: ["my", "support", inquiryId],
    queryFn: () => getCustomerInquiry({ data: { inquiryId } }),
  });

const getAccount = createServerFn({ method: "GET" }).handler(async () => {
  const api = buyerApi();
  const [consents, addresses, identities] = await Promise.all([
    api.member.consents(),
    api.member.listAddresses(),
    api.auth.identities(),
  ]);
  return { consents, addresses, identities };
});

export const accountQuery = () =>
  queryOptions({ queryKey: ["my", "account"], queryFn: () => getAccount() });

// ── 바꾸기 ──

export const decidePurchase = createServerFn({ method: "POST" })
  .validator(z.object({ orderItemId: z.string().min(1) }))
  .handler(({ data }) => attempt(() => buyerApi().myOrders.decidePurchase(data.orderItemId)));

const claimInput = createClaimRequestSchema.extend({ orderItemId: z.string().min(1) });

export const previewClaim = createServerFn({ method: "POST" })
  .validator(claimInput)
  .handler(({ data: { orderItemId, ...body } }) =>
    attempt(() => buyerApi().myClaims.preview(orderItemId, body)),
  );

export const createClaim = createServerFn({ method: "POST" })
  .validator(claimInput)
  .handler(({ data: { orderItemId, ...body } }) =>
    attempt(() => buyerApi().myClaims.create(orderItemId, body)),
  );

export const withdrawClaim = createServerFn({ method: "POST" })
  .validator(z.object({ claimId: z.string().min(1) }))
  .handler(({ data }) => attempt(() => buyerApi().myClaims.withdraw(data.claimId)));

export const createReviewImageUpload = createServerFn({ method: "POST" })
  .validator(reviewImageUploadRequestSchema)
  .handler(({ data }) => attempt(() => buyerApi().reviews.createImageUpload(data)));

export const createReview = createServerFn({ method: "POST" })
  .validator(createReviewRequestSchema.extend({ orderItemId: z.string().min(1) }))
  .handler(({ data: { orderItemId, ...body } }) =>
    attempt(() => buyerApi().reviews.create(orderItemId, body)),
  );

export const updateReview = createServerFn({ method: "POST" })
  .validator(updateReviewRequestSchema.extend({ reviewId: z.string().min(1) }))
  .handler(({ data: { reviewId, ...body } }) =>
    attempt(() => buyerApi().reviews.update(reviewId, body)),
  );

export const removeReview = createServerFn({ method: "POST" })
  .validator(z.object({ reviewId: z.string().min(1) }))
  .handler(({ data }) => attempt(() => buyerApi().reviews.remove(data.reviewId)));

export const registerCoupon = createServerFn({ method: "POST" })
  .validator(registerCouponRequestSchema)
  .handler(({ data }) => attempt(() => buyerApi().me.registerCoupon(data)));

export const toggleWishlist = createServerFn({ method: "POST" })
  .validator(z.object({ productId: z.string().min(1), on: z.boolean() }))
  .handler(({ data }) =>
    attempt(() =>
      data.on
        ? buyerApi().member.addWishlist(data.productId)
        : buyerApi().member.removeWishlist(data.productId),
    ),
  );

export const createCustomerInquiry = createServerFn({ method: "POST" })
  .validator(createCustomerInquiryRequestSchema)
  .handler(({ data }) => attempt(() => buyerApi().me.customerInquiries.create(data)));

export const updateProfile = createServerFn({ method: "POST" })
  .validator(updateProfileRequestSchema)
  .handler(({ data }) => attempt(() => buyerApi().member.updateMe(data)));

export const updateConsents = createServerFn({ method: "POST" })
  .validator(consentUpdateRequestSchema)
  .handler(({ data }) => attempt(() => buyerApi().member.updateConsents(data)));

export const saveAddress = createServerFn({ method: "POST" })
  .validator(memberAddressRequestSchema.and(z.object({ addressId: z.string().optional() })))
  .handler(({ data: { addressId, ...body } }) =>
    attempt(() =>
      addressId
        ? buyerApi().member.updateAddress(addressId, body)
        : buyerApi().member.createAddress(body),
    ),
  );

export const deleteAddress = createServerFn({ method: "POST" })
  .validator(z.object({ addressId: z.string().min(1) }))
  .handler(({ data }) => attempt(() => buyerApi().member.deleteAddress(data.addressId)));
