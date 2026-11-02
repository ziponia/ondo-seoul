import { signupRequestSchema } from "@sayren/storefront-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SocialButtons } from "../components/account/social-buttons";
import { MobilePageHeader } from "../components/layout/mobile-page-header";
import { useStore } from "../hooks/use-catalog";
import { m } from "../i18n";
import { meQuery, redirectSchema, signup } from "../lib/account";

export const Route = createFileRoute("/signup")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({ redirect: redirectSchema }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    if (await queryClient.ensureQueryData(meQuery()))
      throw redirect({ to: search.redirect ?? "/my" });
  },
  component: SignupPage,
});

const field =
  "h-12 w-full border border-line-strong px-3.5 font-normal text-body-lg outline-none focus:border-ink";

type Agree = { terms: boolean; privacy: boolean; marketing: boolean };

/**
 * 회원가입 — 비밀번호 규칙·약관 동의는 SDK `signupRequestSchema`로 검사한다(화면에 규칙을 따로 두지 않는다).
 * 동의는 이용약관·개인정보(필수)와 마케팅(선택) 셋이다.
 */
function SignupPage() {
  const store = useStore();
  const { redirect: back } = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [agree, setAgree] = useState<Agree>({ terms: false, privacy: false, marketing: false });
  const input = {
    email: form.email,
    password: form.password,
    name: form.name,
    phone: form.phone.replaceAll("-", "") || undefined,
    agreements: { terms: agree.terms, privacy: agree.privacy, marketing: agree.marketing },
  };
  const parsed = signupRequestSchema.safeParse(input);
  const issues = parsed.success ? [] : parsed.error.issues;
  const issueOf = (key: string) => issues.find((issue) => issue.path[0] === key)?.message;
  const submit = useMutation({
    mutationFn: () => signup({ data: signupRequestSchema.omit({ cartToken: true }).parse(input) }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries();
      router.history.push(back ?? "/my");
    },
  });
  const all = agree.terms && agree.privacy && agree.marketing;
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });
  const agreeRows: { key: keyof Agree; label: string; required: boolean }[] = [
    { key: "terms", label: m.signup_terms(), required: true },
    { key: "privacy", label: m.signup_privacy(), required: true },
    { key: "marketing", label: m.signup_marketing(), required: false },
  ];
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-5 pb-28 md:px-6 md:pt-12 md:pb-24">
      <div className="-mx-5">
        <MobilePageHeader title={m.signup_title()} icons={false} center />
      </div>
      <h1 className="hidden text-center font-black text-[28px] tracking-[-0.04em] md:block">
        {m.signup_title()}
      </h1>
      <SocialButtons store={store} redirect={back} iconsOnly />
      <div className="flex items-center gap-3 text-meta text-muted">
        <span className="h-px flex-1 bg-line" />
        {m.login_or_email()}
        <span className="h-px flex-1 bg-line" />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed.success) submit.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 font-bold text-meta">
          {m.signup_email()}
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 font-bold text-meta">
          {m.signup_password()}
          <input
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={set("password")}
            aria-describedby="pw-hint"
            className={field}
          />
          <span
            id="pw-hint"
            className={`font-normal text-caption ${form.password && issueOf("password") ? "text-point" : "text-muted"}`}
          >
            {form.password && issueOf("password") ? issueOf("password") : m.signup_password_hint()}
          </span>
        </label>
        <label className="flex flex-col gap-1.5 font-bold text-meta">
          {m.signup_name()}
          <input
            autoComplete="name"
            required
            value={form.name}
            onChange={set("name")}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 font-bold text-meta">
          <span>
            {m.signup_phone()}{" "}
            <span className="font-normal text-muted">{m.signup_phone_optional()}</span>
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.phone}
            placeholder={m.signup_phone_hint()}
            onChange={set("phone")}
            className={field}
          />
          {form.phone && issueOf("phone") ? (
            <span className="font-normal text-caption text-point">{issueOf("phone")}</span>
          ) : null}
        </label>
        <fieldset className="m-0 mt-2 border border-line p-0">
          <legend className="sr-only">{m.signup_agree_all()}</legend>
          <label className="flex items-center gap-2.5 border-line border-b px-4 py-3.5 font-bold text-body-lg">
            <input
              type="checkbox"
              checked={all}
              onChange={() => setAgree({ terms: !all, privacy: !all, marketing: !all })}
              className="h-[18px] w-[18px] accent-ink"
            />
            {m.signup_agree_all()}
          </label>
          {agreeRows.map((row) => (
            <label key={row.key} className="flex items-center gap-2.5 px-4 py-2.5 text-body">
              <input
                type="checkbox"
                checked={agree[row.key]}
                onChange={() => setAgree({ ...agree, [row.key]: !agree[row.key] })}
                className="h-[18px] w-[18px] accent-ink"
              />
              <span className={row.required ? "text-point" : "text-muted"}>
                {row.required ? m.signup_required() : m.signup_optional()}
              </span>
              {row.label}
            </label>
          ))}
        </fieldset>
        {submit.data && !submit.data.ok ? (
          <p role="alert" className="text-meta text-point">
            {submit.data.message || m.signup_failed()}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:border-0 md:p-0">
          <button
            type="submit"
            disabled={!parsed.success || submit.isPending}
            className="h-[54px] w-full bg-ink font-bold text-base text-page disabled:bg-disabled md:mt-2"
          >
            {m.signup_submit()}
          </button>
        </div>
        <p className="flex justify-center gap-2 text-body text-sub">
          {m.signup_have_account()}
          <Link to="/login" search={{ redirect: back }} className="font-bold text-ink">
            {m.login_submit()}
          </Link>
        </p>
      </form>
    </main>
  );
}
