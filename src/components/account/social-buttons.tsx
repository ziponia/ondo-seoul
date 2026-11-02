import type { StorefrontStore } from "@sayren/storefront-sdk";
import { useMutation } from "@tanstack/react-query";
import { m } from "../../i18n";
import { startSocialLogin } from "../../lib/account";

export type Provider = "kakao" | "naver" | "google";

const LABEL: Record<Provider, () => string> = {
  kakao: m.login_kakao,
  naver: m.login_naver,
  google: m.login_google,
};

/** 반 폭 버튼에 쓰는 짧은 이름 */
const SHORT: Record<Provider, () => string> = {
  kakao: m.provider_kakao,
  naver: m.provider_naver,
  google: m.provider_google,
};

export const STYLE: Record<Provider, string> = {
  kakao: "bg-kakao text-kakao-ink",
  naver: "bg-naver text-page",
  google: "border border-line-strong bg-page text-ink",
};

export function Mark({ provider }: { provider: Provider }) {
  if (provider === "kakao") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 4C6.9 4 3 7.2 3 11.1c0 2.5 1.6 4.7 4.1 5.9l-1 3.6 4.2-2.8c.6.1 1.1.1 1.7.1 5.1 0 9-3.2 9-7.1S17.1 4 12 4z"
        />
      </svg>
    );
  }
  if (provider === "naver") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M4 3h5.5l5 7.4V3H20v18h-5.5l-5-7.4V21H4z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
      />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z"
      />
    </svg>
  );
}

/**
 * 소셜 로그인 버튼 — 상점이 켠 방법(`store.loginMethods`)만 그 순서로 그린다.
 * 누르면 서버가 state·PKCE를 쿠키에 두고 공급자 주소를 돌려주고, 브라우저가 이동한다.
 */
export function SocialButtons({
  store,
  redirect,
  compact = false,
  iconsOnly = false,
  divider,
}: {
  store: StorefrontStore;
  redirect?: string;
  /** 모바일 — 카카오를 크게, 나머지를 반씩 */
  compact?: boolean;
  /** 아이콘만 같은 폭으로(회원가입) — 이름은 화면 읽기용 */
  iconsOnly?: boolean;
  /** 이메일 칸과 가르는 줄 — 버튼이 없으면 줄도 그리지 않는다 */
  divider?: { label: string; position: "before" | "after" };
}) {
  const providers = store.loginMethods.filter(
    (method): method is Provider => method !== "password",
  );
  const start = useMutation({
    mutationFn: (provider: Provider) => startSocialLogin({ data: { provider, redirect } }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  if (providers.length === 0) return null;
  const line = divider ? <Divider label={divider.label} /> : null;
  const buttons = (
    <div
      className={
        iconsOnly
          ? "grid grid-flow-col auto-cols-fr gap-2"
          : compact
            ? "grid grid-cols-2 gap-2"
            : "flex flex-col gap-2"
      }
    >
      {providers.map((provider, index) => (
        <button
          key={provider}
          type="button"
          disabled={start.isPending}
          onClick={() => start.mutate(provider)}
          className={`flex h-13 items-center justify-center gap-2.5 font-bold text-body-lg ${STYLE[provider]} ${
            compact && !iconsOnly && index === 0 ? "col-span-2 h-14" : ""
          }`}
        >
          <Mark provider={provider} />
          {iconsOnly ? (
            <span className="sr-only">{LABEL[provider]()}</span>
          ) : compact && index > 0 ? (
            SHORT[provider]()
          ) : (
            LABEL[provider]()
          )}
        </button>
      ))}
    </div>
  );
  return (
    <>
      {divider?.position === "before" ? line : null}
      {buttons}
      {divider?.position === "after" ? line : null}
    </>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-meta text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
