import { DemoApiError, type DemoRoute, route } from "../http";
import { demoMemberOf, dropDemoToken, issueDemoToken, requireMember } from "../member-state";
import { mergeGuestCart } from "./cart";

/**
 * 데모 구매자 인증 — 이메일·비밀번호는 무엇이든 받는다(데모). 소셜 로그인은 공급자 대신
 * 스토어프론트 콜백 주소로 바로 돌려보낸다(`code=demo`).
 */
const ACCESS_TTL = 30 * 60;

/** 로그인·가입 응답 — 본문의 비회원 장바구니(`cartToken`)를 회원 장바구니에 합친다(실제 API와 같다) */
function signedIn(accessToken: string, cartToken: string | undefined) {
  const member = demoMemberOf(accessToken);
  if (member) mergeGuestCart(member, cartToken);
  return tokens(accessToken);
}

function tokens(accessToken: string) {
  return { accessToken, refreshToken: `refresh.${accessToken}`, expiresIn: ACCESS_TTL };
}

export const authRoutes: DemoRoute[] = [
  route("POST", "/auth/login", ({ body }) => {
    const input = body as { email: string; password: string; cartToken?: string };
    if (!input.email || !input.password) {
      throw new DemoApiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 맞지 않습니다");
    }
    return signedIn(issueDemoToken({ email: input.email }), input.cartToken);
  }),

  route("POST", "/auth/signup", ({ body }) => {
    const input = body as {
      email: string;
      name: string;
      phone?: string;
      agreements: { marketing?: boolean };
      cartToken?: string;
    };
    return signedIn(
      issueDemoToken({
        email: input.email,
        name: input.name,
        phone: input.phone ?? null,
        joinedAt: new Date().toISOString(),
        marketingAgreed: input.agreements?.marketing === true,
        identities: [],
        downloadedCoupons: new Set(),
        wishlist: new Set(),
        points: 0,
        addresses: [],
        sample: false,
      }),
      input.cartToken,
    );
  }),

  route("POST", "/auth/token/refresh", ({ body }) => {
    const refreshToken = (body as { refreshToken: string }).refreshToken;
    if (!refreshToken.startsWith("refresh.")) {
      throw new DemoApiError(401, "INVALID_REFRESH_TOKEN", "다시 로그인해 주십시오");
    }
    return tokens(refreshToken.slice("refresh.".length));
  }),

  route("POST", "/auth/logout", ({ ctx }) => {
    dropDemoToken(ctx.accessToken);
    return null;
  }),

  route("POST", "/auth/idp/:provider/authorize", ({ body }) => {
    const input = body as { redirectUri: string; state: string };
    const url = new URL(input.redirectUri);
    url.searchParams.set("code", "demo");
    url.searchParams.set("state", input.state);
    return { url: url.toString() };
  }),

  route("POST", "/auth/idp/token", ({ body }) => {
    const input = body as { code: string; cartToken?: string };
    if (input.code !== "demo")
      throw new DemoApiError(400, "INVALID_GRANT", "로그인을 완료하지 못했습니다");
    return signedIn(issueDemoToken({ hasPassword: false, email: null }), input.cartToken);
  }),

  route("POST", "/auth/withdraw", ({ ctx }) => {
    requireMember(ctx);
    dropDemoToken(ctx.accessToken);
    return null;
  }),

  route("GET", "/me", ({ ctx }) => {
    const member = requireMember(ctx);
    return {
      memberId: member.memberId,
      email: member.email,
      name: member.name,
      phone: member.phone,
      point: member.points,
      marketingAgreed: member.marketingAgreed,
      joinedAt: member.joinedAt,
      reconsentRequired: false,
    };
  }),

  route("GET", "/me/identities", ({ ctx }) => {
    const member = requireMember(ctx);
    return {
      hasPassword: member.hasPassword,
      hasExternalAuth: false,
      identities: member.identities,
    };
  }),

  route("POST", "/me/identities/:provider/authorize", ({ body }) => {
    const input = body as { redirectUri: string; state: string };
    const url = new URL(input.redirectUri);
    url.searchParams.set("code", "demo");
    url.searchParams.set("state", input.state);
    return { url: url.toString() };
  }),

  route("POST", "/me/identities/:provider", ({ ctx, params }) => {
    const member = requireMember(ctx);
    const provider = params.provider as "kakao" | "naver" | "google";
    if (!member.identities.some((i) => i.provider === provider)) {
      member.identities.push({ provider, email: null, linkedAt: new Date().toISOString() });
    }
    return {
      hasPassword: member.hasPassword,
      hasExternalAuth: false,
      identities: member.identities,
    };
  }),

  route("DELETE", "/me/identities/:provider", ({ ctx, params }) => {
    const member = requireMember(ctx);
    if (!member.hasPassword && member.identities.length <= 1) {
      throw new DemoApiError(409, "LAST_LOGIN_METHOD", "마지막 로그인 수단은 해제할 수 없습니다");
    }
    member.identities = member.identities.filter((i) => i.provider !== params.provider);
    return {
      hasPassword: member.hasPassword,
      hasExternalAuth: false,
      identities: member.identities,
    };
  }),
];
