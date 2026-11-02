import { socialProviderSchema } from "@sayren/storefront-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Mark, STYLE } from "../../components/account/social-buttons";
import { m } from "../../i18n";
import { finishSocialLogin } from "../../lib/account";

const NAMES = {
  kakao: () => m.provider_kakao(),
  naver: () => m.provider_naver(),
  google: () => m.provider_google(),
} as const;

/**
 * 소셜 로그인 처리 — 공급자가 돌려보낸 `code`·`state`를 서버 함수로 넘겨 토큰으로 바꾼다.
 * code는 1회용이라 화면이 그려진 뒤 한 번만 부른다(미리 불러오기에서 부르지 않는다).
 */
export const Route = createFileRoute("/auth/callback/$provider")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    code: z.string().optional().catch(undefined),
    state: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: CallbackPage,
});

function CallbackPage() {
  const { provider } = Route.useParams();
  const search = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  const key = socialProviderSchema.safeParse(provider).data ?? "kakao";
  const name = NAMES[key]();
  useEffect(() => {
    let done = false;
    finishSocialLogin({
      data: { code: search.code ?? null, state: search.state ?? null, error: search.error ?? null },
    }).then(async (result) => {
      if (done) return;
      if (!result.ok) {
        setFailed(true);
        return;
      }
      await queryClient.invalidateQueries();
      router.history.replace(result.redirect);
    });
    return () => {
      done = true;
    };
  }, [search.code, search.state, search.error, queryClient, router]);
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      {failed ? (
        <div role="alert" className="flex max-w-md flex-col items-center gap-3.5 text-center">
          <span
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-full border-2 border-point font-display font-extrabold text-3xl text-point"
          >
            !
          </span>
          <h1 className="font-black text-[22px] tracking-[-0.03em]">{m.sc_failed()}</h1>
          <p className="text-body text-sub">{m.sc_failed_hint()}</p>
          <div className="mt-2 flex gap-2">
            <Link
              to="/login"
              className="grid h-13 place-items-center bg-ink px-7 font-bold text-body-lg text-page"
            >
              {m.sc_retry()}
            </Link>
            <Link
              to="/"
              className="grid h-13 place-items-center border border-ink px-7 font-bold text-body-lg"
            >
              {m.root_go_home()}
            </Link>
          </div>
        </div>
      ) : (
        <div role="status" className="flex flex-col items-center gap-4 text-center">
          <span
            aria-hidden
            className={`grid h-16 w-16 place-items-center rounded-full ${STYLE[key]}`}
          >
            <Mark provider={key} />
          </span>
          <span
            aria-hidden
            className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-ink border-t-transparent motion-reduce:animate-none"
          />
          <h1 className="font-black text-[22px] tracking-[-0.03em]">
            {m.sc_waiting({ provider: name })}
          </h1>
          <p className="text-body text-sub">{m.sc_wait_hint()}</p>
        </div>
      )}
    </main>
  );
}
