import type { storefrontCollectionDetailSchema } from "@sayren/storefront-sdk";
import type { z } from "zod";
import type { DemoContext } from "../http";
import { daysFromNow } from "./time";

type CollectionInput = z.input<typeof storefrontCollectionDetailSchema>;

interface DemoCollection {
  detail: Omit<CollectionInput, "imageUrl">;
  image: string;
  /** 진열순(manual) 상품 번호 */
  productNos: number[];
}

const c = (
  slug: string,
  title: string,
  description: string,
  startsAt: string | null,
  endsAt: string | null,
  image: string,
  productNos: number[],
  productSort = "manual",
): DemoCollection => ({
  detail: {
    collectionId: `col_demo_${slug}`,
    slug,
    title,
    description,
    startsAt,
    endsAt,
    productSort,
    metaTitle: null,
    metaDescription: null,
    salesComputedAt: null,
  },
  image,
  productNos,
});

export const DEMO_COLLECTIONS: DemoCollection[] = [
  c(
    "winter-outer",
    "겨울 아우터 최대 40%",
    "울 코트부터 숏 패딩까지, 올겨울 한 벌을 고르는 2주.",
    daysFromNow(-1),
    daysFromNow(13),
    "col-winter-outer",
    [1, 2, 3, 15, 14, 19, 17, 20, 21, 22, 23, 24],
  ),
  c(
    "knit-week",
    "니트 위크",
    "캐시미어 터치부터 케이블 니트까지",
    daysFromNow(-3),
    daysFromNow(2),
    "col-knit-week",
    [4, 9, 12, 10],
  ),
  c(
    "denim-guide",
    "데일리 데님 가이드",
    "핏별로 고르는 와이드·스트레이트·부츠컷",
    daysFromNow(-7),
    daysFromNow(21),
    "col-denim-guide",
    [5, 7, 11],
  ),
  c(
    "office-edit",
    "오피스 룩 에디트",
    "출근길 슬랙스·셔츠·로퍼 한 번에",
    daysFromNow(-3),
    daysFromNow(27),
    "col-office-edit",
    [7, 11, 8, 6],
  ),
  c(
    "editor-pick",
    "에디터 픽",
    "이번 달 ONDO 에디터가 고른 아이템",
    null,
    null,
    "col-editor-pick",
    [16, 6, 10, 13, 1],
    "recommend",
  ),
];

export function toCollection(ctx: DemoContext, collection: DemoCollection): CollectionInput {
  return {
    ...collection.detail,
    imageUrl: `${ctx.origin}/demo/collections/${collection.image}.svg`,
  };
}
