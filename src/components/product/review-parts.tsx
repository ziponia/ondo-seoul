import type { PublicReview, ReviewSummary as Summary } from "@sayren/storefront-sdk";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { cdnImage } from "../../lib/cdn-image";
import { formatDate } from "../../lib/date";

const STARS = [5, 4, 3, 2, 1] as const;

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

/** 평균·분포 — `summary`(필터와 상관없는 상품 전체 기준)를 그대로 보인다 */
export function ReviewSummary({
  summary,
  picked,
  onPick,
}: {
  summary: Summary;
  picked?: number;
  onPick?: (star: number) => void;
}) {
  const total = Math.max(1, summary.totalCount);
  return (
    <div className="-mx-4 flex items-center gap-x-5 bg-surface px-4 py-4 md:mx-0 md:flex-wrap md:gap-x-14 md:gap-y-6 md:px-8 md:py-7">
      <div className="flex flex-col items-center gap-1">
        <span className="font-display font-extrabold text-[40px] tracking-[-0.04em] md:text-5xl">
          {summary.averageRating.toFixed(1)}
        </span>
        <span role="img" aria-label={m.rv_average({ rating: summary.averageRating.toFixed(1) })}>
          <span aria-hidden className="text-meta tracking-[1px] md:text-base md:tracking-[2px]">
            ★★★★★
          </span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-caption md:min-w-[240px] md:gap-1.5 md:text-meta">
        {STARS.map((star) => {
          const count = summary.distribution[String(star)] ?? 0;
          const pct = `${Math.round((count / total) * 100)}%`;
          const row = (
            <>
              <span className="w-7 text-left">{m.rv_star({ star })}</span>
              <span aria-hidden className="relative h-1.5 flex-1 bg-line">
                <span
                  className={`absolute inset-y-0 left-0 ${picked === star ? "bg-point" : "bg-ink"}`}
                  style={{ width: pct }}
                />
              </span>
              <span className="w-12 text-right text-sub">
                {onPick ? count.toLocaleString("ko-KR") : pct}
              </span>
            </>
          );
          return onPick ? (
            <button
              key={star}
              type="button"
              aria-pressed={picked === star}
              onClick={() => onPick(star)}
              className={`flex items-center gap-2.5 py-0.5 ${picked === star ? "font-bold" : ""}`}
            >
              {row}
            </button>
          ) : (
            <div key={star} className="flex items-center gap-2.5">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 리뷰 한 개 — 별점·작성자·날짜·옵션·본문·사진·셀러 답글 */
export function ReviewItem({ review }: { review: PublicReview }) {
  const store = useStore();
  return (
    <article className="flex flex-col gap-2.5 border-line border-b py-6">
      <div className="flex justify-between text-meta">
        <span>
          <span role="img" aria-label={m.rv_stars({ rating: review.rating })}>
            <span aria-hidden className="tracking-[1px]">
              {stars(review.rating)}
            </span>
          </span>
          <span className="ml-1.5 text-sub">{review.writerMaskedName}</span>
        </span>
        <span className="text-muted">{formatDate(review.createdAt)}</span>
      </div>
      {review.optionName ? (
        <span className="text-caption text-muted">{m.rv_option({ name: review.optionName })}</span>
      ) : null}
      <p className="text-body-lg leading-[1.7]">{review.content}</p>
      {review.images.length > 0 ? (
        <div className="flex gap-1.5">
          {review.images.map((src, i) => (
            <img
              // biome-ignore lint/suspicious/noArrayIndexKey: 같은 사진 주소가 반복될 수 있다
              key={i}
              src={cdnImage(src, 192)}
              alt=""
              loading="lazy"
              className="h-24 w-24 bg-chip object-cover"
            />
          ))}
        </div>
      ) : null}
      {review.sellerReply ? (
        <div className="flex flex-col gap-1 bg-surface px-4 py-3.5 text-body leading-[1.6]">
          <span className="font-bold text-caption">
            {m.rv_reply({ store: store.name })} · {formatDate(review.sellerReply.repliedAt)}
          </span>
          <span>{review.sellerReply.content}</span>
        </div>
      ) : null}
    </article>
  );
}
