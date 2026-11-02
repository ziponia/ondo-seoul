import { createFileRoute } from "@tanstack/react-router";

/** 검색엔진 안내 — 회원·주문 화면은 빼고 사이트맵 주소를 알린다 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /my",
          "Disallow: /cart",
          "Disallow: /checkout",
          "Disallow: /api/",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
