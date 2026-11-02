/**
 * 결제 확인 화면의 결제수단·금액 — 결제 상태 조회(`payments.getStatus`)에는 금액이 없어 결제창을 열기 전에
 * 브라우저 세션에 적어 둔다. 화면 표기용 편의 값이라 없으면 그 줄을 그리지 않는다.
 */
export interface PayNote {
  label: string;
  amount: number;
  /** 결제 통화 — 없으면(옛 기록) 기본 통화 */
  currency?: string;
}

const key = (paymentId: string) => `ondo_pay_${paymentId}`;

export function savePayNote(paymentId: string, note: PayNote) {
  try {
    sessionStorage.setItem(key(paymentId), JSON.stringify(note));
  } catch {
    // 저장소를 못 쓰는 브라우저 — 확인 화면에서 금액 줄만 빠진다
  }
}

export function readPayNote(paymentId: string | null): PayNote | null {
  if (!paymentId) return null;
  try {
    const raw = sessionStorage.getItem(key(paymentId));
    const note = raw ? (JSON.parse(raw) as PayNote) : null;
    return typeof note?.label === "string" && typeof note.amount === "number" ? note : null;
  } catch {
    return null;
  }
}
