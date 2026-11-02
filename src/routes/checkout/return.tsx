import { paymentOptionKey } from "@sayren/storefront-sdk";
import { type PaymentResult, paymentResultOf } from "@sayren/storefront-sdk/payments";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MobileLogoBar } from "../../components/layout/mobile-logo-bar";
import { MobilePageHeader } from "../../components/layout/mobile-page-header";
import { m } from "../../i18n";
import { checkoutPageQuery, getPublicConfig, returnUrlFor } from "../../lib/checkout";
import { formatMoney } from "../../lib/format";
import { type PayNote, readPayNote, savePayNote } from "../../lib/pay-note";
import { paymentsFor } from "../../lib/payments";

/**
 * 결제 복귀 — 결제창이 돌려보내는 곳이다. `payments.result()`가 승인(또는 실패 보고)을 끝내고 결제 상태로 결과를 만든다.
 * 같은 주소를 다시 열어도 승인은 한 번이다(서버 멱등). 확인 중이면 상태를 다시 보고, 완료면 주문 완료 화면으로,
 * 실패·취소면 같은 결제로 다시 결제(`payments.retry`)하거나 주문서로 돌아간다.
 */
export const Route = createFileRoute("/checkout/return")({
  staticData: { mobileHeader: "page", hideTabBar: true, checkoutStep: 2 },
  validateSearch: z.object({
    checkoutId: z.string().optional().catch(undefined),
    sayrenPaymentId: z.string().optional().catch(undefined),
  }),
  loader: () => getPublicConfig(),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  ssr: false,
  component: PaymentReturn,
});

const POLL_MS = 2000;
const POLL_TIMES = 15;

function PaymentReturn() {
  const config = Route.useLoaderData();
  const { checkoutId, sayrenPaymentId } = Route.useSearch();
  const navigate = useNavigate();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const note = readPayNote(sayrenPaymentId ?? null);

  useEffect(() => {
    let stopped = false;
    const payments = paymentsFor(config);
    const settle = async () => {
      let current = await payments.result();
      for (let i = 0; current.status === "PROCESSING" && i < POLL_TIMES && !stopped; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        current = paymentResultOf(await payments.getStatus(current.paymentId));
      }
      if (stopped) return;
      if (current.status === "COMPLETED") {
        await navigate({
          to: "/checkout/complete/$orderId",
          params: { orderId: current.orderId },
          replace: true,
        });
        return;
      }
      setResult(current);
    };
    settle().catch((error) => {
      if (!stopped) setResult({ status: "INVALID", message: String(error) });
    });
    return () => {
      stopped = true;
    };
  }, [config, navigate]);

  if (!result || result.status === "PROCESSING" || result.status === "COMPLETED") {
    return <Processing note={note} />;
  }
  return <PayFail result={result} checkoutId={checkoutId ?? null} note={note} />;
}

