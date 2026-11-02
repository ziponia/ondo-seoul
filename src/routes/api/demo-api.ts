import { createFileRoute } from "@tanstack/react-router";
import { DEMO_MODE } from "../../lib/config.server";

/**
 * 데모 결제 중계 — 브라우저 결제 모듈(`payments.result()`·상태 조회·재시도)의 요청을 서버의 데모 API로 넘긴다.
 * 데모 결제 상태는 서버 메모리에 있어 브라우저가 따로 들고 있으면 어긋난다. 토큰 없이 부르는 결제 경로만 받는다.
 * 데모 모드가 아니면 없는 주소다.
 */
export const Route = createFileRoute("/api/demo-api")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!DEMO_MODE) return new Response(null, { status: 404 });
        const input = (await request.json()) as { path: string; method: string; body?: string };
        if (!/^\/payments\/[\w-]+(\/(confirm|failure|attempts))?$/.test(input.path)) {
          return new Response(null, { status: 404 });
        }
        const [{ demoFetch, DEMO_BASE_URL }, { demoScenarioFromCookie }] = await Promise.all([
          import("../../demo"),
          import("../../demo/scenario"),
        ]);
        const scenario = demoScenarioFromCookie(request.headers.get("cookie"));
        return demoFetch(scenario, new URL(request.url).origin)(`${DEMO_BASE_URL}${input.path}`, {
          method: input.method,
          body: input.body,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
