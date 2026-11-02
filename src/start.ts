import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { DEMO_SCENARIO_COOKIE, DEMO_SCENARIO_PARAM, toDemoScenario } from "./demo/scenario";
import { LOCALE_COOKIE, LOCALE_QUERY_PARAM, resolveLocale } from "./i18n";
import { runWithLocale } from "./i18n/locale.server";
import { refreshIfNeeded } from "./lib/auth.server";

/**
 * 서버 함수 호출은 같은 사이트에서 온 것만 받는다(장바구니·결제 서버 함수를 더해도 다른 사이트가 대신 부르지 못하게).
 * 구매자 로그인을 더하면 여기에 세션 갱신 미들웨어를 더한다(sdk-buyer-auth 스킬 참고).
 */
const csrf = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });

/** 요청 언어 — `?lang=` → `Accept-Language` → ko. 화면 렌더가 끝날 때까지 유지한다(`src/i18n`) */
const locale = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const chosen = resolveLocale(
    url,
    request.headers.get("accept-language"),
    request.headers.get("cookie"),
  );
  const result = await runWithLocale(chosen, () => next());
  // `?lang=`으로 고른 언어는 쿠키에 남겨 다음 화면(서버 함수 포함)도 같은 언어로 그린다
  if (url.searchParams.has(LOCALE_QUERY_PARAM)) {
    result.response.headers.append(
      "set-cookie",
      `${LOCALE_COOKIE}=${chosen}; Path=/; SameSite=Lax`,
    );
  }
  return result;
});

/**
 * 데모 시나리오 — 주소의 `?demo=empty`를 쿠키로 옮겨 이후 화면과 서버 함수가 같은 시나리오를 읽는다.
 * 데모 모드가 아니면 쿠키는 쓰이지 않는다(`src/lib/api.server.ts`).
 */
const demoScenario = createMiddleware().server(async ({ next, request }) => {
  const requested = new URL(request.url).searchParams.get(DEMO_SCENARIO_PARAM);
  const result = await next();
  if (requested !== null) {
    result.response.headers.append(
      "set-cookie",
      `${DEMO_SCENARIO_COOKIE}=${toDemoScenario(requested)}; Path=/; SameSite=Lax`,
    );
  }
  return result;
});

/** 구매자 세션 갱신 — 액세스 토큰 만료 1분 전에 새 토큰으로 바꾼다(`buyer-session-refresh` 규칙) */
const buyerSession = createMiddleware().server(async ({ next }) => {
  await refreshIfNeeded();
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [locale, csrf, demoScenario, buyerSession],
}));
