import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobilePageHeader } from "../components/layout/mobile-page-header";
import { m } from "../i18n";
import { requestPasswordReset } from "../lib/account";

/**
 * 비밀번호 찾기 — 이메일을 받아 재설정 메일을 요청한다. 새 비밀번호는 메일 링크의 sayren 화면에서 설정하고 로그인 화면으로 돌아온다
 */
export const Route = createFileRoute("/password-reset")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  component: PasswordResetPage,
});

const field =
  "h-[50px] w-full border border-line-strong px-3.5 font-normal text-body-lg outline-none focus:border-ink";

function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const submit = useMutation({ mutationFn: () => requestPasswordReset({ data: { email } }) });
  const sent = submit.data?.ok === true;
  return (
    <main className="mx-auto flex max-w-[420px] flex-col gap-6 px-5 pb-16 md:px-6 md:pt-14 md:pb-24">
      <div className="-mx-5">
        <MobilePageHeader title="" icons={false} />
      </div>
      <div className="flex flex-col gap-2 pt-4 md:items-center md:text-center">
        <h1 className="font-black text-[22px] tracking-[-0.03em] md:text-[28px] md:tracking-[-0.04em]">
          {m.password_reset_title()}
        </h1>
        <p className="text-body text-sub">{m.password_reset_desc()}</p>
      </div>
      {sent ? (
        <p role="status" className="border border-line-strong px-4 py-3.5 text-body">
          {m.password_reset_sent()}
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit.mutate();
          }}
          className="flex flex-col gap-3"
        >
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
          {submit.data && !submit.data.ok ? (
            <p role="alert" className="text-meta text-point">
              {submit.data.message || m.password_reset_failed()}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submit.isPending}
            className="mt-2 h-[54px] bg-ink font-bold text-base text-page disabled:bg-disabled"
          >
            {m.password_reset_submit()}
          </button>
        </form>
      )}
      <Link to="/login" className="text-center text-body text-sub underline underline-offset-4">
        {m.password_reset_back()}
      </Link>
    </main>
  );
}
