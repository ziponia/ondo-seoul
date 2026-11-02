import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useMatches,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { useEffect } from "react";
import { z } from "zod";
import { CheckoutHeader } from "../components/layout/checkout-header";
import { CouponBanner } from "../components/layout/coupon-banner";
import { DemoPanel } from "../components/layout/demo-panel";
import { MobileTabBar } from "../components/layout/mobile-tab-bar";
import { SiteFooter } from "../components/layout/site-footer";
import { SiteHeader } from "../components/layout/site-header";
import { NotFoundView } from "../components/not-found-view";
import {
  DEMO_SCENARIO_PARAM,
  type DemoScenario,
  demoScenarioFromCookie,
  toDemoScenario,
} from "../demo/scenario";
import { useStore } from "../hooks/use-catalog";
import { getLocale, m } from "../i18n";
import { meQuery } from "../lib/account";
import { type AnalyticsConfig, startAnalytics } from "../lib/analytics";
import { ANALYTICS_DEBUG, API_BASE_URL, DEMO_MODE, resolveStoreCode } from "../lib/config.server";
import { categoriesQuery, couponsQuery, storeQuery } from "../lib/queries";
import type { RouterContext } from "../router";
import appCss from "../styles.css?url";

/**
 * 루트 — 문서 머리, 헤더·푸터·모바일 하단 탭, 방문 분석 시작, 데모 패널.
 * 상점 정보와 카테고리는 헤더·푸터가 함께 쓰므로 여기서 한 번 받는다.
 */

/** 방문 분석 설정과 데모 여부 — 서버 값(`process.env`)이라 서버 함수로 내려준다 */
interface RootConfig {
  analytics: AnalyticsConfig;
  demo: DemoScenario | null;
}

interface RootData extends RootConfig {
  storeName: string;
}

const getRootConfig = createServerFn({ method: "GET" })
  .validator(z.object({ requested: z.string().optional() }))
  .handler(
    ({ data }): RootConfig => ({
      analytics: {
        apiBaseUrl: API_BASE_URL,
        storeCode: resolveStoreCode(),
        debug: ANALYTICS_DEBUG,
      },
      // 주소의 `?demo=`가 먼저다 — 쿠키는 이 응답에서 쓰여 첫 요청에는 아직 없다
      demo: DEMO_MODE
        ? data.requested !== undefined
          ? toDemoScenario(data.requested)
          : demoScenarioFromCookie(getRequestHeader("cookie"))
        : null,
    }),
  );

export const Route = createRootRouteWithContext<RouterContext>()({
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: (loaderData as RootData | undefined)?.storeName ?? m.site_store_fallback() },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Noto+Sans+KR:wght@400;500;700;900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  loader: async ({ context, location }): Promise<RootData> => {
    const requested = (location.search as Record<string, unknown>)[DEMO_SCENARIO_PARAM];
    const [config, store] = await Promise.all([
      getRootConfig({
        data: { requested: requested === undefined ? undefined : String(requested) },
      }),
      context.queryClient.ensureQueryData(storeQuery()),
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(couponsQuery()),
      context.queryClient.ensureQueryData(meQuery()),
    ]);
    return { ...config, storeName: store.name };
  },
  staleTime: Number.POSITIVE_INFINITY,
  shellComponent: RootDocument,
  component: Root,
  errorComponent: RootError,
  notFoundComponent: NotFoundView,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-page font-sans text-ink">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Root() {
  // 루트가 헤더(타입 있는 Link)를 그려 라우트 타입이 순환한다 — 루트 데이터 타입은 직접 적는다
  const { analytics, demo } = Route.useLoaderData() as RootData;
  const store = useStore();
  // 하위 화면은 모바일에서 자기 상단 바를 그린다(`MobilePageHeader`) — 로고 헤더·쿠폰 띠·푸터는 데스크톱에서만.
  // 사업자 정보는 모바일 홈 푸터에 있다
  const pageHeader = useMatches({
    select: (matches) => matches.some((match) => match.staticData?.mobileHeader === "page"),
  });
  const checkoutStep = useMatches({
    select: (matches) =>
      matches.find((match) => match.staticData?.checkoutStep)?.staticData.checkoutStep,
  });
  const hideTabBar = useMatches({
    select: (matches) => matches.some((match) => match.staticData?.hideTabBar === true),
  });
  // 방문 분석은 브라우저에서 한 번 시작한다. 데모 모드는 실제 상점이 없어 보내지 않는다
  useEffect(() => {
    if (!demo) startAnalytics(analytics);
  }, [analytics, demo]);
  return (
    <>
      {checkoutStep ? (
        <CheckoutHeader step={checkoutStep} />
      ) : (
        <div className={pageHeader ? "hidden md:block" : undefined}>
          <CouponBanner />
          <SiteHeader />
        </div>
      )}
      {store.checkoutAvailable ? null : (
        <p role="status" className="bg-surface px-4 py-3 text-center text-meta">
          {m.closed_notice()}
          {store.customerCenterPhone ? (
            <span className="ml-2 text-sub">
              {m.closed_notice_phone({ phone: store.customerCenterPhone })}
            </span>
          ) : null}
        </p>
      )}
      <Outlet />
      {checkoutStep ? null : (
        <div className={pageHeader ? "hidden md:block" : undefined}>
          <SiteFooter store={store} />
        </div>
      )}
      {hideTabBar ? null : (
        <>
          {/* 고정 하단 탭이 덮는 높이만큼 자리를 둔다 — 화면마다 여백으로 따로 맞추지 않는다 */}
          <div aria-hidden className="h-16 md:hidden" />
          <MobileTabBar />
        </>
      )}
      {demo ? <DemoPanel scenario={demo} /> : null}
    </>
  );
}

function RootError({ error }: ErrorComponentProps) {
  return (
    <main className="space-y-3 px-4 py-16 text-center">
      <h1 className="font-bold text-2xl">{m.root_error_title()}</h1>
      {error instanceof Error ? <p className="text-muted">{error.message}</p> : null}
      <Link className="inline-block underline" to="/">
        {m.root_go_home()}
      </Link>
    </main>
  );
}
