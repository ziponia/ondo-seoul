import { productReviewSortSchema } from "@sayren/storefront-sdk";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { X } from "lucide-react";
import { z } from "zod";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { Pager } from "../../components/listing/pager";
import { ProductImage } from "../../components/product/product-image";
import { ReviewItem, ReviewSummary } from "../../components/product/review-parts";
import { m } from "../../i18n";
import { type ReviewSearch, reviewsQuery } from "../../lib/product-queries";
import { productQuery } from "../../lib/queries";

const PAGE_SIZE = 10;

const searchSchema = z.object({
  sort: productReviewSortSchema.optional().catch(undefined),
  photo: z.coerce.boolean().optional().catch(undefined),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  variant: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
type Search = z.infer<typeof searchSchema>;

const toQuery = (search: Search): ReviewSearch => ({
  sort: search.sort ?? "helpful",
  hasImage: search.photo,
  rating: search.rating,
  variantId: search.variant,
  page: search.page ?? 1,
  size: PAGE_SIZE,
});

const SORT_LABELS = {
  latest: () => m.rv_sort_latest(),
  ratingDesc: () => m.rv_sort_ratingDesc(),
  ratingAsc: () => m.rv_sort_ratingAsc(),
  helpful: () => m.rv_sort_helpful(),
} as const;

export const Route = createFileRoute("/p/$productNo_/reviews")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, params, deps }) => {
    const product = await queryClient.ensureQueryData(productQuery(params.productNo));
    if (!product) throw notFound();
    await queryClient.ensureQueryData(reviewsQuery(product.productId, toQuery(deps)));
  },
  component: ReviewsPage,
});

function ReviewsPage() {
  const { productNo } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const product = useSuspenseQuery(productQuery(productNo)).data;
  const reviews = useSuspenseQuery(reviewsQuery(product?.productId ?? "", toQuery(search))).data;
  if (!product) return null;
  const set = (next: Partial<Search>) =>
    navigate({ search: { ...search, ...next, page: undefined } });
  const title = m.rv_page_title({ count: product.reviewCount.toLocaleString("ko-KR") });
  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 pb-10 md:px-6 md:pt-8">
      <MobilePageHeader title={title} icons={false} center />
      <Link
        to="/p/$productNo"
        params={{ productNo }}
        className="hidden items-center gap-3.5 md:flex"
      >
        <span className="w-14 shrink-0">
          <ProductImage product={product} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-meta text-sub">‹ {m.rv_back_product()}</span>
          <span className="font-bold text-body-lg">{product.name}</span>
        </span>
      </Link>
      <h1 className="hidden font-black text-[30px] tracking-[-0.04em] md:block">{title}</h1>
      {reviews?.summary ? (
        <ReviewSummary
          summary={reviews.summary}
          picked={search.rating}
          onPick={(star) => set({ rating: search.rating === star ? undefined : star })}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-ink border-b pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={search.photo === true}
            onClick={() => set({ photo: search.photo ? undefined : true })}
            className={`h-10 rounded-full px-4 font-bold text-body ${
              search.photo ? "bg-ink text-page" : "border border-line-strong"
            }`}
          >
            {m.rv_photo_only()}
          </button>
          {product.variants.length > 1 ? (
            <label>
              <span className="sr-only">{m.rv_option_label()}</span>
              <select
                value={search.variant ?? ""}
                onChange={(event) => set({ variant: event.target.value || undefined })}
                className="h-10 border border-line-strong bg-page px-3 text-body"
              >
                <option value="">{m.rv_option_all()}</option>
                {product.variants.map((variant) => (
                  <option key={variant.variantId} value={variant.variantId}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {search.rating ? (
            <button
              type="button"
              aria-label={m.rv_clear({ label: m.rv_star_chip({ star: search.rating }) })}
              onClick={() => set({ rating: undefined })}
              className="flex h-10 items-center gap-1.5 border border-ink px-3.5 font-bold text-body"
            >
              {m.rv_star_chip({ star: search.rating })}
              <X size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="flex">
          {productReviewSortSchema.options.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={(search.sort ?? "helpful") === value}
              onClick={() => set({ sort: value })}
              className={`h-10 px-2.5 text-body ${
                (search.sort ?? "helpful") === value ? "font-bold" : "text-muted"
              }`}
            >
              {SORT_LABELS[value]()}
            </button>
          ))}
        </div>
      </div>
      <div>
        {(reviews?.contents ?? []).map((review) => (
          <ReviewItem key={review.reviewId} review={review} />
        ))}
        {reviews && reviews.contents.length === 0 ? (
          <p className="py-16 text-center text-muted">{m.rv_filtered_empty()}</p>
        ) : null}
      </div>
      {reviews ? (
        <Pager
          page={reviews.page}
          totalPages={reviews.totalPages}
          onPage={(page) => navigate({ search: { ...search, page } })}
        />
      ) : null}
    </main>
  );
}
