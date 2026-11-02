import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { useCategories } from "../hooks/use-catalog";
import { m } from "../i18n";
import { categoriesQuery } from "../lib/queries";

/** 카테고리 전체 — 모바일 하단 탭의 「카테고리」. 왼쪽 1단계, 오른쪽 하위 카테고리 */
export const Route = createFileRoute("/categories")({
  staticData: { mobileHeader: "page" },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(categoriesQuery()),
  component: CategoriesPage,
});

const TAB = "flex h-14 items-center border-l-[3px] px-4 text-left text-body-lg md:px-5";

function CategoriesPage() {
  const tree = useCategories();
  const navigate = useNavigate();
  const [topId, setTopId] = useState(tree[0]?.categoryId ?? null);
  const top = tree.find((c) => c.categoryId === topId) ?? tree[0];
  return (
    <main className="mx-auto max-w-page md:px-6 md:pt-8">
      <div className="flex flex-col gap-3 px-4 pt-3 pb-3 md:px-0">
        <h1 className="font-black text-xl tracking-[-0.03em] md:text-[28px]">
          {m.categories_title()}
        </h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
            navigate({ to: "/search", search: q ? { q } : {} });
          }}
          className="flex h-11 items-center gap-2 rounded-full bg-chip px-4 md:hidden"
        >
          <Search size={16} aria-hidden />
          <label className="flex-1">
            <span className="sr-only">{m.search_label()}</span>
            <input
              name="q"
              type="search"
              placeholder={m.search_label()}
              className="w-full bg-transparent text-body outline-none"
            />
          </label>
        </form>
      </div>
      <div className="grid min-h-[70vh] grid-cols-[112px_1fr] border-line border-t pb-20 md:grid-cols-[200px_1fr] md:pb-0">
        <div role="tablist" aria-orientation="vertical" className="flex flex-col bg-surface">
          {tree.map((category) => {
            const on = category.categoryId === top?.categoryId;
            return (
              <button
                key={category.categoryId}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTopId(category.categoryId)}
                className={`${TAB} ${on ? "border-ink bg-page font-bold" : "border-transparent"}`}
              >
                {category.name}
              </button>
            );
          })}
          <Link to="/collections" className={`${TAB} border-transparent`}>
            {m.nav_collections()}
          </Link>
        </div>
        {top ? (
          <div role="tabpanel" className="flex flex-col gap-4 px-4 py-3 md:px-6">
            <Link
              to="/c/$categoryId"
              params={{ categoryId: top.categoryId }}
              className="flex h-11 items-center justify-between font-bold text-body-lg"
            >
              <span>
                {top.name} <span className="ml-1">{m.home_all()}</span>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
            <div className="grid grid-cols-3 gap-x-2 gap-y-5 md:grid-cols-6">
              {top.children.map((child) => (
                <Link
                  key={child.categoryId}
                  to="/c/$categoryId"
                  params={{ categoryId: child.categoryId }}
                  className="flex flex-col items-center gap-2 font-medium text-meta"
                >
                  <span
                    aria-hidden
                    className="grid h-16 w-16 place-items-center rounded-full bg-surface font-black text-lg"
                  >
                    {child.name.slice(0, 1)}
                  </span>
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
