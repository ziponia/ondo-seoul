import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { ProductGrid } from "../../components/listing/product-grid";
import { Gallery } from "../../components/product/gallery";
import {
  ProductDetailBody,
  ProductTabs,
  QnaPreview,
  ReviewPreview,
} from "../../components/product/product-sections";
import { PurchasePanel } from "../../components/product/purchase-panel";
import { useProducts } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import {
  couponBenefitQuery,
  inquiriesQuery,
  pointPolicyQuery,
  reviewsQuery,
} from "../../lib/product-queries";
import { productQuery, productsQuery } from "../../lib/queries";

const REVIEW_PREVIEW = { sort: "helpful", size: 8 } as const;

/** 비슷한 상품 — 같은 카테고리의 추천순(SDK에 유사도 추천이 없다) */
const similarSearch = (categoryId: string | undefined) =>
  ({ categoryId, sort: "recommend", size: 6 }) as const;

export const Route = createFileRoute("/p/$productNo")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  loader: async ({ context: { queryClient }, params }) => {
    const product = await queryClient.ensureQueryData(productQuery(params.productNo));
    if (!product) throw notFound();
    await Promise.all([
      queryClient.ensureQueryData(reviewsQuery(product.productId, REVIEW_PREVIEW)),
      queryClient.ensureQueryData(inquiriesQuery(product.productId)),
      queryClient.ensureQueryData(couponBenefitQuery(product.productId)),
      queryClient.ensureQueryData(pointPolicyQuery()),
      queryClient.ensureQueryData(
        productsQuery(similarSearch(product.categoryPath.at(-1)?.categoryId)),
      ),
    ]);
    return { title: product.name };
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: loaderData.title }] : [] }),
  component: ProductPage,
});

function ProductPage() {
  const { productNo } = Route.useParams();
  const product = useSuspenseQuery(productQuery(productNo)).data;
  if (!product) return null;
  return <ProductView productId={product.productId} productNo={productNo} />;
}

function ProductView({ productId, productNo }: { productId: string; productNo: string }) {
  const product = useSuspenseQuery(productQuery(productNo)).data;
  const reviews = useSuspenseQuery(reviewsQuery(productId, REVIEW_PREVIEW)).data;
  const inquiries = useSuspenseQuery(inquiriesQuery(productId)).data;
  const benefit = useSuspenseQuery(couponBenefitQuery(productId)).data;
  const policy = useSuspenseQuery(pointPolicyQuery()).data;
  const similar = useProducts(similarSearch(product?.categoryPath.at(-1)?.categoryId)).contents;
  if (!product) return null;
  const allSoldOut = product.soldOut || product.variants.every((v) => v.soldOut);
  return (
    <main className="mx-auto max-w-page px-4 pb-24 md:px-6 md:pt-6 md:pb-10">
      <div className="-mx-4 md:hidden">
        <MobilePageHeader title="" home />
      </div>
      <nav
        aria-label={m.list_breadcrumb()}
        className="mb-4 hidden gap-2 text-meta text-muted md:flex"
      >
        <Link to="/">{m.nav_home()}</Link>
        {product.categoryPath.map((category) => (
          <span key={category.categoryId} className="flex gap-2">
            <span aria-hidden>/</span>
            <Link to="/c/$categoryId" params={{ categoryId: category.categoryId }}>
              {category.name}
            </Link>
          </span>
        ))}
      </nav>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_440px] md:gap-12">
        <Gallery name={product.name} images={product.images} soldOut={allSoldOut} />
        <PurchasePanel product={product} benefit={benefit} policy={policy} />
      </div>
      {allSoldOut && similar.length > 0 ? (
        <section aria-labelledby="similar-h" className="pt-16">
          <h2 id="similar-h" className="mb-5 font-black text-[22px] tracking-[-0.03em]">
            {m.pd_similar()}
          </h2>
          <ProductGrid
            products={similar.filter((p) => p.productId !== product.productId).slice(0, 5)}
            columns={5}
          />
        </section>
      ) : null}
      <ProductTabs reviewCount={product.reviewCount} inquiryCount={inquiries?.totalElements ?? 0} />
      <ProductDetailBody product={product} />
      <ReviewPreview product={product} reviews={reviews} />
      <QnaPreview
        product={product}
        inquiries={inquiries?.contents ?? []}
        total={inquiries?.totalElements ?? 0}
      />
    </main>
  );
}
