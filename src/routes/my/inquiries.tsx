import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MySubPage } from "../../components/my/my-sub-page";
import { ProductImage } from "../../components/product/product-image";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { formatMonthDay } from "../../lib/date";
import { myInquiriesQuery } from "../../lib/my";

/**
 * 내 상품 문의 — `inquiries.listMine` 응답. 답변이 있으면 줄을 눌러 펼친다(처음엔 맨 위 답변을 펼쳐 둔다).
 */
export const Route = createFileRoute("/my/inquiries")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    filter: z.enum(["all", "answered", "waiting"]).optional().catch(undefined),
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(myInquiriesQuery()),
  head: () => ({ meta: [{ title: m.mi_title() }] }),
  component: MyInquiries,
});

function MyInquiries() {
  const { filter = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const store = useStore();
  const inquiries = useSuspenseQuery(myInquiriesQuery()).data.contents;
  const rows = inquiries.filter(
    (i) => filter === "all" || (filter === "answered") === (i.answer !== null),
  );
  const [open, setOpen] = useState<string | null>(
    () => rows.find((i) => i.answer !== null)?.inquiryId ?? null,
  );
  return (
    <MySubPage title={m.mi_title()}>
      <div className="flex gap-1.5 px-4 pt-4 md:px-0 md:pt-0">
        {(["all", "answered", "waiting"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() =>
              navigate({ search: { filter: key === "all" ? undefined : key }, replace: true })
            }
            className={`h-10 rounded-full px-4 font-bold text-body ${
              filter === key ? "bg-ink text-page" : "border border-line-strong"
            }`}
          >
            {m[`mi_filter_${key}`]()}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-24 text-center text-body text-sub">{m.mi_empty()}</p>
      ) : (
        <ul className="mt-5 border-ink md:border-t">
          {rows.map((inquiry) => {
            const expanded = open === inquiry.inquiryId && inquiry.answer !== null;
            return (
              <li key={inquiry.inquiryId} className="border-line border-b px-4 py-5 md:px-0">
                <button
                  type="button"
                  aria-expanded={inquiry.answer ? expanded : undefined}
                  onClick={() => setOpen(expanded ? null : inquiry.inquiryId)}
                  className="flex w-full gap-3.5 text-left"
                >
                  <div className="w-12 shrink-0">
                    <ProductImage
                      product={{
                        name: inquiry.productName ?? "",
                        thumbnailUrl: inquiry.thumbnailUrl,
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex flex-wrap gap-2 text-meta">
                      <b className={inquiry.answer ? "text-ink" : "text-info"}>
                        {inquiry.answer ? m.mi_state_answered() : m.mi_state_waiting()}
                      </b>
                      <span className="text-sub">
                        {m[`mi_cat_${inquiry.category}`]()} · {formatMonthDay(inquiry.createdAt)}
                      </span>
                      {inquiry.secret ? <span className="text-sub">{m.mi_secret()}</span> : null}
                    </p>
                    <p className="text-meta text-sub">{inquiry.productName}</p>
                    <p className="text-body-lg">{inquiry.content}</p>
                  </div>
                </button>
                {expanded && inquiry.answer ? (
                  <div className="mt-4 flex flex-col gap-2 bg-surface px-4 py-3.5 md:ml-[62px]">
                    <b className="text-meta">
                      {m.mi_answer({
                        store: store.name,
                        date: formatMonthDay(inquiry.answer.answeredAt),
                      })}
                    </b>
                    <p className="text-body">{inquiry.answer.content}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </MySubPage>
  );
}
