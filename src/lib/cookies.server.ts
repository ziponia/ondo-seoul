import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

/**
 * 서버가 쓰는 쿠키(구매자 세션·비회원 장바구니·소셜 로그인 왕복)의 이름과 속성을 한 곳에서 정한다.
 *
 * 프로덕션 빌드는 이름에 `__Host-` 접두사를 붙인다. 브라우저는 이 접두사의 쿠키를 `Secure` + `Path=/` +
 * `Domain` 없음일 때만 받는다. 그래서 같은 상위 도메인을 쓰는 다른 사이트(예: `other.example.com`)가
 * `Domain=example.com`으로 심은 쿠키가 이 이름으로 들어오지 못한다. 남이 심은 세션·로그인 상태로
 * 구매자를 로그인시키는 쿠키 주입을 막는 장치다. 접두사 없는 옛 이름은 읽지 않는다
 * (읽으면 주입된 쿠키가 다시 통한다). 옛 이름으로 로그인해 있던 구매자는 한 번 다시 로그인한다.
 *
 * 개발 서버(http)는 `Secure` 쿠키를 받지 못하는 브라우저가 있어 접두사 없이 쓴다.
 */
const SECURE = import.meta.env.PROD;

export const cookieName = (base: string): string => (SECURE ? `__Host-${base}` : base);

export function readServerCookie(base: string): string | undefined {
  return getCookie(cookieName(base));
}

export function writeServerCookie(base: string, value: string, maxAgeSec: number) {
  setCookie(cookieName(base), value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: SECURE,
    maxAge: maxAgeSec,
  });
}

/** 지울 때도 같은 속성을 준다 — `__Host-` 쿠키는 `Secure`·`Path=/`가 없으면 삭제 헤더도 거부된다 */
export function clearServerCookie(base: string) {
  deleteCookie(cookieName(base), { path: "/", secure: SECURE });
}
