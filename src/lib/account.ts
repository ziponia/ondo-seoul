import { ApiError, signupRequestSchema, socialProviderSchema } from "@sayren/storefront-sdk";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";
import { buyerAuth, saveTokens, takeIdpState, writeIdpState } from "./auth.server";
import {
  buyerApi,
  clearCartToken,
  clearSession,
  readCartToken,
  readSession,
} from "./session.server";

/**
 * 구매자 계정 — 로그인·가입·소셜 로그인·로그아웃은 서버 함수에서 하고 토큰은 HttpOnly 쿠키에 둔다.
 * 로그인·가입 때 비회원 장바구니 토큰을 실어 회원 장바구니로 합친 뒤 장바구니 쿠키를 지운다.
 */

/** 돌아갈 곳 — 같은 사이트 경로만 받는다(다른 사이트로 보내는 열린 리다이렉트를 막는다) */
export const redirectSchema = z
  .string()
  .regex(/^\/(?!\/)/)
  .optional()
  .catch(undefined);

const getMe = createServerFn({ method: "GET" }).handler(async () => {
  if (!readSession()) return null;
  return buyerApi()
    .member.me()
    .catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return null;
      }
      throw error;
    });
});

/** 지금 구매자 — 로그인하지 않았으면 null */
export const meQuery = () => queryOptions({ queryKey: ["me"], queryFn: () => getMe() });

function failure(error: unknown): { ok: false; message: string } {
  if (error instanceof ApiError) return { ok: false, message: error.message };
  throw error;
}

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    try {
      const cartToken = readCartToken() ?? undefined;
      saveTokens(await buyerAuth().session({ ...data, cartToken }));
      if (cartToken) clearCartToken();
      return { ok: true as const };
    } catch (error) {
      return failure(error);
    }
  });

/**
 * 비밀번호 재설정 메일 요청 — sayren이 상점 이름으로 메일을 보낸다. 바꾼 뒤 로그인 화면으로 돌아오게 successUrl을 넘긴다
 * (https 상점 도메인만 허용되어 로컬 http 개발 서버에서는 생략한다)
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const successUrl = new URL("/login", getRequestUrl());
    try {
      await buyerAuth().requestPasswordReset({
        email: data.email,
        successUrl: successUrl.protocol === "https:" ? successUrl.toString() : undefined,
      });
      return { ok: true as const };
    } catch (error) {
      return failure(error);
    }
  });

export const signup = createServerFn({ method: "POST" })
  .validator(signupRequestSchema.omit({ cartToken: true }))
  .handler(async ({ data }) => {
    try {
      const cartToken = readCartToken() ?? undefined;
      saveTokens(await buyerAuth().signUp({ ...data, cartToken }));
      if (cartToken) clearCartToken();
      return { ok: true as const };
    } catch (error) {
      return failure(error);
    }
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = readSession();
  if (session)
    await buyerAuth()
      .signOut(session.accessToken)
      .catch(() => undefined);
  clearSession();
  return { ok: true as const };
});

/** 소셜 로그인 시작 — state·verifier를 쿠키에 두고 공급자 주소를 돌려준다(브라우저가 이동한다) */
export const startSocialLogin = createServerFn({ method: "POST" })
  .validator(z.object({ provider: socialProviderSchema, redirect: redirectSchema }))
  .handler(async ({ data }) => {
    const redirectUri = new URL(`/auth/callback/${data.provider}`, getRequestUrl()).toString();
    const started = await buyerAuth().idp(data.provider, { redirectUri });
    writeIdpState({
      state: started.state,
      codeVerifier: started.codeVerifier,
      redirect: data.redirect ?? "/my",
    });
    return { url: started.url };
  });

/** 소셜 로그인 마무리 — 콜백 화면이 부른다 */
export const finishSocialLogin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().nullable(),
      state: z.string().nullable(),
      error: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const saved = takeIdpState();
    if (!saved) return { ok: false as const, redirect: "/login" };
    if (saved.link) {
      // 계정 연결 왕복 — 로그인한 회원에 이 공급자를 붙이고 연결된 계정 화면으로 돌아간다
      const session = readSession();
      if (!session) return { ok: false as const, redirect: "/login" };
      try {
        await buyerAuth().linkIdpCallback(session.accessToken, saved.link, {
          code: data.code,
          state: data.state,
          error: data.error,
          expectedState: saved.state,
          codeVerifier: saved.codeVerifier,
        });
        return { ok: true as const, redirect: saved.redirect };
      } catch {
        return { ok: false as const, redirect: saved.redirect };
      }
    }
    try {
      const cartToken = readCartToken() ?? undefined;
      const tokens = await buyerAuth().idpCallback({
        code: data.code,
        state: data.state,
        error: data.error,
        expectedState: saved.state,
        codeVerifier: saved.codeVerifier,
        cartToken,
      });
      saveTokens(tokens);
      if (cartToken) clearCartToken();
      return { ok: true as const, redirect: saved.redirect };
    } catch {
      return { ok: false as const, redirect: "/login" };
    }
  });

/** 소셜 계정 연결 시작 — 로그인과 같은 콜백 화면으로 돌아온다(왕복 값에 `link` 표시) */
export const startLinkIdentity = createServerFn({ method: "POST" })
  .validator(z.object({ provider: socialProviderSchema }))
  .handler(async ({ data }) => {
    const session = readSession();
    if (!session) return { url: "/login" };
    const redirectUri = new URL(`/auth/callback/${data.provider}`, getRequestUrl()).toString();
    const started = await buyerAuth().linkIdp(session.accessToken, data.provider, { redirectUri });
    writeIdpState({
      state: started.state,
      codeVerifier: started.codeVerifier,
      redirect: "/my/account?tab=identities",
      link: data.provider,
    });
    return { url: started.url };
  });

/** 소셜 계정 연결 해제 — 마지막 로그인 수단이면 서버가 거절한다 */
export const unlinkIdentity = createServerFn({ method: "POST" })
  .validator(z.object({ provider: socialProviderSchema }))
  .handler(async ({ data }) => {
    const session = readSession();
    if (!session) return { ok: false as const, message: "" };
    try {
      await buyerAuth().unlinkIdp(session.accessToken, data.provider);
      return { ok: true as const };
    } catch (error) {
      return failure(error);
    }
  });

/** 회원 탈퇴 — 비밀번호로 가입한 회원은 비밀번호로 본인 확인. 성공하면 세션을 지운다 */
export const withdraw = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(1).max(200).optional() }))
  .handler(async ({ data }) => {
    const session = readSession();
    if (!session) return { ok: false as const, message: "" };
    try {
      await buyerAuth().withdraw(session.accessToken, data);
      clearSession();
      clearCartToken();
      return { ok: true as const };
    } catch (error) {
      return failure(error);
    }
  });
