/**
 * 브라우저와 서버가 함께 쓰는 값만 둔다. `process.env`는 여기에 두지 않는다 —
 * 브라우저 번들에 들어가면 `process is not defined`로 화면이 깨진다(서버 값은 `config.server.ts`).
 */

/** 호스트에서 서브도메인을 뽑는다(`mystore.example.com` → `mystore`) */
export function storeCodeFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0] ?? "";
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  const labels = hostname.split(".");
  return labels.length >= 3 ? (labels[0] ?? null) : null;
}

/** 서버 함수가 브라우저로 내려주는 값 */
export interface PublicConfig {
  apiBaseUrl: string;
  storeCode: string;
  /** 데모 모드 — 브라우저도 데모 API로 부른다 */
  demo: boolean;
}

/** 구매자가 고른 배송 국가(ISO 3166-1) — 이 값이 판매 권역(통화·가격)을 정한다(`x-buyer-country`) */
export const COUNTRY_COOKIE = "ondo_country";

export function countryFromCookie(cookieHeader: string | null | undefined): string | null {
  const pair = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COUNTRY_COOKIE}=`));
  const value = pair?.slice(COUNTRY_COOKIE.length + 1).toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) ? value : null;
}
