import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MySubPage } from "../../../components/my/my-sub-page";
import { ProductImage } from "../../../components/product/product-image";
import { useStore } from "../../../hooks/use-catalog";
import { m } from "../../../i18n";
import { formatFullDateTime } from "../../../lib/date";
import { customerInquiryQuery, myOrdersQuery } from "../../../lib/my";

/**
 * 1:1 문의 상세 — `me.customerInquiries.get`. 관련 주문상품은 주문 목록 응답에서 찾고,
 * 그 상품이 지금 교환·반품을 받으면(`step.claimable`) 주문 상세의 신청 창으로 바로 간다.
 */
export const Route = createFileRoute("/my/support/$inquiryId")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  loader: async ({ context: { queryClient }, params }) => {
    const inquiry = await queryClient.ensureQueryData(customerInquiryQuery(params.inquiryId));
    if (!inquiry) throw notFound();
  },
  head: () => ({ meta: [{ title: m.sd_title() }] }),
  component: SupportDetail,
});

function SupportDetail() {
  const { inquiryId } = Route.useParams();
  const store = useStore();
  const inquiry = useSuspenseQuery(customerInquiryQuery(inquiryId)).data;
  const orders = useQuery({
    ...myOrdersQuery({ size: 50 }),
    enabled: Boolean(inquiry?.orderItemId),
  }).data?.contents;
  if (!inquiry) return null;
  const found = orders
    ?.flatMap((order) => order.items.map((item) => ({ order, item })))
    .find(({ item }) => item.orderItemId === inquiry.orderItemId);
  const claimable = found?.item.step?.claimable.some(
    (c) => c.action === "RETURN_REQUEST" || c.action === "EXCHANGE_REQUEST",
  );
  return (
    <MySubPage
      title={m.sd_title()}
      width="max-w-[908px]"
      heading={false}
      back={{ label: m.sp_title(), to: "/my/support" }}
    >
      <div className="flex flex-col gap-6 px-4 pt-4 md:px-0 md:pt-6">
        <header className="flex flex-col gap-3 border-ink border-b pb-5">
          <p className="flex items-center gap-2 text-meta">
            <span className="border border-ink px-1.5 font-bold">
              {m[`sp_cat_${inquiry.category}`]()}
            </span>
            <b className={inquiry.answered ? "text-ink" : "text-info"}>
              {inquiry.answered ? m.mi_state_answered() : m.mi_state_waiting()}
            </b>
            <span className="text-sub">{formatFullDateTime(inquiry.createdAt)}</span>
          </p>
          <h1 className="font-black text-[22px] tracking-[-0.03em] md:text-[28px]">
            {inquiry.title}
          </h1>
        </header>
        {found ? (
          <div className="flex items-center gap-4 border border-line p-4">
            <div className="w-12 shrink-0">
              <ProductImage
                product={{ name: found.item.productName, thumbnailUrl: found.item.thumbnailUrl }}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-caption text-sub">{m.sd_item()}</span>
              <b className="truncate text-body">{found.item.productName}</b>
              <span className="text-meta text-sub">
                {[found.item.optionName, m.co_qty({ count: found.item.quantity })]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <Link
              to="/my/orders/$orderId"
              params={{ orderId: found.order.orderId }}
              className="flex shrink-0 items-center text-meta text-sub"
            >
              {m.my_order_detail()}
              <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
        ) : null}
        <p className="whitespace-pre-line text-body-lg leading-relaxed">{inquiry.content}</p>
        {inquiry.answer ? (
          <section className="flex flex-col gap-3 bg-surface px-5 py-5 md:px-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-body-lg">{m.sd_answer({ store: store.name })}</h2>
              <span className="text-meta text-sub">
                {formatFullDateTime(inquiry.answer.answeredAt)}
              </span>
            </div>
            <p className="whitespace-pre-line text-body-lg leading-relaxed">
              {inquiry.answer.content}
            </p>
          </section>
        ) : (
          <p className="bg-surface px-5 py-5 text-body text-sub">{m.sd_waiting()}</p>
        )}
        <div className="flex gap-2">
          {found && claimable ? (
            <Link
              to="/my/orders/$orderId"
              params={{ orderId: found.order.orderId }}
              search={{ item: found.item.orderItemId, panel: "claim" }}
              className="grid h-[52px] flex-1 place-items-center bg-ink px-6 font-bold text-body-lg text-page md:flex-none"
            >
              {m.claim_title_claim()}
            </Link>
          ) : null}
          <Link
            to="/my/support"
            className="grid h-[52px] flex-1 place-items-center border border-ink px-6 font-bold text-body-lg md:flex-none"
          >
            {m.sd_list()}
          </Link>
        </div>
      </div>
    </MySubPage>
  );
}
