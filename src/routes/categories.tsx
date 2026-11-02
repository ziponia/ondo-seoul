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
      <div className="grid min-h-[70vh] grid-cols-[112px_1fr] border-line border-t pb-4 md:grid-cols-[200px_1fr] md:pb-0">
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
          <div role="tabpanel" className="px-4 pt-5 pb-6 md:px-8 md:pt-6">
            <h2 className="pb-3 font-black text-lg tracking-[-0.03em] md:text-xl">{top.name}</h2>
            {/* 하위 카테고리는 글자 목록이다 — 첫 줄은 상위 카테고리 전체 */}
            <ul className="border-ink border-t md:grid md:grid-cols-2 md:gap-x-10">
              {[
                { categoryId: top.categoryId, name: m.home_all(), all: true },
                ...top.children.map((child) => ({ ...child, all: false })),
              ].map((row) => (
                <li key={`${row.categoryId}-${row.all}`} className="border-line border-b">
                  <Link
                    to="/c/$categoryId"
                    params={{ categoryId: row.categoryId }}
                    className={`flex h-[52px] items-center justify-between gap-3 text-body-lg ${
                      row.all ? "font-bold" : ""
                    }`}
                  >
                    {row.name}
                    <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
