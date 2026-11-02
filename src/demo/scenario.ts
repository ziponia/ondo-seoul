/**
 * 데모 시나리오 — 데이터 없이 화면을 확인할 때 고르는 상점 상태다. 브라우저와 서버가 함께 쓴다.
 * 고른 값은 쿠키에 두고 서버의 데모 API(`src/demo/http.ts`)가 읽는다.
 */
export const DEMO_SCENARIOS = ["default", "empty", "soldout", "closed", "global"] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export const DEMO_SCENARIO_COOKIE = "ondo_demo_scenario";
/** 주소로 시나리오를 고를 때의 쿼리 이름 — `?demo=empty` */
export const DEMO_SCENARIO_PARAM = "demo";

export function toDemoScenario(value: string | null | undefined): DemoScenario {
  return (DEMO_SCENARIOS as readonly string[]).includes(value ?? "")
    ? (value as DemoScenario)
    : "default";
}

/** 쿠키 헤더에서 시나리오를 읽는다 */
export function demoScenarioFromCookie(cookieHeader: string | null | undefined): DemoScenario {
  const pair = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEMO_SCENARIO_COOKIE}=`));
  return toDemoScenario(pair?.slice(DEMO_SCENARIO_COOKIE.length + 1));
}
