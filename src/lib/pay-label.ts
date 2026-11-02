import { m } from "../i18n";

const PROVIDER: Record<string, () => string> = {
  NAVERPAY: m.pay_label_NAVERPAY,
  KAKAOPAY: m.pay_label_KAKAOPAY,
  TOSSPAY: m.pay_label_TOSSPAY,
  PAYCO: m.pay_label_PAYCO,
  PAYPAL: m.pay_label_PAYPAL,
};

const METHOD: Record<string, () => string> = {
  CARD: m.pay_label_CARD,
  BANK_TRANSFER: m.pay_label_BANK_TRANSFER,
  VIRTUAL_ACCOUNT: m.pay_label_VIRTUAL_ACCOUNT,
  MOBILE: m.pay_label_MOBILE,
};

/** 주문의 결제수단 표기 — 간편결제는 결제사 이름, 그 밖은 수단 이름. 모르는 값은 그대로 */
export function paymentMethodLabel(method: string, provider: string | null): string {
  if (provider) return PROVIDER[provider]?.() ?? provider;
  return METHOD[method]?.() ?? method;
}
