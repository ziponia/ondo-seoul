import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { PageSkeleton } from "./components/page-skeleton";
import { routeTree } from "./routeTree.gen";

/** 라우트 loader가 받는 문맥 — loader가 `queryClient.ensureQueryData`로 미리 받아 둔다 */
export interface RouterContext {
  queryClient: QueryClient;
}

export function getRouter() {
  // 요청마다 새로 만든다 — 서버 렌더에서 다른 구매자의 캐시가 섞이지 않는다
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 서버가 받아 둔 데이터를 하이드레이션 직후 다시 부르지 않는다
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient } satisfies RouterContext,
    scrollRestoration: true,
    // 링크에 마우스를 올리거나 포커스하면 다음 화면 데이터를 미리 받는다(30초 동안 다시 받지 않는다).
    // loader가 상태를 바꾸는 화면(주문서 세션 생성·주문 완료의 바로구매 쿠키 삭제)은 라우트에서 `preload: false`로 뺀다
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // 이동한 화면의 데이터가 0.3초 넘게 늦으면 스켈레톤을 보인다
    defaultPendingComponent: PageSkeleton,
    defaultPendingMs: 300,
  });

  // 서버에서 채운 쿼리 캐시를 HTML에 실어 보내고 브라우저에서 되살린다(QueryClientProvider도 여기서 감싼다)
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
  interface StaticDataRouteOption {
    /** `page`: 모바일에서 로고 헤더 대신 화면이 자기 상단 바(`MobilePageHeader`)를 그린다 */
    mobileHeader?: "page";
    /** 모바일 하단 탭을 숨긴다 — 화면이 자기 하단 고정 바(구매·결제)를 그린다 */
    hideTabBar?: boolean;
    /** 결제 단계 화면 — 데스크톱에서 상점 헤더·푸터 대신 로고와 단계만 보인다 */
    checkoutStep?: 2 | 3;
  }
}
