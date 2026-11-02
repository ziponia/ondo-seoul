import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCategories, useProducts } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { productsQuery } from "../../lib/queries";
import { ProductCard } from "../product/product-card";

/** 홈 랭킹 기본 조회 — 추천순(리뷰 수 × 평점, 서버 정렬) 10개 */
export const RANKING_SEARCH = { sort: "recommend", size: 10 } as const;

/**
 * 홈 랭킹 — 「전체」는 loader가 받아 둔 첫 화면이고, 카테고리 탭은 고를 때 받는다.
 */
export function RankingSection() {
  const categories = useCategories();
  const all = useProducts(RANKING_SEARCH);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const picked = useQuery({
    ...productsQuery({ ...RANKING_SEARCH, categoryId: categoryId ?? undefined }),
    enabled: categoryId !== null,
  });
  const products = categoryId === null ? all.contents : (picked.data?.contents ?? []);
  if (all.contents.length === 0) return null;
  const tabs = [{ categoryId: null, name: m.home_all() }, ...categories.slice(0, 6)];
  return (
    <section aria-labelledby="rank-h" className="mx-auto max-w-page px-4 pt-14 md:px-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="rank-h" className="font-black text-xl tracking-[-0.03em] md:text-[26px]">
          {m.home_ranking()}
        </h2>
        <Link
          to="/search"
          search={categoryId ? { categoryId, sort: "recommend" } : { sort: "recommend" }}
          className="text-meta text-sub"
        >
          {m.home_more()}
        </Link>
      </div>
      <div
        role="tablist"
        aria-label={m.home_ranking_tabs()}
        className="mb-6 flex gap-2 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const on = tab.categoryId === categoryId;
          return (
            <button
              key={tab.categoryId ?? "all"}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setCategoryId(tab.categoryId)}
              className={`h-[34px] shrink-0 rounded-full px-3.5 font-bold text-meta md:h-10 md:px-4 md:text-body ${
                on ? "bg-ink text-page" : "border border-line-strong"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-7 md:grid-cols-4 md:gap-x-3.5 md:gap-y-10 lg:grid-cols-6">
        {products.map((product, index) => (
          // 모바일은 6위까지만 보인다(시안)
          <div key={product.productId} className={index >= 6 ? "hidden md:block" : undefined}>
            <ProductCard product={product} rank={index + 1} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
