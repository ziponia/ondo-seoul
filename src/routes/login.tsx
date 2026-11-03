import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SocialButtons } from "../components/account/social-buttons";
import { MobilePageHeader } from "../components/layout/mobile-page-header";
import { useStore } from "../hooks/use-catalog";
import { m } from "../i18n";
import { login, meQuery, redirectSchema } from "../lib/account";

export const Route = createFileRoute("/login")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    redirect: redirectSchema,
    passwordReset: z.literal("done").optional(),
  }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    // 이미 로그인했으면 돌아갈 곳으로 보낸다
    if (await queryClient.ensureQueryData(meQuery()))
      throw redirect({ to: search.redirect ?? "/my" });
  },
  component: LoginPage,
});

const field =
  "h-[50px] w-full border border-line-strong px-3.5 font-normal text-body-lg outline-none focus:border-ink";

function LoginPage() {
  const store = useStore();
  const { redirect: back, passwordReset } = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = useMutation({
    mutationFn: () => login({ data: { email, password } }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries();
      router.history.push(back ?? "/my");
    },
  });
  const passwordLogin = store.loginMethods.includes("password");
  const form = passwordLogin ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate();
      }}
      className="flex flex-col gap-3"
    >
      {passwordReset === "done" ? (
        <p role="status" className="border border-line-strong px-4 py-3.5 text-body">
          {m.login_password_reset_done()}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5 font-bold text-meta">
        <span className="max-md:sr-only">{m.login_email()}</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          placeholder={m.login_email()}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1.5 font-bold text-meta">
        <span className="max-md:sr-only">{m.login_password()}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          placeholder={m.login_password()}
          onChange={(event) => setPassword(event.target.value)}
          className={field}
        />
      </label>
      {submit.data && !submit.data.ok ? (
        <p role="alert" className="text-meta text-point">
          {submit.data.message || m.login_failed()}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submit.isPending}
        className="mt-2 h-[54px] bg-ink font-bold text-base text-page disabled:bg-disabled"
      >
        {m.login_submit()}
      </button>
      <Link
        to="/password-reset"
        className="self-center text-meta text-sub underline-offset-4 hover:underline"
      >
        {m.login_forgot()}
      </Link>
    </form>
  ) : null;
  const signupLine = (
    <p className="flex justify-center gap-2 text-body text-sub">
      {m.login_no_account()}
      <Link
        to="/signup"
        search={{ redirect: back }}
        className="font-bold text-ink underline-offset-4 max-md:underline"
      >
        {m.login_signup()}
      </Link>
    </p>
  );
  return (
    <main className="mx-auto flex max-w-[420px] flex-col gap-6 px-5 pb-16 md:px-6 md:pt-14 md:pb-24">
      <div className="-mx-5">
        <MobilePageHeader title="" icons={false} />
      </div>
      {/* 모바일 — 소셜이 먼저, 이메일이 아래(시안 MLogin) */}
      <div className="flex flex-col gap-5 pt-4 md:hidden">
        <span className="font-display font-extrabold text-[30px] tracking-[-0.04em]">
          {store.name}
        </span>
        <h1 className="font-black text-[22px] leading-[1.4] tracking-[-0.03em]">
          {m.login_mobile_title()}
        </h1>
        <SocialButtons
          store={store}
          redirect={back}
          compact
          divider={passwordLogin ? { label: m.login_or_email(), position: "after" } : undefined}
        />
        {form}
        {passwordLogin ? signupLine : null}
      </div>
      {/* 데스크톱 — 이메일이 먼저, 간편 로그인이 아래(시안 Login) */}
      <div className="hidden flex-col gap-6 md:flex">
        <h1 className="text-center font-black text-[28px] tracking-[-0.04em]">{m.login_title()}</h1>
        {form}
        {passwordLogin ? signupLine : null}
        <SocialButtons
          store={store}
          redirect={back}
          divider={{ label: m.login_social(), position: "before" }}
        />
      </div>
    </main>
  );
}
