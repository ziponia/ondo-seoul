# 데모 모드

상점이 없어도, 상점에 데이터가 없어도 모든 화면을 확인할 수 있게 하는 모드다.

```bash
pnpm install
pnpm dev:demo   # SAYREN_DEMO=1 vite dev → http://localhost:4010
```

## 동작

- `SAYREN_DEMO=1`이면 서버·브라우저의 스토어프론트 SDK 클라이언트에 데모 API(`src/demo`)를 `fetch`로 주입한다(`src/lib/api.server.ts`, `src/lib/api.ts`).
- 데모 API는 실제 API처럼 엔벨로프(`{ meta, data, error }`)로 답한다. 응답은 SDK의 스키마 검증(zod)을 그대로 지나므로 화면 코드는 데모인지 모른다.
- 데모 응답이 SDK 계약과 어긋나지 않는지는 `src/demo/demo-api.test.ts`가 본다(`pnpm test`).
- 데모 모드는 명시적으로 켤 때만 쓴다. 상점 코드가 없다고 자동으로 켜지 않는다(운영 설정 실수로 구매자에게 데모 상품이 보이지 않게).
- 방문 분석은 보내지 않는다.

## 시나리오

화면 왼쪽 아래의 데모 패널, 또는 주소의 `?demo=<값>`으로 고른다. 고른 값은 쿠키(`ondo_demo_scenario`)에 남는다.

| 값        | 상태                                              |
| --------- | ------------------------------------------------- |
| `default` | 상품 16개·기획전 5개·쿠폰 5장, 테스트 결제 상점   |
| `empty`   | 상품·카테고리·기획전·쿠폰·찜이 없다               |
| `soldout` | 일부 상품 품절                                    |
| `closed`  | 주문을 받지 않는 상점(`checkoutAvailable: false`) |
| `global`  | 미국 권역 구매자(USD, 쿠폰 불가)                  |

## 상태

- 장바구니는 토큰 안에, 로그인 회원 상태(받은 쿠폰·찜 등)는 서버 메모리에 토큰별로 둔다. 서버를 다시 띄우면 처음으로 돌아간다.
- 데모 상점의 사업자 정보는 이 쇼케이스를 운영하는 에이바랩스 값이다. 실제 상점에 연결하면 상점 설정 값으로 바뀐다.
- 상품·기획전 이미지는 `scripts/demo-images.mjs`가 만든 SVG 자리표시다.

## 데이터 더하기

1. `src/demo/data/`에 데이터를 SDK 입력 타입(`z.input<typeof 스키마>`)으로 쓴다.
2. `src/demo/routes/`에 경로를 더하고 `src/demo/index.ts`의 `DEMO_ROUTES`에 넣는다.
3. `src/demo/demo-api.test.ts`에 그 경로를 SDK로 부르는 줄을 더한다.
