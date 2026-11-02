import { ApiError, createStorefrontClient } from "@sayren/storefront-sdk";
import { describe, expect, it } from "vitest";
import { DEMO_BASE_URL, demoFetch } from ".";
import { DEMO_SCENARIOS, type DemoScenario } from "./scenario";

/**
 * D-1 데모 API 계약 — 데모 응답이 실제 SDK 클라이언트의 스키마 검증(zod)을 지나는지 본다.
 * 데모 데이터가 SDK 계약과 어긋나면 화면이 데모에서만 열리고 실제 상점에서 깨진다.
 */
function sdk(scenario: DemoScenario, accessToken?: string) {
  return createStorefrontClient({
    baseUrl: DEMO_BASE_URL,
    storeCode: "ondo-demo",
    accessToken,
    fetch: demoFetch(scenario, "http://localhost:4010"),
  });
}

describe.each(DEMO_SCENARIOS)("데모 API 계약 — %s", (scenario) => {
  it("탐색 API가 SDK 스키마를 지난다", async () => {
    const api = sdk(scenario);
    const store = await api.store.get();
    expect(store.name).toBe("ONDO SEOUL");
    await api.catalog.listCategories();
    const products = await api.catalog.searchProducts({ sort: "latest", size: 8 });
    await api.catalog.searchProducts({ keyword: "코트", categoryId: "outer", freeShipping: true });
    const collections = await api.catalog.listCollections();
    for (const collection of collections.contents) {
      await api.catalog.getCollection(collection.slug);
      await api.catalog.listCollectionProducts(collection.slug, { sort: "manual" });
    }
    await api.catalog.listCoupons();
    await api.catalog.getPointPolicy();
    for (const card of products.contents.slice(0, 3)) {
      const product = await api.catalog.getProduct(String(card.productNo));
      await api.catalog.listProductReviews(product.productId, { sort: "helpful", hasImage: true });
      await api.catalog.listProductInquiries(product.productId);
      await api.catalog.getCouponBenefit(product.productId, { quantity: 1 });
    }
    if (scenario !== "empty") await api.catalog.getProduct("16");
    if (scenario === "empty") {
      await expect(api.catalog.getProduct("1")).rejects.toMatchObject({ status: 404 });
      expect(products.contents).toHaveLength(0);
      expect(collections.contents).toHaveLength(0);
    } else {
      expect(products.contents.length).toBeGreaterThan(0);
    }
  });
});

describe("데모 API 오류", () => {
  it("없는 경로는 ApiError로 알린다", async () => {
    await expect(sdk("default").catalog.getCollection("nope")).rejects.toBeInstanceOf(ApiError);
  });

  it("쿠폰 받기는 회원 전용이고, 받은 뒤에는 받음으로 보인다", async () => {
    await expect(sdk("default").me.downloadCoupon("cpn_demo_welcome")).rejects.toMatchObject({
      status: 401,
    });
    const member = sdk("default", "demo-member-test");
    await member.me.downloadCoupon("cpn_demo_welcome");
    const coupons = await member.catalog.listCoupons();
    expect(coupons.contents.find((c) => c.couponId === "cpn_demo_welcome")?.downloaded).toBe(true);
    await expect(member.me.downloadCoupon("cpn_demo_socks")).rejects.toMatchObject({
      code: "COUPON_NOT_STARTED",
    });
  });
});

