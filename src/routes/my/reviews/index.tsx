import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MySubPage } from "../../../components/my/my-sub-page";
import { StarInput } from "../../../components/my/star-input";
import { ProductImage } from "../../../components/product/product-image";
import { useStore } from "../../../hooks/use-catalog";
import { m } from "../../../i18n";
import { cdnImage } from "../../../lib/cdn-image";
import { formatMonthDay } from "../../../lib/date";
import { formatMoney } from "../../../lib/format";
import { myReviewsQuery, removeReview, updateReview } from "../../../lib/my";
import { pointPolicyQuery } from "../../../lib/product-queries";

/**
 * 내 리뷰 — 작성 가능한 리뷰(`reviews.listWritable`)와 작성한 리뷰(`reviews.listMine`). 적립액은 상점 적립 정책 값이다.
 * 수정 기한이 지나지 않은 리뷰(`editable`)만 수정할 수 있다.
 */
export const Route = createFileRoute("/my/reviews/")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({ tab: z.enum(["writable", "mine"]).optional().catch(undefined) }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(myReviewsQuery()),
  head: () => ({ meta: [{ title: m.mr_title() }] }),
  component: MyReviews,
});

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

function MyReviews() {
  const { tab = "writable" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const store = useStore();
  const queryClient = useQueryClient();
  const { writable, mine } = useSuspenseQuery(myReviewsQuery()).data;
  const policy = useQuery(pointPolicyQuery()).data;
  const reward = policy?.reviewReward.enabled
    ? Math.max(policy.reviewReward.textPoint, policy.reviewReward.photoPoint)
    : 0;
  const remove = useMutation({
    mutationFn: (reviewId: string) => removeReview({ data: { reviewId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my"] }),
  });
  const [editing, setEditing] = useState<{
    reviewId: string;
    rating: number;
    content: string;
  } | null>(null);
  const save = useMutation({
    mutationFn: () => (editing ? updateReview({ data: editing }) : Promise.resolve(null)),
    onSuccess: async (result) => {
      if (!result?.ok) return;
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["my"] });
    },
  });
  const tabs = [
    {
      key: "writable" as const,
      label: m.mr_tab_writable({ count: writable.length }),
      short: m.mr_tab_writable_short({ count: writable.length }),
    },
    {
      key: "mine" as const,
      label: m.mr_tab_mine({ count: mine.contents.length }),
      short: m.mr_tab_mine({ count: mine.contents.length }),
    },
  ];
  return (
    <MySubPage title={m.mr_title()}>
      <div role="tablist" className="grid grid-cols-2 border-line border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => navigate({ search: { tab: t.key }, replace: true })}
            className={`-mb-px h-12 border-b-2 font-bold text-body-lg md:h-[50px] ${
              tab === t.key ? "border-ink" : "border-transparent text-muted"
            }`}
          >
            <span className="md:hidden">{t.short}</span>
            <span className="max-md:hidden">{t.label}</span>
          </button>
        ))}
      </div>
      {tab === "writable" ? (
        writable.length === 0 ? (
          <p className="py-24 text-center text-body text-sub">{m.mr_writable_empty()}</p>
        ) : (
          <ul className="md:mt-5">
            {writable.map((w) => (
              <li
                key={w.orderItemId}
                className="flex flex-wrap items-center gap-4 border-line border-b px-4 py-4 md:flex-nowrap md:px-0 md:py-5"
              >
                <div className="w-16 shrink-0">
                  <ProductImage product={{ name: w.productName, thumbnailUrl: w.thumbnailUrl }} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body-lg">{w.productName}</span>
                  <span className="text-meta text-sub">
                    {[w.optionName, m.mr_until({ date: formatMonthDay(w.writableUntil) })]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {reward ? (
                    <span className="text-meta">
                      {m.mr_reward_max({ amount: formatMoney(reward) })}
                    </span>
                  ) : null}
                </div>
                <Link
                  to="/my/reviews/write/$orderItemId"
                  params={{ orderItemId: w.orderItemId }}
                  className="grid h-11 w-full shrink-0 place-items-center bg-ink px-4 font-bold text-body text-page md:h-[42px] md:w-[120px]"
                >
                  {m.my_act_review()}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : mine.contents.length === 0 ? (
        <p className="py-24 text-center text-body text-sub">{m.mr_mine_empty()}</p>
      ) : (
        <ul className="md:mt-5">
          {mine.contents.map((r) => (
            <li
              key={r.reviewId}
              className="flex flex-col gap-3 border-line border-b px-4 py-5 md:px-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 shrink-0">
                  <ProductImage
                    product={{ name: r.productName ?? "", thumbnailUrl: r.thumbnailUrl }}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body-lg">{r.productName}</span>
                  <span className="text-meta text-sub">
                    {[r.optionName, m.mr_written({ date: formatMonthDay(r.createdAt) })]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {r.editable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({ reviewId: r.reviewId, rating: r.rating, content: r.content })
                      }
                      className="grid h-9 place-items-center border border-line-strong px-3 font-bold text-meta"
                    >
                      {m.mr_edit()}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(r.reviewId)}
                    className="grid h-9 place-items-center border border-line-strong px-3 font-bold text-meta"
                  >
                    {m.mr_delete()}
                  </button>
                </div>
              </div>
              {editing?.reviewId === r.reviewId ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate();
                  }}
                  className="flex flex-col gap-3"
                >
                  <StarInput
                    value={editing.rating}
                    onChange={(rating) => setEditing({ ...editing, rating })}
                  />
                  <textarea
                    value={editing.content}
                    rows={4}
                    minLength={10}
                    maxLength={2000}
                    aria-label={m.rw_content()}
                    onChange={(event) => setEditing({ ...editing, content: event.target.value })}
                    className="border border-line-strong p-3.5 text-body-lg"
                  />
                  {save.data && !save.data.ok ? (
                    <p role="alert" className="text-meta text-point">
                      {save.data.message}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="h-11 flex-1 border border-line-strong font-bold text-body"
                    >
                      {m.rw_cancel()}
                    </button>
                    <button
                      type="submit"
                      disabled={save.isPending}
                      className="h-11 flex-1 bg-ink font-bold text-body text-page"
                    >
                      {m.rw_save()}
                    </button>
                  </div>
                </form>
              ) : r.blinded ? (
                <p className="text-body text-muted">{m.mr_blinded()}</p>
              ) : (
                <>
                  <span
                    role="img"
                    aria-label={m.mr_stars({ rating: r.rating })}
                    className="tracking-[2px]"
                  >
                    <span aria-hidden>{stars(r.rating)}</span>
                  </span>
                  <p className="text-body-lg leading-relaxed">{r.content}</p>
                  {r.images.length > 0 ? (
                    <div className="flex gap-2">
                      {r.images.map((src) => (
                        <img
                          key={src}
                          src={cdnImage(src, 160)}
                          alt=""
                          loading="lazy"
                          className="h-20 w-20 bg-chip object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
              {r.sellerReply ? (
                <div className="flex flex-col gap-1 bg-surface px-4 py-3 text-body">
                  <b>{m.mr_reply({ store: store.name })}</b>
                  <p className="text-sub">{r.sellerReply.content}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </MySubPage>
  );
}
