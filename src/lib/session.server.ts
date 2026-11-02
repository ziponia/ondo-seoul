import { getRequest } from "@tanstack/react-start/server";
import { apiFor } from "./api.server";
import { clearServerCookie, readServerCookie, writeServerCookie } from "./cookies.server";

/**
 * 구매자 세션과 비회원 장바구니 — 둘 다 HttpOnly 쿠키이고 서버에서만 읽는다.
 * 토큰을 모듈 변수에 두지 않는다(서버 렌더에서 다른 구매자 요청과 섞인다). 요청마다 쿠키에서 읽는다.
 */
const SESSION = "ondo_session";
const CART = "ondo_cart";
/** 리프레시 토큰 수명(14일)과 같게 둔다 */
const SESSION_MAX_AGE = 14 * 24 * 60 * 60;
const CART_MAX_AGE = 30 * 24 * 60 * 60;

export interface BuyerSession {
  accessToken: string;
  refreshToken: string;
  /** 액세스 토큰 만료 시각(epoch ms) */
  expiresAt: number;
}

/**
 * 이 요청에서 새로 쓴 세션 — 쿠키는 응답으로 나가므로 같은 요청의 다음 읽기는 아직 옛 쿠키를 본다.
 * 요청 객체를 키로 둬 요청이 끝나면 함께 사라진다(요청끼리 섞이지 않는다).
 */
const written = new WeakMap<Request, BuyerSession | null>();

export function readSession(): BuyerSession | null {
  const request = getRequest();
  if (written.has(request)) return written.get(request) ?? null;
  const raw = readServerCookie(SESSION);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<BuyerSession>;
    return value.accessToken && value.refreshToken && value.expiresAt
      ? (value as BuyerSession)
      : null;
  } catch {
    return null;
  }
}

export function writeSession(session: BuyerSession) {
  written.set(getRequest(), session);
  writeServerCookie(SESSION, JSON.stringify(session), SESSION_MAX_AGE);
}

export function clearSession() {
  written.set(getRequest(), null);
  clearServerCookie(SESSION);
}

export function readCartToken(): string | null {
  return readServerCookie(CART) ?? null;
}

export function writeCartToken(token: string) {
  writeServerCookie(CART, token, CART_MAX_AGE);
}

export function clearCartToken() {
  clearServerCookie(CART);
}

/** 이 요청의 구매자로 부르는 SDK — 로그인했으면 회원 토큰, 아니면 비회원 장바구니 토큰 */
export function buyerApi() {
  // 같은 요청에서 담기·삭제를 이어 부르면 장바구니 토큰이 바뀐다 — 바뀐 값을 다음 호출이 읽는다
  let cartToken = readCartToken();
  return apiFor({
    accessToken: readSession()?.accessToken ?? null,
    cartToken: () => cartToken ?? undefined,
    onCartToken: (token) => {
      cartToken = token;
      writeCartToken(token);
    },
  });
}