describe("데모 장바구니", () => {
  it("담기·수량·삭제가 토큰으로 이어지고 응답이 SDK 스키마를 지난다", async () => {
    let token: string | undefined;
    const api = createStorefrontClient({
      baseUrl: DEMO_BASE_URL,
      storeCode: "ondo-demo",
      cartToken: () => token,
      onCartToken: (next) => {
        token = next;
      },
      fetch: demoFetch("default", "http://localhost:4010"),
    });
    const product = await api.catalog.getProduct("1");
    const variant = product.variants.find((v) => !v.soldOut);
    let cart = await api.cart.addItem({
      productId: product.productId,
      optionId: variant?.variantId,
      quantity: 1,
    });
    cart = await api.cart.addItem({
      productId: product.productId,
      optionId: variant?.variantId,
      quantity: 2,
    });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(3);
    const id = cart.items[0]?.cartItemId ?? "";
    cart = await api.cart.updateItem(id, { quantity: 1 });
    expect(cart.summary.totalAmount).toBe(cart.items[0]?.totalPrice);
    await api.cart.removeItem(id);
    const ticket = await api.cart.createInputImageUpload({ filename: "logo.png", size: 4 });
    expect(ticket.uploadUrl).toContain("/api/demo-upload");
    expect((await api.cart.get()).items).toHaveLength(0);
  });

  it("로그인하면 비회원 장바구니가 회원 장바구니로 합쳐지고 그 뒤 담기도 회원 장바구니에 남는다", async () => {
    let guestToken: string | undefined;
    const guest = createStorefrontClient({
      baseUrl: DEMO_BASE_URL,
      storeCode: "ondo-demo",
      cartToken: () => guestToken,
      onCartToken: (next) => {
        guestToken = next;
      },
      fetch: demoFetch("default", "http://localhost:4010"),
    });
    const product = await guest.catalog.getProduct("4");
    const variant = product.variants.find((v) => !v.soldOut);
    await guest.cart.addItem({
      productId: product.productId,
      optionId: variant?.variantId,
      quantity: 1,
    });

    const res = await demoFetch("default", "http://localhost:4010")(`${DEMO_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ondo@example.com",
        password: "demo-pass",
        cartToken: guestToken,
      }),
    });
    const { accessToken } = ((await res.json()) as { data: { accessToken: string } }).data;
    const member = sdk("default", accessToken);
    expect((await member.cart.get()).items.map((item) => item.productId)).toEqual([
      product.productId,
    ]);
    await member.cart.addItem({
      productId: product.productId,
      optionId: variant?.variantId,
      quantity: 1,
    });
    expect((await member.cart.get()).items[0]?.quantity).toBe(2);
  });
});

describe("데모 주문서·결제", () => {
  it("최대 할인·적립금으로 결제를 시작하고 승인하면 주문이 하나 생기고 쿠폰·적립금이 쓰인다", async () => {
    const { issueDemoToken } = await import("./member-state");
    const token = issueDemoToken();
    const api = sdk("default", token);
    const checkout = await api.checkout.create({
      directItem: { productId: "prd_demo_1", quantity: 1 },
    });
    const best = await api.checkout.bestCoupons(checkout.checkoutId);
    await api.checkout.applicableCoupons(checkout.checkoutId);
    const pricing = await api.checkout.pricing(checkout.checkoutId, {
      coupons: best.applications,
      pointAmount: 3500,
    });
    expect(pricing.coupons.every((c) => c.applied)).toBe(true);
    expect(pricing.amounts.pointAmount).toBe(3500);
    const [address] = await api.member.listAddresses();
    const start = await api.checkout.startPayment(checkout.checkoutId, {
      option: { pg: "tosspayments", method: "CARD" },
      returnUrl: "http://localhost:4010/checkout/return",
      shippingAddress: {
        addressId: address.addressId,
        receiverName: address.receiverName,
        phone: address.phone,
        zipCode: address.zipCode,
        address1: address.address1,
      },
      coupons: best.applications,
      pointAmount: 3500,
    });
    expect(start.amounts.totalAmount).toBe(pricing.amounts.totalAmount);
    const status = await api.payments.getStatus(start.paymentId);
    expect(status.result).toBe("PENDING");
    // 같은 승인을 두 번 불러도 주문은 하나다
    const pay = new URL(start.payUrl ?? "");
    const body = {
      attemptId: pay.searchParams.get("attemptId") ?? "",
      callbackToken: pay.searchParams.get("token") ?? "",
      pgToken: "demo",
    };
    const first = await api.payments.confirm(start.paymentId, body);
    const second = await api.payments.confirm(start.paymentId, body);
    expect(second.orderId).toBe(first.orderId);
    const order = await api.myOrders.get(first.orderId);
    expect(order.payment.totalAmount).toBe(pricing.amounts.totalAmount);
    expect((await api.member.me()).point).toBe(0);
    // 쓴 쿠폰은 다음 주문서에서 고를 수 없다
    const next = await api.checkout.create({
      directItem: { productId: "prd_demo_1", quantity: 1 },
    });
    const usedIds = best.applications.map((a) => a.issueId);
    const left = await api.checkout.applicableCoupons(next.checkoutId);
    expect(left.some((c) => usedIds.includes(c.issueId))).toBe(false);
  });

  it("거절을 보고하면 결과가 FAILED이고 다른 수단으로 다시 시작할 수 있다", async () => {
    const { issueDemoToken } = await import("./member-state");
    const api = sdk("default", issueDemoToken());
    const checkout = await api.checkout.create({
      directItem: { productId: "prd_demo_2", quantity: 1 },
    });
    const [address] = await api.member.listAddresses();
    const start = await api.checkout.startPayment(checkout.checkoutId, {
      option: { pg: "tosspayments", method: "CARD" },
      returnUrl: "http://localhost:4010/checkout/return",
      shippingAddress: {
        addressId: address.addressId,
        receiverName: address.receiverName,
        phone: address.phone,
        zipCode: address.zipCode,
        address1: address.address1,
      },
    });
    const pay = new URL(start.payUrl ?? "");
    await api.payments.reportFailure(start.paymentId, {
      attemptId: pay.searchParams.get("attemptId") ?? "",
      callbackToken: pay.searchParams.get("token") ?? "",
      category: "DECLINED",
      code: "CARD_LIMIT",
      message: "한도 초과",
    });
    const failed = await api.payments.getStatus(start.paymentId);
    expect(failed.result).toBe("FAILED");
    expect(failed.lastFailure?.code).toBe("CARD_LIMIT");
    const retry = await api.payments.retry(start.paymentId, {
      option: { pg: "naverpay", method: "EASY_PAY", provider: "NAVERPAY" },
    });
    expect(retry.payUrl).not.toBeNull();
    expect((await api.payments.getStatus(start.paymentId)).result).toBe("PENDING");
  });
});

describe("데모 회원 기록", () => {
  it("마이페이지 API가 SDK 스키마를 지나고 구매확정·클레임·리뷰·문의가 상태를 바꾼다", async () => {
    const { issueDemoToken } = await import("./member-state");
    const api = sdk("default", issueDemoToken());
    const orders = await api.myOrders.list({ size: 20 });
    expect(orders.totalElements).toBeGreaterThan(3);
    const items = orders.contents.flatMap((o) => o.items);
    const delivered = items.find((i) => i.status === "DELIVERED" && !i.claimStatus);
    const preparing = items.find((i) => i.status === "CONFIRMED");
    const shipping = items.find((i) => i.status === "DELIVERING");
    if (!delivered || !preparing || !shipping) throw new Error("데모 기록이 비었습니다");
    expect(preparing.step?.claimable.map((c) => c.action)).toContain("CANCEL");
    await api.myOrders.get(orders.contents[0]?.orderId ?? "");
    expect((await api.myOrders.getDelivery(shipping.orderItemId)).carrierName).toBeTruthy();

    // 상품 준비 취소는 바로 끝나고, 배송 완료는 반품 신청 → 철회
    await api.myClaims.preview(preparing.orderItemId, { type: "CANCEL", reason: "WRONG_ORDER" });
    await api.myClaims.create(preparing.orderItemId, { type: "CANCEL", reason: "WRONG_ORDER" });
    const ret = await api.myClaims.create(delivered.orderItemId, {
      type: "RETURN",
      reason: "DEFECTIVE",
      reasonDetail: "봉제선이 터졌습니다",
    });
    await api.myClaims.withdraw(ret.claimId);
    const claims = await api.myClaims.list();
    expect(claims.contents.find((c) => c.claimId === ret.claimId)?.status).toBe("WITHDRAWN");

    // 구매확정 → 리뷰 쓰기 → 적립
    await api.myOrders.decidePurchase(delivered.orderItemId);
    const writable = await api.reviews.listWritable();
    expect(writable.some((w) => w.orderItemId === delivered.orderItemId)).toBe(true);
    const before = (await api.member.getPoints()).balance;
    const created = await api.reviews.create(delivered.orderItemId, {
      rating: 5,
      content: "핏이 좋고 원단이 두툼합니다. 다시 사고 싶습니다.",
    });
    expect((await api.member.getPoints()).balance).toBe(before + created.rewardPoint);
    await api.reviews.update(created.reviewId, { rating: 4 });
    await api.reviews.listMine();
    await api.reviews.remove(created.reviewId);

    await api.member.listPointHistory();
    await api.me.coupons();
    await api.me.coupons({ status: "expired" });
    await api.me.registerCoupon({ code: "ondo-vip-2026" });
    await expect(api.me.registerCoupon({ code: "ONDO-VIP-2026" })).rejects.toMatchObject({
      code: "COUPON_CODE_USED",
    });
    await api.member.listWishlist();
    await api.member.addWishlist("prd_demo_3");
    await api.member.removeWishlist("prd_demo_3");
    await api.inquiries.listMine({ answered: true });
    const inquiry = await api.me.customerInquiries.create({
      category: "DELIVERY",
      title: "배송 문의",
      content: "언제 출고됩니까?",
    });
    await api.me.customerInquiries.get(inquiry.inquiryId);
    await api.me.customerInquiries.list();
    await api.member.updateMe({ name: "김온도", marketingAgreed: false });
    await api.member.consents();
    await api.member.updateConsents({ marketing: true });
    const [address] = await api.member.listAddresses();
    if (!address) throw new Error("배송지가 비었습니다");
    await api.member.updateAddress(address.addressId, {
      alias: "회사",
      isDefault: true,
      receiverName: address.receiverName,
      phone: address.phone,
      zipCode: address.zipCode,
      address1: address.address1,
    });
  });
});

describe("데모 해외 구매자", () => {
  it("해외 권역 주문서는 USD·국제 배송비·PayPal이고 해외 주소로 결제를 시작한다", async () => {
    const { issueDemoToken } = await import("./member-state");
    const api = sdk("global", issueDemoToken());
    const checkout = await api.checkout.create({
      directItem: { productId: "prd_demo_1", quantity: 1 },
    });
    expect(checkout.currency).toBe("USD");
    expect(checkout.couponsEnabled).toBe(false);
    expect(checkout.points).toBeNull();
    expect(checkout.paymentOptions.map((o) => o.pg)).toEqual(["paypal"]);
    const quote = await api.checkout.quoteDelivery(checkout.checkoutId, { countryCode: "US" });
    expect(quote.amounts.deliveryFee).toBeGreaterThan(0);
    const [option] = checkout.paymentOptions;
    if (!option) throw new Error("결제수단이 비었습니다");
    const { label: _l, pgName: _p, ...pay } = option;
    const start = await api.checkout.startPayment(checkout.checkoutId, {
      option: pay,
      returnUrl: "http://localhost:4010/checkout/return",
      shippingAddress: {
        countryCode: "US",
        receiverName: "Emma Park",
        phone: "+12135550123",
        postalCode: "90012",
        region: "CA",
        city: "Los Angeles",
        address1: "100 Main St",
      },
    });
    expect(start.amounts.totalAmount).toBe(quote.amounts.totalAmount);
  });
});
