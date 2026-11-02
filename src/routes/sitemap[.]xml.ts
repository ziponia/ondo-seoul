import type { CategoryNode } from "@sayren/storefront-sdk";
import { createFileRoute } from "@tanstack/react-router";
import { apiFor } from "../lib/api.server";

/**
 * 사이트맵 — 고정 화면, 카테고리, 노출 중인 기획전, 판매 중 상품의 주소.
 * 상품은 `catalog.listSitemapProducts`(id·이름·수정 시각)를 끝 페이지까지 읽고 `<lastmod>`에 수정 시각을 쓴다.
 * 주소 조립과 XML 변환은 스토어프론트 몫이다. 상품 상세 경로는 상품 id를 받는다.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const api = apiFor();
        const [categories, collections, products] = await Promise.all([
          api.catalog.listCategories(),
          allPages((page) => api.catalog.listCollections({ page, size: 100 })),
          allPages((page) => api.catalog.listSitemapProducts({ page, size: 500 })),
        ]);
        const urls: { loc: string; lastmod?: string }[] = [
          ...["/", "/collections", "/categories", "/coupons"].map((path) => ({ loc: path })),
          ...flatten(categories).map((id) => ({ loc: `/c/${encodeURIComponent(id)}` })),
          ...collections.map((c) => ({ loc: `/collections/${encodeURIComponent(c.slug)}` })),
          ...products.map((p) => ({
            loc: `/p/${encodeURIComponent(p.productId)}`,
            lastmod: p.updatedAt,
          })),
        ];
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(
            (url) =>
              `<url><loc>${escapeXml(origin + url.loc)}</loc>${
                url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : ""
              }</url>`,
          ),
          "</urlset>",
        ].join("\n");
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});

/** 페이지 응답을 끝 페이지까지 읽는다 */
async function allPages<T>(
  load: (page: number) => Promise<{ contents: T[]; totalPages: number }>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const res = await load(page);
    items.push(...res.contents);
    if (page >= res.totalPages) return items;
  }
}

function flatten(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((node) => [node.categoryId, ...flatten(node.children)]);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
