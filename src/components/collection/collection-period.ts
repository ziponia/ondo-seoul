import type { StorefrontCollection } from "@sayren/storefront-sdk";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";

/** 기획전 기간 — 시작·종료가 없으면 상시 */
export function collectionPeriod(
  collection: Pick<StorefrontCollection, "startsAt" | "endsAt">,
): string {
  const { startsAt, endsAt } = collection;
  if (startsAt && endsAt) {
    return m.collection_period({ from: formatDate(startsAt), to: formatDate(endsAt) });
  }
  if (endsAt) return m.coupon_until({ date: formatDate(endsAt) });
  if (startsAt) return m.collection_period_from({ from: formatDate(startsAt) });
  return m.collection_period_always();
}

/** 마감 임박 배지 — 종료까지 3일 이하이면 「N일 남음」, 오늘 끝나면 「오늘 마감」 */
export function collectionEndingLabel(
  collection: Pick<StorefrontCollection, "endsAt">,
  now: Date,
): string | null {
  if (!collection.endsAt) return null;
  const days = Math.ceil((new Date(collection.endsAt).getTime() - now.getTime()) / 86_400_000);
  if (days < 0 || days > 3) return null;
  return days <= 0 ? m.collection_today_ends() : m.collection_days_left({ days });
}
