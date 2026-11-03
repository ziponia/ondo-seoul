import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { z } from "zod";
import { MySubPage } from "../../components/my/my-sub-page";
import { ProductImage } from "../../components/product/product-image";
import { m } from "../../i18n";
import { formatMonthDay } from "../../lib/date";
import { formatMoney } from "../../lib/format";
import { myClaimsQuery, myOrdersQuery, withdrawClaim } from "../../lib/my";

/**
 * 취소·교환·반품 — `myClaims.list` 응답. 사진·옵션·주문은 주문 목록 응답에서 주문상품 id로 찾아 붙인다.
 * 접수 상태만 철회할 수 있다(`myClaims.withdraw`). 거절 사유는 접어 두고 누르면 펼친다.
 */
const FILTERS = {
  all: null,
  progress: ["REQUESTED", "HELD", "COLLECTING", "COLLECTED", "REDELIVERING", "APPROVED"],
  done: ["COMPLETED", "REJECTED"],
  withdrawn: ["WITHDRAWN"],
} as const;

export const Route = createFileRoute("/my/claims")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({
    filter: z.enum(["all", "progress", "done", "withdrawn"]).optional().catch(undefined),
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(myClaimsQuery()),
  head: () => ({ meta: [{ title: m.cl_title() }] }),
  component: Claims,
});

function Claims() {
  const { filter = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const claims = useSuspenseQuery(myClaimsQuery()).data.contents;
  const orders = useQuery(myOrdersQuery({ size: 50 })).data?.contents ?? [];
  const withdraw = useMutation({
    mutationFn: (claimId: string) => withdrawClaim({ data: { claimId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my"] }),
  });
  const wanted = FILTERS[filter];
  const rows = claims.filter((c) => !wanted || (wanted as readonly string[]).includes(c.status));
  const itemOf = (orderItemId: string) => {
    for (const order of orders) {
      const item = order.items.find((i) => i.orderItemId === orderItemId);
      if (item) return { order, item };
    }
    return null;
  };
  return (
    <MySubPage title={m.cl_title()}>
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-4 md:px-0 md:pt-0">
        {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() =>
              navigate({ search: { filter: key === "all" ? undefined : key }, replace: true })
            }
            className={`h-10 shrink-0 rounded-full px-4 font-bold text-body ${
              filter === key ? "bg-ink text-page" : "border border-line-strong"
            }`}
          >
            {m[`cl_filter_${key}`]()}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-24 text-center text-body text-sub">{m.cl_empty()}</p>
      ) : (
        <ul className="mt-5 border-ink md:border-t">
          {rows.map((claim) => {
            const found = itemOf(claim.orderItemId);
            const progress = (FILTERS.progress as readonly string[]).includes(claim.status);
            return (
              <li
                key={claim.claimId}
                className="flex flex-col gap-3 border-line border-b px-4 py-5 md:flex-row md:items-center md:px-0"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="w-[72px] shrink-0">
                    <ProductImage
                      product={{
                        name: claim.productName,
                        thumbnailUrl: found?.item.thumbnailUrl ?? null,
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-2 text-meta">
                      <span className="border border-ink px-1.5 font-bold">
                        {m[`claim_type_${claim.type}`]()}
                      </span>
                      <b className={progress ? "text-info" : "text-muted"}>
                        {m[`cl_status_${claim.status}`]()}
                      </b>
                      <span className="text-sub">
                        {m.cl_requested({ date: formatMonthDay(claim.requestedAt) })}
                      </span>
                    </p>
                    <p className="truncate text-body-lg">{claim.productName}</p>
                    <p className="text-meta text-muted">
                      {m.cl_reason_line({
                        option: found?.item.optionName ? `${found.item.optionName} · ` : "",
                        reason:
                          m[`claim_reason_${claim.reason as "WRONG_ORDER"}`]?.() ?? claim.reason,
                      })}
                    </p>
                    {claim.status === "COMPLETED" && claim.expectedRefundAmount !== null ? (
                      <p className="text-meta text-sub">
                        {[
                          m.cl_refund({ amount: formatMoney(claim.expectedRefundAmount) }),
                          claim.completedAt
                            ? m.cl_completed({ date: formatMonthDay(claim.completedAt) })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {claim.rejectReason ? (
                      <details className="group mt-1 text-meta">
                        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-bold text-point [&::-webkit-details-marker]:hidden">
                          {m.cl_reject_reason()}
                          <ChevronDown
                            size={14}
                            aria-hidden
                            className="transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <p className="mt-2 whitespace-pre-line bg-surface px-3.5 py-3 text-body text-sub">
                          {claim.rejectReason}
                        </p>
                      </details>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2 md:w-[132px] md:flex-col">
                  {found ? (
                    <Link
                      to="/my/orders/$orderId"
                      params={{ orderId: found.order.orderId }}
                      className="grid h-11 flex-1 place-items-center border border-line-strong font-bold text-body md:h-10 md:flex-none md:text-meta"
                    >
                      {m.my_order_detail()}
                    </Link>
                  ) : null}
                  {claim.status === "REQUESTED" ? (
                    <button
                      type="button"
                      disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate(claim.claimId)}
                      className="grid h-11 flex-1 place-items-center border border-ink font-bold text-body md:h-10 md:flex-none md:text-meta"
                    >
                      {m.cl_withdraw()}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </MySubPage>
  );
}
