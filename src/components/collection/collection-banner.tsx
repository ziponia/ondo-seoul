import type { StorefrontCollection } from "@sayren/storefront-sdk";
import { Link } from "@tanstack/react-router";
import { collectionPeriod } from "./collection-period";

/** 기획전 배너 — 대표 이미지 위에 제목·설명·기간. 이미지가 없으면 잉크 면 */
export function CollectionBanner({
  collection,
  className = "aspect-[4/3]",
  titleClass = "text-[32px] md:text-[44px]",
}: {
  collection: StorefrontCollection;
  className?: string;
  titleClass?: string;
}) {
  return (
    <Link
      to="/collections/$slug"
      params={{ slug: collection.slug }}
      className={`relative block overflow-hidden bg-ink text-page ${className}`}
    >
      {collection.imageUrl ? (
        <img
          src={collection.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <span
        className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
        aria-hidden
      />
      <span className="absolute right-5 bottom-6 left-5 flex flex-col gap-2.5 md:right-10 md:bottom-10 md:left-10">
        <span className={`font-black leading-[1.15] tracking-[-0.04em] ${titleClass}`}>
          {collection.title}
        </span>
        {collection.description ? (
          <span className="line-clamp-2 text-on-dark-sub text-body-lg">
            {collection.description}
          </span>
        ) : null}
        <span className="text-on-dark-sub text-meta">{collectionPeriod(collection)}</span>
      </span>
    </Link>
  );
}
