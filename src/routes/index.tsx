import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CollectionBanner } from "../components/collection/collection-banner";
import { collectionPeriod } from "../components/collection/collection-period";
import { CouponAction } from "../components/coupon/coupon-action";
import { couponOpensAt } from "../components/coupon/coupon-text";
import { CouponTicket } from "../components/coupon/coupon-ticket";
import { RANKING_SEARCH, RankingSection } from "../components/home/ranking-section";
import { ProductCard } from "../components/product/product-card";
import { useCategories, useProducts, useStore } from "../hooks/use-catalog";
import { m } from "../i18n";
import { collectionsQuery, couponsQuery, productsQuery } from "../lib/queries";

const NEW_ARRIVALS = { sort: "latest", size: 6 } as const;

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(collectionsQuery(1, 6)),
      queryClient.ensureQueryData(productsQuery(RANKING_SEARCH)),
      queryClient.ensureQueryData(productsQuery(NEW_ARRIVALS)),
      queryClient.ensureQueryData(couponsQuery()),
    ]),
  component: Home,
});

function Home() {
  const store = useStore();
  const collections = useSuspenseQuery(collectionsQuery(1, 6)).data.contents;
  const newArrivals = useProducts(NEW_ARRIVALS).contents;
  const hero = collections.slice(0, 2);
  const nothing = collections.length === 0 && newArrivals.length === 0;
  return (
    <main>
      <h1 className="sr-only">{store.name}</h1>
      <nav
        aria-label={m.home_tabs()}
        className="flex gap-5 overflow-x-auto whitespace-nowrap border-line border-b px-4 font-bold text-[15px] md:hidden"
      >
        <span aria-current="page" className="border-ink border-b-2 py-3">
          {m.home_tab_recommend()}
        </span>
        <Link to="/search" search={{ sort: "recommend" }} className="py-3 text-muted">
          {m.home_tab_ranking()}
        </Link>
        <Link to="/search" search={{ sort: "latest" }} className="py-3 text-muted">
          {m.home_tab_new()}
        </Link>
        <Link to="/collections" className="py-3 text-muted">
          {m.nav_collections()}
        </Link>
        <Link to="/coupons" className="py-3 text-point">
          {m.nav_coupons()}
        </Link>
      </nav>
      {hero.length > 0 ? (
        <section
          aria-label={m.home_hero()}
          className="mx-auto grid max-w-page gap-3 md:grid-cols-2 md:px-6 md:pt-6"
        >
          {hero.map((collection, index) => (
            <CollectionBanner
              key={collection.collectionId}
              collection={collection}
              className={`aspect-[4/5] md:aspect-[4/3] ${index > 0 ? "hidden md:block" : ""}`}
            />
          ))}
        </section>
      ) : null}
      <CategoryShortcuts />
      <RankingSection />
      {store.market?.couponsEnabled === false ? null : <CouponStrip />}
      {collections.length > 0 ? (
        <section aria-labelledby="col-h" className="mx-auto max-w-page px-4 pt-[72px] md:px-6">
          <h2 id="col-h" className="mb-5 font-black text-xl tracking-[-0.03em] md:text-[26px]">
            {m.home_collections()}
          </h2>
          {/* 모바일은 옆으로 넘기는 카드(다음 카드가 보이게 82%), 데스크톱은 격자 */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {collections.slice(0, 3).map((collection) => (
              <Link
                key={collection.collectionId}
                to="/collections/$slug"
                params={{ slug: collection.slug }}
                className="flex w-[82%] shrink-0 snap-start flex-col gap-3 sm:w-auto"
              >
                <span className="block aspect-[3/2] overflow-hidden bg-surface">
                  {collection.imageUrl ? (
                    <img
                      src={collection.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="font-bold text-lg tracking-[-0.02em]">{collection.title}</span>
                <span className="text-meta text-muted">{collectionPeriod(collection)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {newArrivals.length > 0 ? (
        <section aria-labelledby="new-h" className="mx-auto max-w-page px-4 pt-[72px] md:px-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 id="new-h" className="font-black text-xl tracking-[-0.03em] md:text-[26px]">
              {m.home_new()}
            </h2>
            <Link to="/search" search={{ sort: "latest" }} className="text-meta text-sub">
              {m.home_more()}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-7 md:grid-cols-4 md:gap-x-3.5 md:gap-y-10 lg:grid-cols-6">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                badge={m.home_new_badge()}
                compact
              />
            ))}
          </div>
        </section>
      ) : null}
      {nothing ? <p className="px-4 py-24 text-center text-sub">{m.home_empty()}</p> : null}
    </main>
  );
}

function CategoryShortcuts() {
  const categories = useCategories();
  if (categories.length === 0) return null;
  // 글자 칸 격자 — 모바일 4열, 데스크톱 한 줄. 끝 칸은 카테고리 전체 화면이다
  const cell =
    "flex h-12 items-center justify-center border-line border-r border-b px-2 text-center font-bold text-body tracking-[-0.02em] md:h-14 md:text-body-lg";
  return (
    <nav aria-label={m.home_categories()} className="mx-auto max-w-page px-4 pt-6 md:px-6 md:pt-10">
      <ul className="grid grid-cols-4 border-line border-t border-l md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
        {categories.map((category) => (
          <li key={category.categoryId} className="contents">
            <Link to="/c/$categoryId" params={{ categoryId: category.categoryId }} className={cell}>
              {category.name}
            </Link>
          </li>
        ))}
        <li className="contents">
          <Link to="/categories" className={`${cell} text-sub`}>
            {m.home_all()}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function CouponStrip() {
  const coupons = useSuspenseQuery(couponsQuery()).data.contents;
  if (coupons.length === 0) return null;
  const now = new Date();
  return (
    <section aria-labelledby="cp-h" className="mt-[72px] bg-surface">
      <div className="mx-auto max-w-page px-4 py-10 md:px-6 md:py-12">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="cp-h" className="font-black text-xl tracking-[-0.03em] md:text-[26px]">
            {m.home_coupons()}
          </h2>
          <span className="flex items-baseline gap-4">
            <span className="hidden text-body text-sub md:inline">{m.home_coupons_note()}</span>
            <Link to="/coupons" className="font-bold text-body underline underline-offset-4">
              {m.home_coupons_all()}
            </Link>
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {coupons.slice(0, 3).map((coupon) => (
            <CouponTicket
              key={coupon.couponId}
              coupon={coupon}
              action={<CouponAction coupon={coupon} opensAt={couponOpensAt(coupon, now)} />}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
