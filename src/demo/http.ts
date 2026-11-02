import type { DemoScenario } from "./scenario";

/**
 * 데모 API — 스토어프론트 SDK에 주입하는 `fetch`다. 실제 API처럼 엔벨로프(`{ meta, data, error }`)로 답하므로
 * 응답은 SDK의 스키마 검증(zod)을 그대로 지난다. 화면 코드는 데모인지 모른다.
 * 상태(장바구니·로그인)는 토큰 안에 담아 서버 메모리에 두지 않는다 — 여러 인스턴스에서도 같은 결과다.
 */

/** 데모 SDK의 baseUrl — 실제로 요청이 나가지 않는 주소다 */
export const DEMO_BASE_URL = "https://demo.ondo.invalid/storefront/v1";

export interface DemoContext {
  scenario: DemoScenario;
  /** 데모 이미지(`public/demo/`)의 절대 주소를 만들 때 쓴다 */
  origin: string;
  accessToken: string | null;
  cartToken: string | null;
  /** 요청 언어(`Accept-Language` 첫 언어) — 번역 값을 고른다 */
  locale: string;
}

export interface DemoRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  ctx: DemoContext;
}

/** 엔벨로프 밖의 응답 헤더(장바구니 토큰 발급 등)가 필요할 때 돌려준다 */
export class DemoResponse {
  constructor(
    readonly data: unknown,
    readonly headers: Record<string, string> = {},
    readonly status = 200,
  ) {}
}

export class DemoApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type DemoHandler = (request: DemoRequest) => unknown;

export interface DemoRoute {
  method: string;
  pattern: string;
  handler: DemoHandler;
}

export function route(method: string, pattern: string, handler: DemoHandler): DemoRoute {
  return { method, pattern, handler };
}

function match(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split("/").filter(Boolean);
  const got = path.split("/").filter(Boolean);
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (const [index, part] of want.entries()) {
    const value = got[index] ?? "";
    if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(value);
    else if (part !== value) return null;
  }
  return params;
}

function envelope(status: number, data: unknown, error: { code: string; message: string } | null) {
  return {
    meta: {
      status,
      code: error?.code ?? "OK",
      message: error?.message ?? "OK",
      isSuccess: error === null,
    },
    data: error ? null : data,
    error,
  };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function bearer(value: string | null): string | null {
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length) : null;
}

export function createDemoFetch(
  routes: readonly DemoRoute[],
  options: { scenario: DemoScenario; origin: string },
): typeof globalThis.fetch {
  return async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url,
    );
    const base = new URL(DEMO_BASE_URL);
    const path = url.pathname.slice(base.pathname.length) || "/";
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    // 구매자가 고른 국가가 한국이 아니면 해외 권역(USD)으로 답한다 — `global` 시나리오와 같다
    const country = headers.get("x-buyer-country");
    const ctx: DemoContext = {
      scenario: country && country !== "KR" ? "global" : options.scenario,
      locale:
        (headers.get("accept-language") ?? "ko").split(/[,;-]/)[0]?.trim().toLowerCase() || "ko",
      origin: options.origin,
      accessToken: bearer(headers.get("authorization")),
      cartToken: headers.get("x-cart-token"),
    };
    for (const candidate of routes) {
      if (candidate.method !== method) continue;
      const params = match(candidate.pattern, path);
      if (!params) continue;
      try {
        const result = await candidate.handler({
          method,
          path,
          params,
          query: url.searchParams,
          body,
          ctx,
        });
        if (result instanceof DemoResponse) {
          return json(result.status, envelope(result.status, result.data, null), result.headers);
        }
        return json(200, envelope(200, result, null));
      } catch (error) {
        if (error instanceof DemoApiError) {
          return json(
            error.status,
            envelope(error.status, null, { code: error.code, message: error.message }),
          );
        }
        throw error;
      }
    }
    return json(
      404,
      envelope(404, null, {
        code: "DEMO_NOT_IMPLEMENTED",
        message: `데모 모드에 없는 API입니다: ${method} ${path}`,
      }),
    );
  };
}