function Processing({ note }: { note: PayNote | null }) {
  return (
    <>
      <MobileLogoBar />
      <main className="flex min-h-[70vh] items-center justify-center px-6 py-16 md:min-h-[calc(100vh-73px)]">
        <div role="status" className="flex w-full max-w-[440px] flex-col items-center text-center">
          <div aria-hidden className="mb-8 h-[3px] w-full overflow-hidden bg-line">
            <div className="h-full w-1/3 animate-[progress_1.4s_ease-in-out_infinite] bg-ink motion-reduce:animate-none" />
          </div>
          <h1 className="font-black text-[24px] tracking-[-0.04em] md:text-[28px]">
            {m.pay_checking_title()}
          </h1>
          <p className="mt-3 text-body text-sub leading-relaxed">
            {m.pay_checking_body()}
            <br />
            {m.pay_checking_hold()}
          </p>
          {note ? (
            <dl className="mt-8 w-full border-sub border-t text-body">
              {note.label ? (
                <div className="flex justify-between border-line border-b py-3.5">
                  <dt className="text-sub">{m.pay_method()}</dt>
                  <dd>{note.label}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-line border-b py-3.5">
                <dt className="text-sub">{m.pay_amount()}</dt>
                <dd className="font-bold">{formatMoney(note.amount, note.currency)}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </main>
    </>
  );
}

function failText(result: Exclude<PaymentResult, { status: "COMPLETED" | "PROCESSING" }>) {
  if (result.status === "CANCELED") return m.pay_fail_canceled();
  if (result.status === "INVALID") return m.pay_fail_invalid();
  if (result.code === "EXPIRED") return m.pay_fail_expired();
  return m.pay_fail_declined();
}

function PayFail({
  result,
  checkoutId,
  note,
}: {
  result: Exclude<PaymentResult, { status: "COMPLETED" | "PROCESSING" }>;
  checkoutId: string | null;
  note: PayNote | null;
}) {
  const config = Route.useLoaderData();
  // 다시 결제할 수단은 주문서 응답의 결제수단이다(주문서가 없으면 다시 결제 영역을 그리지 않는다)
  const page = useQuery({
    ...checkoutPageQuery(checkoutId ?? ""),
    enabled: Boolean(checkoutId),
  }).data;
  const checkout = page?.kind === "ok" ? page.checkout : null;
  const options = checkout?.paymentOptions ?? [];
  const [optionKey, setOptionKey] = useState<string | null>(null);
  const chosen = options.find((o) => paymentOptionKey(o) === optionKey) ?? options[0];
  const paymentId = result.status === "INVALID" ? null : result.paymentId;
  const retry = useMutation({
    mutationFn: async () => {
      if (!paymentId || !chosen || !checkoutId) return;
      savePayNote(paymentId, {
        label: chosen.label,
        amount: note?.amount ?? 0,
        currency: note?.currency,
      });
      const { label: _l, pgName: _p, ...option } = chosen;
      await paymentsFor(config).retry(paymentId, {
        option,
        returnUrl: returnUrlFor(window.location.origin, checkoutId),
      });
    },
  });
  const reason =
    result.status === "INVALID"
      ? null
      : result.code && result.message
        ? m.pay_fail_code({ message: result.message, code: result.code })
        : result.message;
  return (
    <>
      <MobilePageHeader title={m.pay_fail_page()} icons={false} center />
      <main className="bg-surface pb-28 md:px-4 md:py-14">
        <div className="mx-auto flex max-w-[640px] flex-col gap-2 md:gap-4">
          <section
            role="alert"
            className="flex flex-col items-center bg-page px-6 py-10 text-center md:py-11"
          >
            <span
              aria-hidden
              className="grid h-16 w-16 place-items-center rounded-full border-2 border-point font-display font-extrabold text-3xl text-point"
            >
              !
            </span>
            <h1 className="mt-5 font-black text-[24px] tracking-[-0.04em] md:text-[28px]">
              {m.pay_fail_title()}
            </h1>
            <p className="mt-3 text-body text-sub leading-relaxed">
              {failText(result)}
              <br />
              {m.pay_fail_no_order()}
            </p>
            {reason ? (
              <p className="mt-4 bg-surface px-4 py-2.5 text-meta">
                <b className="mr-2">{m.pay_fail_reason()}</b>
                <span className="text-sub">{reason}</span>
              </p>
            ) : null}
          </section>
          <section className="flex flex-col gap-4 bg-page px-5 py-7 md:px-8">
            {paymentId && options.length > 0 ? (
              <>
                <h2 className="font-black text-lg tracking-[-0.03em] md:text-xl">
                  {m.pay_retry_title()}
                </h2>
                {note ? (
                  <div className="flex items-center justify-between">
                    <span className="text-body text-sub">{m.pay_retry_amount()}</span>
                    <b className="font-black text-[24px] tracking-[-0.03em]">
                      {formatMoney(note.amount, note.currency)}
                    </b>
                  </div>
                ) : null}
                <p className="text-meta text-sub">{m.pay_retry_keep()}</p>
                <div className="grid grid-cols-2 gap-2">
                  {options.map((option) => {
                    const key = paymentOptionKey(option);
                    const selected = chosen && key === paymentOptionKey(chosen);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setOptionKey(key)}
                        className={`flex h-[52px] items-center gap-2.5 px-4 font-bold text-body ${
                          selected ? "border-2 border-ink" : "border border-line-strong"
                        }`}
                      >
                        {option.method === "CARD" ? (
                          <CreditCard size={20} strokeWidth={1.6} aria-hidden />
                        ) : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {retry.isError ? (
                  <p role="alert" className="text-meta text-point">
                    {m.pay_retry_failed()}
                  </p>
                ) : null}
                <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:border-0 md:p-0">
                  <button
                    type="button"
                    disabled={retry.isPending || !chosen}
                    onClick={() => retry.mutate()}
                    className="h-14 w-full bg-ink font-bold text-base text-page disabled:bg-disabled"
                  >
                    {note
                      ? m.pay_retry_cta({ amount: formatMoney(note.amount, note.currency) })
                      : m.pay_retry_title()}
                  </button>
                </div>
              </>
            ) : null}
            {checkoutId && checkout ? (
              <Link
                to="/checkout/$checkoutId"
                params={{ checkoutId }}
                className="self-center text-meta underline underline-offset-4"
              >
                {m.pay_back_checkout()}
              </Link>
            ) : (
              <Link to="/cart" className="self-center text-meta underline underline-offset-4">
                {m.co_back_cart()}
              </Link>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
