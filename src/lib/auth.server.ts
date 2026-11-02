import { createStorefrontAuth } from "@sayren/storefront-sdk/auth";
import { transport } from "./api.server";
import { clearServerCookie, readServerCookie, writeServerCookie } from "./cookies.server";
import { type BuyerSession, clearSession, readSession, writeSession } from "./session.server";

/** 구매자 인증 — `/auth`는 서버에서만 쓴다(`buyer-token-cookie` 규칙). 요청마다 만든다 */
export function buyerAuth() {
  const { baseUrl, storeCode, fetch } = transport();
  return createStorefrontAuth({ baseUrl, storeCode, fetch });
}

export function saveTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  writeSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  });
}

/** 소셜 로그인 왕복 값 — state·PKCE verifier·돌아갈 곳. 10분 */
const IDP = "ondo_idp";

/** 소셜 왕복 값 — `link`가 있으면 로그인이 아니라 로그인한 회원에 그 공급자를 연결하는 왕복이다 */
export interface IdpState {
  state: string;
  codeVerifier: string;
  redirect: string;
  link?: "kakao" | "naver" | "google";
}

export function writeIdpState(value: IdpState) {
  writeServerCookie(IDP, JSON.stringify(value), 10 * 60);
}

export function takeIdpState(): IdpState | null {
  const raw = readServerCookie(IDP);
  clearServerCookie(IDP);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 만료 1분 전이면 토큰을 갱신한다 — 요청 미들웨어가 부른다. 같은 리프레시 토큰의 동시 갱신은 서버가 30초 동안
 * 같은 결과를 주므로 그대로 둔다. 401이면 세션을 지우고, 5xx·네트워크 오류면 세션을 지키고 다음 요청에 다시 한다.
 */
export async function refreshIfNeeded(): Promise<BuyerSession | null> {
  const session = readSession();
  if (!session || session.expiresAt - Date.now() > 60_000) return session;
  try {
    const tokens = await buyerAuth().refresh(session.refreshToken);
    saveTokens(tokens);
    return readSession();
  } catch (error) {
    if ((error as { status?: number }).status === 401) {
      clearSession();
      return null;
    }
    return session;
  }
}
