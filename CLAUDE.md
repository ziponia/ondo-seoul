# CLAUDE.md — sayren 스토어프론트 보일러플레이트

이 폴더는 sayren 스토어프론트 보일러플레이트다(`npx sayren create`, 호스팅 「처음부터」). 인프라와 상점 이름·상품 목록을 보이는 홈만 있고 화면은 쇼핑몰마다 새로 만든다.
상점·상품·주문 데이터는 sayren이 보관하고, 이 앱은 스토어프론트 SDK(`@sayren/storefront-sdk`)로 읽는다.

## 이미 있는 것

- TanStack Start + React 19 + Tailwind v4(`src/theme.css`의 `@theme` 토큰). 라우트는 `src/routes/`(파일 기반).
- SDK 연결: 서버 `src/lib/api.server.ts`(`apiFor()`), 브라우저 `src/lib/api.ts`, 설정 `src/lib/config.server.ts`(환경 변수 `SAYREN_API_URL`·`SAYREN_STORE_CODE`, 로컬은 `.env`).
- 홈: `src/routes/index.tsx` — 상점 이름과 상품 목록(첫 페이지). 금액 표시는 `src/lib/format.ts`(`formatMoney`).
- 기본 조회와 훅: `src/lib/queries.ts`(queryOptions) · `src/hooks/use-catalog.ts`(`useStore`·`useCategories`·`useProducts`·`useProduct`).
- 문구: `messages/ko.json` + `src/i18n`(`m.키()`). 화면 문구는 코드에 쓰지 않고 이 파일에 둔다.
- 방문 분석: 루트가 `startAnalytics`로 시작한다(`src/lib/analytics.ts`). 서버 쿠키는 `src/lib/cookies.server.ts` 한 곳이다.
- 화면을 늘릴 때 쓰도록 미리 설치한 패키지(지금 코드는 쓰지 않는다). 같은 용도로 다른 패키지를 더 설치하지 않는다.
  - 스크롤 연출: `gsap`·`lenis`
  - 캐러셀·슬라이더: `embla-carousel-react`
  - 아이콘: `lucide-react`
  - URL 상태(필터·정렬·페이지): `nuqs`(쿼리 문자열 직접 다룰 때는 `query-string`)
  - 폼·입력 검증: `react-hook-form` + `@hookform/resolvers`(스키마는 `zod`)
  - 배송지 주소 검색: `react-daum-postcode`
  - 상품 상세설명 표시: `@avarlabs/editor`(읽기 스타일 `reader.css`는 `src/styles.css`가 이미 불러온다)

## 만들 때의 규칙

- 셀러가 요청한 화면만 만든다. 장바구니·주문서·결제·구매자 로그인은 셀러가 요청할 때까지 만들지 않는다.
  요청을 받으면 SDK의 장바구니·주문서·`/payments`·`/auth` 모듈로 만들고 `sdk-cart`·`sdk-checkout`·`sdk-payments`·`sdk-buyer-auth` 스킬과 규칙 검증(`verify_site`)을 따른다.
- 데이터는 라우트 loader에서 `queryClient.ensureQueryData(...)`로 먼저 받고 화면은 훅으로 읽는다. `fetch`로 api를 직접 부르지 않는다.
- 금액·재고·주문 가능 여부는 응답 값을 그대로 보인다. 화면에서 계산하지 않는다.
- `process.env`는 `*.server.ts`에서만 읽는다. 모듈 최상위에서 `window`·`document`를 읽지 않는다.
- 색·글꼴·모서리는 `src/theme.css` 토큰으로만 쓴다.
- 기능·화면을 추가·구현·변경하기 전에 `sayren` 스킬(`.claude/skills/sayren`)을 먼저 쓴다. 중앙 스킬 목록(`npx -y sayren@latest skill list`)에서 작업에 맞는 스킬을 골라 본문(`npx -y sayren@latest skill <이름>`)을 읽고 따른다(스킬은 이 프로젝트를 고치지 않고 바뀐다).

## 확인

- `pnpm typecheck` · `pnpm test` · `pnpm build`
- 배포 산출물 경로는 `sayren.json`(`output.static`·`output.server`)이 정한다. 빌드 출력 위치를 바꾸면 이 파일도 같이 고친다.
- 원격 MCP(`.mcp.json`, sayren 계정 로그인)로 상점 데이터를 읽고 `verify_site`로 규칙을 확인한다.
