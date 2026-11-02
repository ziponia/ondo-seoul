/**
 * 날짜 표기 — 한국 상점이라 한국 시간으로 고정한다. 서버 렌더와 브라우저 하이드레이션 결과가 같아야
 * 화면이 다시 그려지지 않는다(시간대가 다른 브라우저에서도 같은 글자).
 */
const MONTH_DAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

const FULL_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function join(parts: Intl.DateTimeFormatPart[], separator: string): string {
  return parts
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join(separator);
}

/** 11.16 */
export function formatMonthDay(iso: string): string {
  return join(MONTH_DAY.formatToParts(new Date(iso)), ".");
}

/** 2026.11.16 */
export function formatDate(iso: string): string {
  return join(FULL_DATE.formatToParts(new Date(iso)), ".");
}

/** 11.10 10:00 */
export function formatDateTime(iso: string): string {
  const parts = DATE_TIME.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 2026.11.02 15:41 — 주문 일시처럼 연도까지 보여야 하는 시각 */
export function formatFullDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatDateTime(iso).split(" ")[1] ?? ""}`;
}
