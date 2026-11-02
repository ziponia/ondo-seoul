import {
  type CustomerInquiryCategory,
  createCustomerInquiryRequestSchema,
} from "@sayren/storefront-sdk";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MySubPage } from "../../../components/my/my-sub-page";
import { useStore } from "../../../hooks/use-catalog";
import { m } from "../../../i18n";
import { formatMonthDay } from "../../../lib/date";
import { createCustomerInquiry, customerInquiriesQuery, myOrdersQuery } from "../../../lib/my";

/**
 * 1:1 문의 — 작성(`me.customerInquiries.create`, 관련 주문상품은 주문 목록 응답에서 고른다)과 내 문의 목록.
 * 입력 규칙은 SDK `createCustomerInquiryRequestSchema`로 검사한다.
 */
export const Route = createFileRoute("/my/support/")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(customerInquiriesQuery()),
  head: () => ({ meta: [{ title: m.sp_title() }] }),
  component: Support,
});

const CATEGORIES: CustomerInquiryCategory[] = ["DELIVERY", "RETURN", "EXCHANGE", "PAYMENT", "ETC"];
const field = "w-full border border-line-strong bg-page px-3.5 font-normal text-body-lg";

function Support() {
  const queryClient = useQueryClient();
  const store = useStore();
  const inquiries = useSuspenseQuery(customerInquiriesQuery()).data.contents;
  const orders = useQuery(myOrdersQuery({ size: 20 })).data?.contents ?? [];
  const [category, setCategory] = useState<CustomerInquiryCategory>("DELIVERY");
  const [orderItemId, setOrderItemId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  /** 모바일 — 내 문의와 문의하기를 탭으로 나눈다(데스크톱은 두 단에 함께) */
  const [tab, setTab] = useState<"list" | "write">("list");
  const [open, setOpen] = useState<string | null>(
    () => inquiries.find((i) => i.answer)?.inquiryId ?? null,
  );
  const input = {
    category,
    title: title.trim(),
    content: content.trim(),
    ...(orderItemId ? { orderItemId } : {}),
  };
  const parsed = createCustomerInquiryRequestSchema.safeParse(input);
  const submit = useMutation({
    mutationFn: () => createCustomerInquiry({ data: input }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      setTitle("");
      setContent("");
      setOrderItemId("");
      setTab("list");
      await queryClient.invalidateQueries({ queryKey: ["my", "support"] });
    },
  });
  const items = orders.flatMap((order) =>
    order.items.filter((i) => i.status !== "CANCELED").map((item) => ({ order, item })),
  );
  const waiting = inquiries.filter((i) => !i.answered).length;
  return (
    <MySubPage title={m.sp_title()} width="max-w-[1100px]" heading={false}>
      <div role="tablist" className="grid grid-cols-2 border-line border-b md:hidden">
        {(["list", "write"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px h-12 border-b-2 font-bold text-body-lg ${
              tab === key ? "border-ink" : "border-transparent text-muted"
            }`}
          >
            {key === "list" ? m.sp_tab_list() : m.sp_tab_write()}
          </button>
        ))}
      </div>
      <div className="grid gap-2 md:mt-2 md:grid-cols-2 md:gap-12">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (parsed.success) submit.mutate();
          }}
          className={`flex-col gap-5 px-4 pt-4 pb-6 md:flex md:px-0 md:pt-0 md:pb-0 ${tab === "write" ? "flex" : "hidden"}`}
        >
          <h1 className="hidden font-black text-[32px] tracking-[-0.04em] md:block">
            {m.sp_title()}
          </h1>
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 font-bold text-body">{m.sp_category()}</legend>
            <div className="grid grid-cols-5 gap-1.5 md:flex">
              {CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={`h-10 font-bold text-body md:w-[60px] ${
                    category === value ? "bg-ink text-page" : "border border-line-strong"
                  }`}
                >
                  {m[`sp_cat_${value}`]()}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-2.5 font-bold text-body">
            {m.sp_item()}
            <select
              value={orderItemId}
              onChange={(event) => setOrderItemId(event.target.value)}
              className={`h-[46px] ${field}`}
            >
              <option value="">{m.sp_item_none()}</option>
              {items.map(({ order, item }) => (
                <option key={item.orderItemId} value={item.orderItemId}>
                  {m.sp_item_option({
                    name: item.productName,
                    option: item.optionName ? ` · ${item.optionName}` : "",
                    date: formatMonthDay(order.orderedAt),
                  })}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2.5 font-bold text-body">
            {m.sp_subject()}
            <input
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              className={`h-12 ${field}`}
            />
          </label>
          <label className="flex flex-col gap-2.5 font-bold text-body">
            {m.sp_content()}
            <textarea
              value={content}
              rows={6}
              maxLength={2000}
              onChange={(event) => setContent(event.target.value)}
              className={`py-3 ${field}`}
            />
          </label>
          {submit.data ? (
            <p
              role={submit.data.ok ? "status" : "alert"}
              className={`text-meta ${submit.data.ok ? "text-sub" : "text-point"}`}
            >
              {submit.data.ok ? m.sp_done() : submit.data.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!parsed.success || submit.isPending}
            className="h-[54px] bg-ink font-bold text-base text-page disabled:bg-disabled"
          >
            {m.sp_submit()}
          </button>
        </form>

        <section
          className={`px-4 py-4 md:block md:p-0 md:pt-2 ${tab === "list" ? "block" : "hidden"}`}
        >
          <div className="flex items-baseline justify-between border-ink pb-4 md:border-b">
            <h2 className="text-body text-sub md:font-black md:text-ink md:text-xl md:tracking-[-0.03em]">
              {m.sp_mine({ count: inquiries.length })}
            </h2>
            {waiting ? (
              <span className="text-meta text-sub">{m.sp_waiting({ count: waiting })}</span>
            ) : null}
          </div>
          {inquiries.length === 0 ? (
            <p className="py-16 text-center text-body text-sub">{m.sp_empty()}</p>
          ) : (
            <ul>
              {inquiries.map((inquiry) => {
                const expanded = open === inquiry.inquiryId;
                return (
                  <li key={inquiry.inquiryId} className="border-line border-b py-4">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : inquiry.inquiryId)}
                      className="flex w-full flex-col gap-1.5 text-left"
                    >
                      <span className="flex gap-2 text-meta">
                        <b className={inquiry.answered ? "text-ink" : "text-info"}>
                          {inquiry.answered ? m.mi_state_answered() : m.mi_state_waiting()}
                        </b>
                        <span className="text-sub">
                          {m[`sp_cat_${inquiry.category}`]()} · {formatMonthDay(inquiry.createdAt)}
                        </span>
                      </span>
                      <span className="font-bold text-body-lg">{inquiry.title}</span>
                    </button>
                    {expanded ? (
                      <div className="mt-3 flex flex-col gap-3">
                        <p className="whitespace-pre-line text-body text-sub">{inquiry.content}</p>
                        <Link
                          to="/my/support/$inquiryId"
                          params={{ inquiryId: inquiry.inquiryId }}
                          className="self-start font-bold text-body underline underline-offset-4"
                        >
                          {m.sp_detail()}
                        </Link>
                        {inquiry.answer ? (
                          <div className="flex flex-col gap-2 bg-surface px-4 py-3.5">
                            <b className="text-meta">
                              {m.mi_answer({
                                store: store.name,
                                date: formatMonthDay(inquiry.answer.answeredAt),
                              })}
                            </b>
                            <p className="whitespace-pre-line text-body">
                              {inquiry.answer.content}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </MySubPage>
  );
}
