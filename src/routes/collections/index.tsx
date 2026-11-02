import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  collectionEndingLabel,
  collectionPeriod,
} from "../../components/collection/collection-period";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { m } from "../../i18n";
import { collectionsQuery } from "../../lib/queries";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/collections/")({
  staticData: { mobileHeader: "page" },
  validateSearch: z.object({ page: z.coerce.number().int().min(1).optional().catch(undefined) }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(collectionsQuery(1, deps.page * PAGE_SIZE)),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { page = 1 } = Route.useSearch();
  const navigate = Route.useNavigate();
  const data = useSuspenseQuery(collectionsQuery(1, page * PAGE_SIZE)).data;
  const [featured, ...rest] = data.contents;
  const now = new Date();
  return (
    <main className="mx-auto max-w-page px-4 pb-10 md:px-6 md:pt-12">
      <MobilePageHeader title={m.collections_title()} back={false} />
      <h1 className="mb-8 hidden font-black text-[40px] tracking-[-0.05em] md:block">
        {m.collections_title()}
      </h1>
      {featured ? (
        <Link
          to="/collections/$slug"
          params={{ slug: featured.slug }}
          className="relative -mx-4 mb-12 block bg-ink text-page md:mx-0 md:mb-14 md:grid md:min-h-[440px] md:grid-cols-[2fr_1fr]"
        >
          <span className="block aspect-[4/5] overflow-hidden md:aspect-auto">
            {featured.imageUrl ? (
              <img src={featured.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </span>
          <span className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-2.5 bg-gradient-to-t from-black/55 to-transparent p-5 md:static md:gap-3.5 md:bg-none md:p-10">
            <span className="font-bold font-display text-meta tracking-[0.14em]">
              {m.collections_now()}
            </span>
            <span className="font-black text-[32px] leading-[1.15] tracking-[-0.05em] md:text-[40px]">
              {featured.title}
            </span>
            {featured.description ? (
              <span className="text-body-lg text-on-dark-sub">{featured.description}</span>
            ) : null}
            <span className="text-body text-on-dark-sub">{collectionPeriod(featured)}</span>
            <span className="mt-3 hidden font-bold text-body-lg underline underline-offset-4 md:block">
              {m.collection_view()}
            </span>
          </span>
        </Link>
      ) : (
        <p className="py-24 text-center text-muted">{m.collections_empty()}</p>
      )}
      <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((collection) => (
          <Link
            key={collection.collectionId}
            to="/collections/$slug"
            params={{ slug: collection.slug }}
            className="flex flex-col gap-2.5"
          >
            <span className="relative block aspect-[16/10] overflow-hidden bg-surface">
              {collectionEndingLabel(collection, now) ? (
                <span className="absolute top-3 left-3 bg-point px-2 py-1 font-bold text-caption text-page">
                  {collectionEndingLabel(collection, now)}
                </span>
              ) : null}
              {collection.imageUrl ? (
                <img
                  src={collection.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </span>
            <span className="font-black text-xl tracking-[-0.03em]">{collection.title}</span>
            {collection.description ? (
              <span className="text-body text-sub">{collection.description}</span>
            ) : null}
            <span className="text-meta text-muted">{collectionPeriod(collection)}</span>
          </Link>
        ))}
      </div>
      {data.totalElements > data.contents.length ? (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={() => navigate({ search: { page: page + 1 }, resetScroll: false })}
            className="h-13 border border-ink px-10 font-bold text-body-lg"
          >
            {m.collections_more()}
          </button>
        </div>
      ) : null}
    </main>
  );
}
