import { BASE_CURRENCY, currencySpecOf, minorToMajor } from "@sayren/storefront-sdk";
import { getLocale, m } from "../i18n";

const KRW = new Intl.NumberFormat("ko-KR");

/**
 * 통화 금액 — 금액은 그 통화의 최소 단위 정수다(API 응답 그대로, 화면에서 계산하지 않는다). 원화는 「12,000원」,
 * 그 밖의 통화는 `Intl` 통화 형식이다(「US$10.99」). 서버와 브라우저 결과가 같도록 로케일을 고정한다
 */
export function formatMoney(amount: number, currency: string = BASE_CURRENCY): string {
  if (currency === BASE_CURRENCY) return m.format_price({ amount: KRW.format(amount) });
  const { digits } = currencySpecOf(currency);
  // 외화는 화면 언어의 통화 표기를 따른다(영어 $86.00, 한국어 US$86.00)
  return new Intl.NumberFormat(getLocale() === "en" ? "en-US" : "ko-KR", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minorToMajor(amount, currency));
}

/** 국내 전화번호 표기 — 숫자만 저장된 값(`01000000000`)에 하이픈을 넣는다. 모르는 형식은 그대로 둔다 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^02\d{7,8}$/.test(digits)) return digits.replace(/^(02)(\d{3,4})(\d{4})$/, "$1-$2-$3");
  if (/^0\d{9,10}$/.test(digits)) return digits.replace(/^(0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");
  return phone;
}
