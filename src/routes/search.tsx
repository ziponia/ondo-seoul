import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Search } from "lucide-react";
import { z } from "zod";
import { ProductGrid } from "../components/listing/product-grid";
import { ProductListing } from "../components/listing/product-listing";
import { RecentSearches, rememberSearch } from "../components/listing/recent-searches";
import { useCategories, useProducts } from "../hooks/use-catalog";
import { m } from "../i18n";
import { listSearchSchema, toProductSearch } from "../lib/list-search";
import { categoriesQuery, productsQuery } from "../lib/queries";

const searchSchema = listSearchSchema.extend({
  q: z.string().trim().max(100).optional().catch(undefined),
  categoryId: z.string().optional().catch(undefined),
});
type SearchParams = z.infer<typeof searchSchema>;

/** 결과가 없을 때 보이는 추천 상품 */
const RECOMMEND = { sort: "recommend", size: 5 } as const;

const query = (search: SearchParams) =>
  toProductSearch(search, { keyword: search.q || undefined, categoryId: search.categoryId });

export const Route = createFileRoute("/search")({
  staticData: { mobileHeader: "page" },
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(productsQuery(query(deps))),
      queryClient.ensureQueryData(productsQuery(RECOMMEND)),
      queryClient.ensureQueryData(categoriesQuery()),
    ]),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = useProducts(query(search));
  const keyword = search.q ?? "";
  const facets = page.facets?.categories ?? [];
  const noResult = keyword !== "" && page.totalElements === 0 && !search.categoryId;
  const submit = (value: string) => {
    const q = value.trim();
    if (q) rememberSearch(q);
    navigate({ search: q ? { q } : {} });
  };
  return (
    <main className="mx-auto max-w-page px-4 pb-10 md:px-6 md:pt-8">
      <MobileSearchBar keyword={keyword} onSubmit={submit} />
      {/* 모바일은 큰 제목 없이 검색창이 머리다 — 화면 읽기용 제목만 둔다 */}
      <h1 className="sr-only md:hidden">
        {keyword ? m.search_title({ keyword }) : m.search_all_title()}
      </h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(String(new FormData(event.currentTarget).get("q") ?? ""));
        }}
        className="mx-auto mb-8 hidden h-13 max-w-2xl items-center gap-2.5 border-ink border-b-2 md:flex lg:hidden"
      >
        <label className="flex-1">
          <span className="sr-only">{m.search_label()}</span>
          <input
            key={keyword}
            name="q"
            type="search"
            defaultValue={keyword}
            placeholder={m.search_placeholder()}
            className="w-full bg-transparent text-lg outline-none"
          />
        </label>
        <button
          type="submit"
          aria-label={m.nav_search()}
          className="grid h-11 w-11 place-items-center"
        >
          <Search size={22} aria-hidden />
        </button>
      </form>
      <div className="mb-5 hidden items-baseline gap-2.5 md:flex">
        <h1 className="font-black text-2xl tracking-[-0.04em] md:text-[28px]">
          {keyword ? m.search_title({ keyword }) : m.search_all_title()}
        </h1>
        {noResult ? null : (
          <span className="text-body text-muted">
            {m.list_count_short({ count: page.totalElements.toLocaleString("ko-KR") })}
          </span>
        )}
      </div>
      {keyword === "" ? <SearchStart onPick={submit} /> : null}
      {noResult ? (
        <NoResult keyword={keyword} />
      ) : (
        <>
          {facets.length > 0 ? (
            <nav aria-label={m.search_categories()} className="mb-6 flex gap-2 overflow-x-auto">
              {[
                {
                  categoryId: undefined,
                  name: m.home_all(),
                  count: search.categoryId ? undefined : page.totalElements,
                },
                ...facets,
              ].map((facet) => {
                const on = facet.categoryId === search.categoryId;
                return (
                  <Link
                    key={facet.categoryId ?? "all"}
                    to="/search"
                    search={{ ...search, categoryId: facet.categoryId, page: undefined }}
                    aria-current={on ? "page" : undefined}
                    className={`grid h-10 shrink-0 place-items-center rounded-full px-4 font-bold text-body ${
                      on ? "bg-ink text-page" : "border border-line-strong"
                    }`}
                  >
                    {facet.count === undefined ? facet.name : `${facet.name} ${facet.count}`}
                  </Link>
                );
              })}
            </nav>
          ) : null}
          <ProductListing
            page={page}
            search={search}
            onSearch={(next) => navigate({ search: { ...search, ...next } })}
            wide
            countLabel={
              keyword
                ? m.search_count({ keyword, count: page.totalElements.toLocaleString("ko-KR") })
                : undefined
            }
          />
        </>
      )}
    </main>
  );
}

/** 모바일 상단 — 뒤로, 검색창, 검색 버튼(시안 MSearch) */
function MobileSearchBar({
  keyword,
  onSubmit,
}: {
  keyword: string;
  onSubmit: (keyword: string) => void;
}) {
  const router = useRouter();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(String(new FormData(event.currentTarget).get("q") ?? ""));
      }}
      className="sticky top-0 z-20 -mx-4 mb-3 flex h-15 items-center gap-1 border-line border-b bg-page px-2 md:hidden"
    >
      <button
        type="button"
        aria-label={m.search_back()}
        onClick={() => router.history.back()}
        className="grid h-11 w-11 shrink-0 place-items-center"
      >
        <ChevronLeft size={22} aria-hidden />
      </button>
      <label className="flex h-11 min-w-0 flex-1 items-center bg-chip px-3">
        <span className="sr-only">{m.search_label()}</span>
        <input
          key={keyword}
          name="q"
          type="search"
          defaultValue={keyword}
          placeholder={m.search_placeholder()}
          className="w-full bg-transparent text-base outline-none"
        />
      </label>
      <button
        type="submit"
        aria-label={m.nav_search()}
        className="grid h-11 w-11 place-items-center"
      >
        <Search size={22} aria-hidden />
      </button>
    </form>
  );
}

/** 검색어가 없을 때 — 최근 검색어와 카테고리 바로가기(모바일 검색 시안) */
function SearchStart({ onPick }: { onPick: (keyword: string) => void }) {
  const categories = useCategories();
  return (
    <div className="mb-10 flex flex-col gap-8 md:hidden">
      <RecentSearches onPick={onPick} />
      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-3 font-bold text-body-lg">
          {m.search_categories()}
        </h2>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
          {categories.map((category) => (
            <Link
              key={category.categoryId}
              to="/c/$categoryId"
              params={{ categoryId: category.categoryId }}
              className="flex flex-col items-center gap-1.5 text-caption"
            >
              <span
                aria-hidden
                className="grid h-14 w-14 place-items-center rounded-full bg-surface font-black"
              >
                {category.name.slice(0, 1)}
              </span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function NoResult({ keyword }: { keyword: string }) {
  const recommend = useProducts(RECOMMEND).contents;
  return (
    <>
      <section className="flex flex-col items-center gap-3 border-line border-b py-20 text-center">
        <p className="font-black text-[22px] tracking-[-0.03em]">
          {m.search_no_result({ keyword })}
        </p>
        <p className="text-body-lg text-sub">{m.search_no_result_hint()}</p>
      </section>
      {recommend.length > 0 ? (
        <section aria-labelledby="rec-h" className="pt-12">
          <h2 id="rec-h" className="mb-5 font-black text-[22px] tracking-[-0.03em]">
            {m.search_recommend()}
          </h2>
          <ProductGrid products={recommend} columns={5} />
        </section>
      ) : null}
    </>
  );
}
