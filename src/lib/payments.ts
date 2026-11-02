import { createPayments, type Payments } from "@sayren/storefront-sdk/payments";
import { browserApi } from "./api";
import type { PublicConfig } from "./config";

/**
 * 결제 모듈 — 브라우저 전용. 결제 시작은 서버 함수(`startCheckoutPayment`)가 하고, 받은 값으로 `open`이 결제창을 연다.
 * 복귀 화면은 `result()`로 승인하고 결과를 읽는다. 같은 복귀를 두 번 읽어도 승인이 한 번이도록 설정마다 인스턴스 하나다.
 */
let cached: { key: string; payments: Payments } | null = null;

export function paymentsFor(config: PublicConfig): Payments {
  const key = `${config.apiBaseUrl}\u0000${config.storeCode}\u0000${config.demo}`;
  if (cached?.key !== key)
    cached = { key, payments: createPayments({ client: browserApi(config) }) };
  return cached.payments;
}
