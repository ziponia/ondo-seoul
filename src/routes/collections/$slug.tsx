import { collectionProductSortSchema } from "@sayren/storefront-sdk";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { collectionPeriod } from "../../components/collection/collection-period";
import { Pager } from "../../components/listing/pager";
import { ProductGrid } from "../../components/listing/product-grid";
import { SortMenu } from "../../components/listing/sort-menu";
import { m } from "../../i18n";
import { collectionProductsQuery, collectionQuery } from "../../lib/queries";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  sort: collectionProductSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/collections/$slug")({
  staticData: { mobileHeader: "page" },
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, params, deps }) => {
    // 없는 기획전은 서버 함수가 null로 답한다(오류 객체는 서버 함수 경계를 넘으며 모양이 바뀐다)
    const collection = await queryClient.ensureQueryData(collectionQuery(params.slug));
    if (!collection) throw notFound();
    await queryClient.ensureQueryData(
      collectionProductsQuery(params.slug, { ...deps, size: PAGE_SIZE }),
    );
    return { title: collection.title };
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: loaderData.title }] : [] }),
  component: CollectionPage,
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const collection = useSuspenseQuery(collectionQuery(slug)).data;
  const products = useSuspenseQuery(
    collectionProductsQuery(slug, { ...search, size: PAGE_SIZE }),
  ).data;
  if (!collection) return null;
  const sort =
    search.sort ?? collectionProductSortSchema.safeParse(collection.productSort).data ?? "manual";
  return (
    <main>
      <section
        aria-label={collection.title}
        className="relative flex min-h-[420px] items-end overflow-hidden bg-ink text-page md:min-h-[520px]"
      >
        {collection.imageUrl ? (
          <img
            src={collection.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <span
          className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
          aria-hidden
        />
        <HeroBar />
        <div className="relative mx-auto flex w-full max-w-page flex-col gap-3.5 px-4 py-10 md:px-6 md:py-14">
          <h1 className="max-w-2xl font-black text-[36px] leading-[1.08] tracking-[-0.05em] md:text-[64px]">
            {collection.title}
          </h1>
          {collection.description ? (
            <p className="max-w-2xl text-base text-on-dark-sub">{collection.description}</p>
          ) : null}
          <p className="text-body text-on-dark-sub">
            {collectionPeriod(collection)} ·{" "}
            {m.collection_products({ count: products.totalElements })}
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-page px-4 pt-8 pb-10 md:px-6 md:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 md:border-ink md:border-b md:pb-3.5">
          <span className="hidden font-bold text-body-lg md:inline">
            {m.list_count({ count: products.totalElements.toLocaleString("ko-KR") })}
          </span>
          <SortMenu
            mobile="tabs"
            options={collectionProductSortSchema.options}
            value={sort}
            onChange={(next) => navigate({ search: { sort: next } })}
          />
        </div>
        <ProductGrid products={products.contents} strike />
        <Pager
          page={products.page}
          totalPages={products.totalPages}
          onPage={(page) => navigate({ search: { ...search, page } })}
        />
      </div>
    </main>
  );
}

/** 모바일 상단 — 대표 이미지 위 투명 바(뒤로·장바구니) */
function HeroBar() {
  const router = useRouter();
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between px-2 md:hidden">
      <button
        type="button"
        aria-label={m.search_back()}
        onClick={() => router.history.back()}
        className="grid h-11 w-11 place-items-center"
      >
        <ChevronLeft size={22} aria-hidden />
      </button>
      <Link to="/cart" aria-label={m.nav_cart()} className="grid h-11 w-11 place-items-center">
        <ShoppingBag size={22} strokeWidth={1.8} aria-hidden />
      </Link>
    </div>
  );
}
