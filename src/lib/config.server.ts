import { getRequestHeader } from "@tanstack/react-start/server";
import { storeCodeFromHost } from "./config";

/**
 * 서버 전용 설정 — `.server.ts`라 브라우저 번들에 들어가지 않는다. `process.env`를 여기에만 둔다.
 * 브라우저에 필요한 값은 서버 함수가 내려준다(`PublicConfig`).
 */
export const API_BASE_URL = process.env.SAYREN_API_URL ?? "https://api.sayren.io/storefront/v1";

/** localhost에서도 방문 분석을 보낸다 — 기본은 개발 트래픽을 섞지 않으려고 끈다 */
export const ANALYTICS_DEBUG = process.env.SAYREN_ANALYTICS_DEBUG === "1";

/**
 * 데모 모드 — 상점 없이 데모 데이터로 모든 화면을 연다(`docs/DEMO.md`). 명시적으로 켤 때만 쓴다.
 * 상점 코드가 없을 때 자동으로 켜지 않는다 — 운영 설정 실수로 실제 구매자에게 데모 상품이 보이지 않게.
 */
export const DEMO_MODE = process.env.SAYREN_DEMO === "1";

/** 데모 모드의 상점 코드 — 실제 API로 나가지 않는다 */
const DEMO_STORE_CODE = "ondo-demo";

const FIXED_STORE_CODE = process.env.SAYREN_STORE_CODE ?? "";

/** 이 요청의 테넌트 — 고정 값이 먼저이고, 없으면 호스트 서브도메인에서 뽑는다 */
export function resolveStoreCode(): string {
  if (DEMO_MODE) return DEMO_STORE_CODE;
  if (FIXED_STORE_CODE) return FIXED_STORE_CODE;
  const fromHost = storeCodeFromHost(getRequestHeader("host"));
  if (fromHost) return fromHost;
  throw new Error(
    "상점 코드를 알 수 없습니다. SAYREN_STORE_CODE 환경변수를 설정하거나 서브도메인으로 서비스해 주십시오. 데이터 없이 화면만 보려면 SAYREN_DEMO=1로 실행하십시오",
  );
}
