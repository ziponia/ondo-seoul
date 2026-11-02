import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { m } from "../i18n";
import { DEMO_MODE } from "../lib/config.server";
import { formatMoney } from "../lib/format";

const isDemo = createServerFn({ method: "GET" }).handler(() => DEMO_MODE);

/**
 * 데모 결제창 — 데모 모드에서 결제 시작 응답의 `payUrl`이 가리킨다. 결제사 결제창 대신 결과를 골라
 * 결제사가 돌려보내는 것과 같은 쿼리로 복귀 주소(`returnUrl`)에 보낸다. 데모 모드가 아니면 없는 화면이다.
 */
export const Route = createFileRoute("/demo-pay")({
  staticData: { mobileHeader: "page", hideTabBar: true, checkoutStep: 2 },
  validateSearch: z.object({
    paymentId: z.string(),
    attemptId: z.string(),
    token: z.string(),
    returnUrl: z.string().regex(/^https?:\/\//),
    amount: z.coerce.number(),
    currency: z.string().optional().catch(undefined),
    method: z.string().optional().catch(undefined),
  }),
  loader: async () => {
    if (!(await isDemo())) throw notFound();
  },
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: DemoPay,
});

function DemoPay() {
  const search = Route.useSearch();
  /** 토스페이먼츠 복귀 쿼리 모양 — SDK `payments.result()`가 승인·실패 보고를 고른다 */
  const back = (params: Record<string, string>) => {
    const url = new URL(search.returnUrl);
    // 복귀 주소는 이 앱 주소만 받는다
    if (url.origin !== window.location.origin) return;
    url.searchParams.set("sayrenPaymentId", search.paymentId);
    url.searchParams.set("sayrenAttemptId", search.attemptId);
    url.searchParams.set("sayrenToken", search.token);
    url.searchParams.set("sayrenPg", "tosspayments");
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    window.location.replace(url.toString());
  };
  const choices: { label: string; primary?: boolean; params: Record<string, string> }[] = [
    {
      label: m.demo_pay_approve(),
      primary: true,
      params: {
        sayrenResult: "success",
        paymentKey: `demo_${search.attemptId}`,
        amount: String(search.amount),
      },
    },
    {
      label: m.demo_pay_decline(),
      params: { sayrenResult: "fail", code: "CARD_LIMIT", message: "한도 초과" },
    },
    {
      label: m.demo_pay_cancel(),
      params: { sayrenResult: "fail", code: "USER_CANCEL", message: "결제를 취소했습니다" },
    },
  ];
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-surface px-4 py-12">
      <section className="flex w-full max-w-[420px] flex-col gap-4 bg-page px-6 py-8">
        <h1 className="font-black text-xl tracking-[-0.03em]">{m.demo_pay_title()}</h1>
        <p className="text-body text-sub">{m.demo_pay_body()}</p>
        <dl className="flex flex-col gap-2 border-line border-y py-4 text-body">
          {search.method ? (
            <div className="flex justify-between">
              <dt className="text-sub">{m.pay_method()}</dt>
              <dd>{search.method}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-sub">{m.pay_amount()}</dt>
            <dd className="font-bold">{formatMoney(search.amount, search.currency)}</dd>
          </div>
        </dl>
        {choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={() => back(choice.params)}
            className={`h-13 font-bold text-body-lg ${choice.primary ? "bg-ink text-page" : "border border-line-strong"}`}
          >
            {choice.label}
          </button>
        ))}
      </section>
    </main>
  );
}
