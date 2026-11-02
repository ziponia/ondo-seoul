import { analyticsIdsFromCookie, createStorefrontClient } from "@sayren/storefront-sdk";
import { getRequest } from "@tanstack/react-start/server";
import { DEMO_BASE_URL, demoFetch } from "../demo";
import { DEMO_SCENARIO_PARAM, demoScenarioFromCookie, toDemoScenario } from "../demo/scenario";
import { getLocale } from "../i18n";
import { countryFromCookie } from "./config";
import { API_BASE_URL, DEMO_MODE, resolveStoreCode } from "./config.server";

/**
 * 이 요청의 SDK 연결 값 — 상점 코드, 주소, 데모 모드면 데모 API `fetch`.
 * 스토어프론트 클라이언트와 구매자 인증(`/auth`)이 같은 값을 쓴다.
 */
export function transport() {
  const request = getRequest();
  const cookie = request.headers.get("cookie");
  const url = new URL(request.url);
  const country = countryFromCookie(cookie);
  return {
    baseUrl: DEMO_MODE ? DEMO_BASE_URL : API_BASE_URL,
    storeCode: resolveStoreCode(),
    cookie,
    // 화면 언어로 번역 값을 받고, 고른 국가로 판매 권역(통화·가격)을 정한다
    locale: getLocale(),
    ...(country ? { country } : {}),
    ...(DEMO_MODE ? { fetch: demoFetch(demoScenarioOf(url, cookie), url.origin) } : {}),
  };
}

/**
 * 서버(서버 함수·서버 라우트)에서 쓰는 스토어프론트 API 클라이언트.
 *
 * 테넌트는 `X-Store-Code` 헤더로 보낸다. 토큰은 요청마다 넘긴다 — 모듈 전역에 담으면 서버 렌더에서
 * 다른 사용자의 요청에 섞인다. 방문 분석 쿠키(방문자·세션)를 헤더로 실어 서버가 기록하는 이벤트를 방문과 잇는다.
 *
 * 데모 모드(`SAYREN_DEMO=1`)면 같은 SDK에 데모 API(`src/demo`)를 `fetch`로 주입한다. 화면 코드는 차이를 모른다.
 */
export function apiFor(
  options: {
    accessToken?: string | null;
    /** 값 또는 요청마다 읽는 함수(같은 요청 안에서 토큰이 바뀌면 새 값을 읽는다) */
    cartToken?: string | null | (() => string | undefined);
    onCartToken?: (token: string) => void;
  } = {},
) {
  const { cookie, ...connection } = transport();
  return createStorefrontClient({
    ...connection,
    accessToken: options.accessToken ?? undefined,
    cartToken: options.cartToken ?? undefined,
    onCartToken: options.onCartToken,
    ...analyticsIdsFromCookie(cookie),
  });
}

/** 데모 시나리오 — 주소의 `?demo=`가 먼저다(쿠키는 이 응답에서 쓰이므로 첫 요청에는 아직 없다) */
function demoScenarioOf(url: URL, cookie: string | null) {
  const requested = url.searchParams.get(DEMO_SCENARIO_PARAM);
  return requested !== null ? toDemoScenario(requested) : demoScenarioFromCookie(cookie);
}
