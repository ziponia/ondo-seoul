import { createReviewRequestSchema } from "@sayren/storefront-sdk";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { MySubPage } from "../../../components/my/my-sub-page";
import { StarInput } from "../../../components/my/star-input";
import { ProductImage } from "../../../components/product/product-image";
import { m } from "../../../i18n";
import { formatDate } from "../../../lib/date";
import { formatMoney } from "../../../lib/format";
import { createReview, createReviewImageUpload, myReviewsQuery } from "../../../lib/my";
import { pointPolicyQuery } from "../../../lib/product-queries";

/**
 * 리뷰 작성 — 작성 가능한 주문상품(`reviews.listWritable`)에만 쓴다. 사진은 업로드 자리(`reviews.createImageUpload`)에
 * 올린 주소를 싣고, 본문 규칙은 SDK `createReviewRequestSchema`로 검사한다. 적립 예정액은 상점 적립 정책 값이다.
 */
export const Route = createFileRoute("/my/reviews/write/$orderItemId")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(myReviewsQuery()),
  head: () => ({ meta: [{ title: m.rw_title() }] }),
  component: ReviewWrite,
});

const MAX_PHOTOS = 5;
const MAX_LENGTH = 2000;

function ReviewWrite() {
  const { orderItemId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { writable } = useSuspenseQuery(myReviewsQuery()).data;
  const policy = useQuery(pointPolicyQuery()).data;
  const target = writable.find((w) => w.orderItemId === orderItemId);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ticket = await createReviewImageUpload({
        data: { filename: file.name, size: file.size },
      });
      if (!ticket.ok) throw new Error(ticket.message);
      const response = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file });
      if (!response.ok) throw new Error(String(response.status));
      return ticket.data.url;
    },
    onSuccess: (url) => setImages((current) => [...current, url].slice(0, MAX_PHOTOS)),
  });
  const input = { rating, content: content.trim(), ...(images.length ? { images } : {}) };
  const parsed = createReviewRequestSchema.safeParse(input);
  const submit = useMutation({
    mutationFn: () => createReview({ data: { orderItemId, ...input } }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries({ queryKey: ["my"] });
      await navigate({ to: "/my/reviews", search: { tab: "mine" } });
    },
  });
  const back = { label: m.rw_back({ count: writable.length }), to: "/my/reviews" as const };
  if (!target) {
    return (
      <MySubPage title={m.rw_title()} width="max-w-[728px]" back={back}>
        <p className="py-24 text-center text-body text-sub">{m.rw_missing()}</p>
      </MySubPage>
    );
  }
  const reward = policy?.reviewReward.enabled
    ? images.length > 0
      ? policy.reviewReward.photoPoint
      : policy.reviewReward.textPoint
    : 0;
  const scoreLabel = [m.rw_score_1, m.rw_score_2, m.rw_score_3, m.rw_score_4, m.rw_score_5][
    rating - 1
  ];
  return (
    <MySubPage title={m.rw_title()} width="max-w-[728px]" back={back}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed.success) submit.mutate();
        }}
        className="flex flex-col gap-7 px-4 pt-4 md:px-0 md:pt-0"
      >
        <div className="flex items-center gap-4 bg-surface p-4">
          <div className="w-16 shrink-0">
            <ProductImage
              product={{ name: target.productName, thumbnailUrl: target.thumbnailUrl }}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <b className="truncate text-body-lg">{target.productName}</b>
            <span className="text-body text-sub">
              {[target.optionName, m.rw_until({ date: formatDate(target.writableUntil) })]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="font-bold text-body-lg">{m.rw_question()}</p>
          <StarInput value={rating} onChange={setRating} size="text-[40px]" />
          <p className="text-body text-sub">
            {m.rw_score({ rating, label: scoreLabel?.() ?? "" })}
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="font-bold text-body">
            {m.rw_photos()}{" "}
            <span className="font-normal text-meta text-muted">
              {m.rw_photos_max({ count: MAX_PHOTOS })}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {images.length < MAX_PHOTOS ? (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 border border-dash border-dashed text-meta text-sub has-focus-visible:outline-2">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label={m.rw_photo_add()}
                  disabled={upload.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload.mutate(file);
                    event.target.value = "";
                  }}
                />
                <Plus size={20} aria-hidden />
                {images.length} / {MAX_PHOTOS}
              </label>
            ) : null}
            {images.map((src, index) => (
              <div key={src} className="relative h-24 w-24">
                <img src={src} alt="" className="h-full w-full bg-chip object-cover" />
                <button
                  type="button"
                  aria-label={m.rw_photo_remove({ index: index + 1 })}
                  onClick={() => setImages(images.filter((i) => i !== src))}
                  className="absolute top-1 right-1 grid h-6 w-6 place-items-center bg-ink/70 text-page"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          {upload.isError ? (
            <p role="alert" className="text-meta text-point">
              {m.rw_photo_failed()}
            </p>
          ) : null}
        </div>
        <label className="flex flex-col gap-2.5 font-bold text-body">
          {m.rw_content()}
          <textarea
            value={content}
            rows={7}
            maxLength={MAX_LENGTH}
            placeholder={m.rw_placeholder()}
            onChange={(event) => setContent(event.target.value)}
            className="border border-line-strong p-4 font-normal text-body-lg"
          />
          <span className="self-end font-normal text-meta text-muted">
            {content.length.toLocaleString("ko-KR")} / {MAX_LENGTH.toLocaleString("ko-KR")}
          </span>
        </label>
        {reward ? (
          <div className="flex items-center justify-between border border-ink px-4 py-3.5">
            <span className="text-body">
              {images.length > 0 ? m.rw_reward_photo() : m.rw_reward_text()}
            </span>
            <b className="text-lg">{formatMoney(reward)}</b>
          </div>
        ) : null}
        {submit.data && !submit.data.ok ? (
          <p role="alert" className="text-meta text-point">
            {submit.data.message}
          </p>
        ) : !parsed.success && content.length > 0 ? (
          <p className="text-meta text-point">{parsed.error.issues[0]?.message}</p>
        ) : null}
        <div className="fixed inset-x-0 bottom-0 z-30 grid gap-2 border-line border-t md:grid-cols-[1fr_2fr] bg-page px-4 pt-2.5 pb-3.5 md:static md:border-0 md:p-0">
          <Link
            to="/my/reviews"
            className="hidden h-14 place-items-center border border-line-strong font-bold text-body-lg md:grid"
          >
            {m.rw_cancel()}
          </Link>
          <button
            type="submit"
            disabled={!parsed.success || submit.isPending}
            className="h-14 bg-ink font-bold text-body-lg text-page disabled:bg-disabled"
          >
            {m.rw_submit()}
          </button>
        </div>
      </form>
    </MySubPage>
  );
}
