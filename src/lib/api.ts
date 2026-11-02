import { createStorefrontClient } from "@sayren/storefront-sdk";
import type { PublicConfig } from "./config";

/** 브라우저용 — 서버 함수가 내려준 설정으로 만든다(결제창·결제 승인·결제 상태 조회에 쓴다) */
export function browserApi(config: PublicConfig) {
  return createStorefrontClient({
    baseUrl: config.apiBaseUrl,
    storeCode: config.storeCode,
    ...(config.demo ? { fetch: browserDemoFetch } : {}),
  });
}

/**
 * 데모 모드의 브라우저 fetch — 데모 결제 상태가 서버 메모리에 있어 서버의 데모 API로 넘긴다(`/api/demo-api`).
 * 데모가 아니면 쓰지 않는다.
 */
const browserDemoFetch: typeof globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  const base = new URL(apiBase(url));
  return fetch("/api/demo-api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: url.pathname.slice(base.pathname.length),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    }),
  });
};

/** 데모 SDK의 baseUrl(`…/storefront/v1`)까지 — 그 뒤가 API 경로다 */
function apiBase(url: URL): string {
  const marker = "/storefront/v1";
  const at = url.pathname.indexOf(marker);
  return `${url.origin}${url.pathname.slice(0, at + marker.length)}`;
}
