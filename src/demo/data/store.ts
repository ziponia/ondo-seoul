import type { storefrontStoreSchema } from "@sayren/storefront-sdk";
import type { z } from "zod";
import type { DemoScenario } from "../scenario";

type StoreInput = z.input<typeof storefrontStoreSchema>;

/**
 * 데모 상점 — 사업자 정보는 이 쇼케이스를 운영하는 에이바랩스 값이다. 실제 상점에 연결하면 상점 설정 값으로 바뀐다.
 * 화면 코드는 이 값을 직접 쓰지 않고 `store.get()` 응답으로만 읽는다.
 */
export function demoStore(scenario: DemoScenario): StoreInput {
  const global = scenario === "global";
  const closed = scenario === "closed";
  return {
    storeCode: "ondo-demo",
    name: "ONDO SEOUL",
    logoUrl: null,
    customerCenterPhone: "010-9003-6094",
    businessHours: null,
    businessName: "주식회사 에이바랩스",
    representativeName: "이지훈",
    businessNumber: "8368703668",
    mailOrderSalesNumber: "2024-부천원미-2427",
    businessAddress: "경기도 부천시 원미구 길주로 284, 2층 221-127호(중동, 헤리움 메트로타워)",
    customerCenterEmail: "sayren-team@avarlabs.com",
    privacyOfficerName: null,
    privacyOfficerEmail: null,
    guestCheckout: false,
    loginMethods: ["password", "kakao", "naver", "google"],
    checkoutAvailable: !closed,
    checkoutMode: closed ? null : "TEST",
    checkoutUnavailableReason: closed ? "PAYMENT_NOT_CONFIGURED" : null,
    markets: [
      { marketId: "kr", name: "대한민국", currency: "KRW", countries: ["KR"], locales: ["ko"] },
      {
        marketId: "us",
        name: "United States",
        currency: "USD",
        countries: ["US"],
        locales: ["en"],
      },
      { marketId: "jp", name: "日本", currency: "JPY", countries: ["JP"], locales: ["ja"] },
    ],
    market: global
      ? { marketId: "us", currency: "USD", matched: true, couponsEnabled: false }
      : { marketId: "kr", currency: "KRW", matched: true, couponsEnabled: true },
    locale: global ? "en" : "ko",
    defaultLocale: "ko",
  };
}
