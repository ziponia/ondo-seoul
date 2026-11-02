import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { ProductListing } from "../../components/listing/product-listing";
import { useCategories, useProducts } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { findCategory } from "../../lib/categories";
import { listSearchSchema, toProductSearch } from "../../lib/list-search";
import { categoriesQuery, productsQuery } from "../../lib/queries";

export const Route = createFileRoute("/c/$categoryId")({
  staticData: { mobileHeader: "page" },
  validateSearch: listSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, params, deps }) => {
    const tree = await queryClient.ensureQueryData(categoriesQuery());
    const found = findCategory(tree, params.categoryId);
    if (!found) throw notFound();
    await queryClient.ensureQueryData(
      productsQuery(toProductSearch(deps, { categoryId: params.categoryId })),
    );
    return { title: found.node.name };
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: loaderData.title }] : [] }),
  component: CategoryPage,
});

function CategoryPage() {
  const { categoryId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tree = useCategories();
  const page = useProducts(toProductSearch(search, { categoryId }));
  const found = findCategory(tree, categoryId);
  if (!found) return null;
  const { node, parents } = found;
  // 하위 칩은 지금 카테고리의 자식, 자식이 없으면 형제를 보인다
  const parent = parents[parents.length - 1];
  // 하위 카테고리 상품 수 — 실제 API facet은 상품이 속한 카테고리 단위다
  const counts = new Map(
    (page.facets?.categories ?? []).map((facet) => [facet.categoryId, facet.count]),
  );
  const siblingsOwner = node.children.length > 0 ? node : parent;
  return (
    <main className="mx-auto max-w-page pb-10 md:px-6 md:pt-7">
      <MobilePageHeader title={node.name} />
      <div className="px-4 pt-3 md:px-0 md:pt-0">
        <nav
          aria-label={m.list_breadcrumb()}
          className="mb-3 hidden gap-2 text-meta text-muted md:flex"
        >
          <Link to="/">{m.nav_home()}</Link>
          {parents.map((p) => (
            <span key={p.categoryId} className="flex gap-2">
              <span aria-hidden>/</span>
              <Link to="/c/$categoryId" params={{ categoryId: p.categoryId }}>
                {p.name}
              </Link>
            </span>
          ))}
          <span aria-hidden>/</span>
          <span aria-current="page">{node.name}</span>
        </nav>
        <div className="mb-5 hidden items-baseline gap-3 md:mb-6 md:flex">
          <h1 className="font-black text-[28px] tracking-[-0.04em] md:text-4xl">{node.name}</h1>
          <span className="hidden text-body text-muted lg:inline">
            {m.list_count_inline({ count: page.totalElements.toLocaleString("ko-KR") })}
          </span>
        </div>
        {siblingsOwner && siblingsOwner.children.length > 0 ? (
          <nav
            aria-label={m.list_subcategories()}
            className="mb-6 flex gap-2 overflow-x-auto md:mb-8"
          >
            <SubChip id={siblingsOwner.categoryId} on={siblingsOwner.categoryId === categoryId}>
              {m.list_category_all({ name: siblingsOwner.name })}
            </SubChip>
            {siblingsOwner.children.map((child) => (
              <SubChip
                key={child.categoryId}
                id={child.categoryId}
                on={child.categoryId === categoryId}
              >
                {child.name}
              </SubChip>
            ))}
          </nav>
        ) : null}
        <ProductListing
          page={page}
          search={search}
          onSearch={(next) => navigate({ search: next })}
          currentCategoryId={categoryId}
          categories={(siblingsOwner?.children ?? []).map((child) => ({
            categoryId: child.categoryId,
            name: child.name,
            count: counts.get(child.categoryId) ?? 0,
          }))}
          categoryHref={(id) => (
            <Link to="/c/$categoryId" params={{ categoryId: id }} search={search}>
              {siblingsOwner?.children.find((c) => c.categoryId === id)?.name}
            </Link>
          )}
        />
      </div>
    </main>
  );
}

function SubChip({ id, on, children }: { id: string; on: boolean; children: string }) {
  return (
    <Link
      to="/c/$categoryId"
      params={{ categoryId: id }}
      aria-current={on ? "page" : undefined}
      className={`grid h-10 shrink-0 place-items-center rounded-full px-4 font-bold text-body ${
        on ? "bg-ink text-page" : "border border-line-strong"
      }`}
    >
      {children}
    </Link>
  );
}
