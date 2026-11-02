import { createDemoFetch, type DemoRoute } from "./http";
import { authRoutes } from "./routes/auth";
import { cartRoutes } from "./routes/cart";
import { catalogRoutes } from "./routes/catalog";
import { checkoutRoutes } from "./routes/checkout";
import { memberRoutes } from "./routes/member";
import { productRoutes } from "./routes/product";
import { uploadRoutes } from "./routes/uploads";
import type { DemoScenario } from "./scenario";

/** 데모 API가 답하는 모든 경로 — 영역별 파일(`routes/`)을 여기서 모은다 */
export const DEMO_ROUTES: readonly DemoRoute[] = [
  ...catalogRoutes,
  ...productRoutes,
  ...cartRoutes,
  ...uploadRoutes,
  ...authRoutes,
  ...checkoutRoutes,
  ...memberRoutes,
];

export { DEMO_BASE_URL } from "./http";

export function demoFetch(scenario: DemoScenario, origin: string): typeof globalThis.fetch {
  return createDemoFetch(DEMO_ROUTES, { scenario, origin });
}
