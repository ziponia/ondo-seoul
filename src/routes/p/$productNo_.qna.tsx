import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { z } from "zod";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { Pager } from "../../components/listing/pager";
import { InquiryForm } from "../../components/product/inquiry-form";
import { ProductImage } from "../../components/product/product-image";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";
import { inquiriesQuery } from "../../lib/product-queries";
import { productQuery } from "../../lib/queries";

const CATEGORY = {
  PRODUCT: () => m.qna_cat_PRODUCT(),
  DELIVERY: () => m.qna_cat_DELIVERY(),
  RETURN: () => m.qna_cat_RETURN(),
  EXCHANGE: () => m.qna_cat_EXCHANGE(),
  ETC: () => m.qna_cat_ETC(),
} as const;

export const Route = createFileRoute("/p/$productNo_/qna")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).optional().catch(undefined),
    /** 쓰기 창을 연 상태로 연다(상세의 「문의하기」) */
    write: z.coerce.boolean().optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context: { queryClient }, params, deps }) => {
    const product = await queryClient.ensureQueryData(productQuery(params.productNo));
    if (!product) throw notFound();
    await queryClient.ensureQueryData(inquiriesQuery(product.productId, deps.page));
  },
  component: QnaPage,
});

function QnaPage() {
  const { productNo } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = useStore();
  const product = useSuspenseQuery(productQuery(productNo)).data;
  const page = useSuspenseQuery(inquiriesQuery(product?.productId ?? "", search.page ?? 1)).data;
  if (!product) return null;
  const total = page?.totalElements ?? 0;
  const title = m.qna_page_title({ count: total });
  const setWrite = (write: boolean) =>
    navigate({ search: { ...search, write: write || undefined }, resetScroll: false });
  return (
    <main className="mx-auto flex max-w-[860px] flex-col pb-28 md:px-6 md:pt-10 md:pb-10">
      <MobilePageHeader title={title} icons={false} center />
      <div className="mb-6 hidden items-center justify-between md:flex">
        <h1 className="font-black text-[28px] tracking-[-0.04em]">{title}</h1>
        <button
          type="button"
          onClick={() => setWrite(true)}
          className="h-11 border border-ink px-5 font-bold text-body"
        >
          {m.qna_write()}
        </button>
      </div>
      <Link
        to="/p/$productNo"
        params={{ productNo }}
        className="flex items-center gap-3.5 border-surface border-b-8 px-4 py-3.5 md:mb-4 md:border-b-0 md:px-0"
      >
        <span className="w-11 shrink-0">
          <ProductImage product={product} />
        </span>
        <span className="font-bold text-body">{product.name}</span>
      </Link>
      <ul className="border-ink md:border-t">
        {(page?.contents ?? []).map((inquiry) => (
          <li
            key={inquiry.inquiryId}
            className="flex flex-col gap-1.5 border-line border-b px-4 py-4 md:px-0"
          >
            <div className="flex items-center gap-2 text-meta">
              <span className="border border-ink px-1.5 font-bold text-caption">
                {CATEGORY[inquiry.category]?.() ?? inquiry.category}
              </span>
              <strong className={inquiry.answer ? "" : "text-muted"}>
                {inquiry.answer ? m.qna_answered() : m.qna_waiting()}
              </strong>
              <span className="text-muted">
                {inquiry.writerMaskedName} · {formatDate(inquiry.createdAt)}
              </span>
            </div>
            <p
              className={`flex items-center gap-1.5 text-body-lg ${inquiry.content === null ? "text-muted" : ""}`}
            >
              {inquiry.secret ? <Lock size={14} aria-hidden className="shrink-0" /> : null}
              {inquiry.content ?? m.qna_secret()}
              {inquiry.mine && inquiry.secret ? (
                <span className="ml-2 text-caption text-muted">{m.qna_mine_secret()}</span>
              ) : null}
            </p>
            {inquiry.answer?.content ? (
              <div className="mt-1 flex flex-col gap-1 bg-surface px-4 py-3 text-body">
                <span className="font-bold text-caption">
                  {m.qna_answer({ store: store.name, date: formatDate(inquiry.answer.answeredAt) })}
                </span>
                <span>{inquiry.answer.content}</span>
              </div>
            ) : null}
          </li>
        ))}
        {total === 0 ? <li className="py-16 text-center text-muted">{m.qna_empty()}</li> : null}
      </ul>
      {page ? (
        <Pager
          page={page.page}
          totalPages={page.totalPages}
          onPage={(next) => navigate({ search: { page: next } })}
        />
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:hidden">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setWrite(true)}
          className="h-13 w-full bg-ink font-bold text-base text-page"
        >
          {m.qna_write()}
        </button>
      </div>
      {search.write ? (
        <InquiryForm
          productId={product.productId}
          productName={product.name}
          thumbnail={<ProductImage product={product} />}
          redirect={`/p/${productNo}/qna?write=1`}
          onClose={() => setWrite(false)}
        />
      ) : null}
    </main>
  );
}
