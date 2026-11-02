/** 오늘 기준 상대 시각(ISO) — 데모 기간(기획전·쿠폰)이 언제 열어도 진행 중으로 보이게 한다 */
export function daysFromNow(days: number): string {
  const date = new Date();
  date.setUTCHours(15, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
