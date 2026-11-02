import type { MyCoupon } from "@sayren/storefront-sdk";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { couponAmount, couponCondition, couponKind } from "../../components/coupon/coupon-text";
import { MySubPage } from "../../components/my/my-sub-page";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";
import { myCouponsQuery, registerCoupon } from "../../lib/my";

/**
 * 내 쿠폰 — `me.coupons`의 사용 가능·사용 완료·기간 만료. 쿠폰 번호 등록(`me.registerCoupon`)은 대화상자다.
 */
export const Route = createFileRoute("/my/coupons")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    tab: z.enum(["available", "used", "expired"]).optional().catch(undefined),
    register: z.boolean().optional().catch(undefined),
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(myCouponsQuery()),
  head: () => ({ meta: [{ title: m.mc_title() }] }),
  component: MyCoupons,
});

/** 내 쿠폰을 쿠폰 문구 도우미가 읽는 모양으로 — 기간은 이 쿠폰의 유효 기한이다 */
const view = (coupon: MyCoupon) => ({
  ...coupon,
  endsAt: coupon.validUntil,
  validDaysAfterIssue: null,
});

function MyCoupons() {
  const { tab = "available", register = false } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const coupons = useSuspenseQuery(myCouponsQuery()).data;
  const rows = coupons[tab];
  const tabs = [
    { key: "available" as const, label: m.mc_tab_available({ count: coupons.available.length }) },
    { key: "used" as const, label: m.mc_tab_used() },
    { key: "expired" as const, label: m.mc_tab_expired() },
  ];
  return (
    <MySubPage title={m.mc_title()}>
      <div className="flex gap-2 px-4 pt-4 md:justify-end md:px-0 md:pt-0">
        <button
          type="button"
          onClick={() => navigate({ search: { tab, register: true }, replace: true })}
          className="h-11 flex-1 border border-ink font-bold text-body md:flex-none md:px-5"
        >
          {m.mc_register()}
        </button>
        <Link
          to="/coupons"
          className="grid h-11 flex-1 place-items-center bg-ink font-bold text-body text-page md:flex-none md:px-5"
        >
          {m.mc_zone()}
        </Link>
      </div>
      <div role="tablist" className="mt-5 grid grid-cols-3 border-line border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => navigate({ search: { tab: t.key }, replace: true })}
            className={`-mb-px h-12 border-b-2 font-bold text-body-lg ${
              tab === t.key ? "border-ink" : "border-transparent text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-24 text-center text-body text-sub">{m.mc_empty()}</p>
      ) : (
        <ul className="grid gap-3 px-4 pt-5 md:grid-cols-2 md:px-0">
          {rows.map((coupon) => (
            <li
              key={coupon.issueId}
              className={`flex flex-col gap-1 border border-ink px-5 py-4 ${tab === "available" ? "" : "opacity-55"}`}
            >
              <span className="self-start border border-ink px-1.5 font-bold text-caption">
                {couponKind(coupon)}
              </span>
              <span className="font-display font-extrabold text-[26px] text-point leading-tight tracking-[-0.03em]">
                {couponAmount(view(coupon))}
              </span>
              <span className="font-bold text-body-lg">{coupon.name}</span>
              <span className="text-meta text-sub">{couponCondition(view(coupon))}</span>
              <span className="text-caption text-muted">
                {tab === "used"
                  ? m.mc_used()
                  : coupon.validUntil
                    ? `${m.mc_until({ date: formatDate(coupon.validUntil) })}${tab === "expired" ? ` · ${m.mc_expired()}` : ""}`
                    : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {register ? (
        <RegisterDialog onClose={() => navigate({ search: { tab }, replace: true })} />
      ) : null}
    </MySubPage>
  );
}

function RegisterDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const submit = useMutation({
    mutationFn: () => registerCoupon({ data: { code: code.trim() } }),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: ["my"] });
    },
  });
  const done = submit.data?.ok ? submit.data.data : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 md:items-center md:p-6">
      <button
        type="button"
        aria-label={m.cr_close()}
        onClick={onClose}
        className="absolute inset-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-h"
        className="relative w-full bg-page md:max-w-[480px]"
      >
        <div className="flex items-center justify-between border-line border-b px-6 py-5">
          <h2 id="cr-h" className="font-black text-xl tracking-[-0.03em]">
            {m.cr_title()}
          </h2>
          <button
            type="button"
            aria-label={m.cr_close()}
            onClick={onClose}
            className="-mr-2.5 grid h-11 w-11 place-items-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) submit.mutate();
          }}
          className="flex flex-col gap-3 px-6 pt-6 pb-7"
        >
          <label htmlFor="coupon-code" className="font-bold text-body">
            {m.cr_code()}
          </label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              value={code}
              maxLength={40}
              autoComplete="off"
              onChange={(event) => setCode(event.target.value)}
              className="h-[52px] min-w-0 flex-1 border border-ink px-3.5 font-bold font-display text-lg uppercase tracking-[0.02em]"
            />
            <button
              type="submit"
              disabled={!code.trim() || submit.isPending}
              className="h-[52px] w-[72px] shrink-0 bg-ink font-bold text-body-lg text-page disabled:bg-disabled"
            >
              {m.cr_submit()}
            </button>
          </div>
          {submit.data && !submit.data.ok ? (
            <p role="alert" className="text-meta text-point">
              {submit.data.message}
            </p>
          ) : null}
          {done ? (
            <div role="status" className="mt-2 flex flex-col gap-1 bg-surface px-4 py-3.5">
              <span className="text-meta text-sub">{m.cr_done()}</span>
              <span className="font-display font-extrabold text-[22px] text-point">
                {couponAmount(view(done))}
              </span>
              <b className="text-body-lg">{done.name}</b>
              <span className="text-meta text-sub">
                {[
                  couponCondition(view(done)),
                  done.validUntil ? m.mc_until({ date: formatDate(done.validUntil) }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 self-start font-bold text-body underline underline-offset-4"
              >
                {m.cr_view()}
              </button>
            </div>
          ) : null}
          <p className="mt-3 text-meta text-sub">{m.cr_hint()}</p>
        </form>
      </section>
    </div>
  );
}
