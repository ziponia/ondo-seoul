import type { ProductDetail, PublicInquiry, ReviewPage } from "@sayren/storefront-sdk";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";
import { ReviewItem, ReviewSummary } from "./review-parts";

/** 상세 아래 탭 — 같은 페이지의 구획으로 이동한다 */
export function ProductTabs({
  reviewCount,
  inquiryCount,
}: {
  reviewCount: number;
  inquiryCount: number;
}) {
  const tabs = [
    { href: "#detail", label: m.pd_tab_detail() },
    { href: "#reviews", label: m.pd_tab_reviews({ count: reviewCount.toLocaleString("ko-KR") }) },
    { href: "#qna", label: m.pd_tab_qna({ count: inquiryCount }) },
    { href: "#shipping", label: m.pd_tab_shipping() },
  ];
  const active = useActiveSection(tabs.map((tab) => tab.href.slice(1)));
  return (
    <nav
      aria-label={m.pd_tabs()}
      className="sticky top-0 z-10 mt-16 grid grid-cols-4 border-line border-b bg-page md:top-0"
    >
      {tabs.map((tab) => {
        const on = (active ?? tabs[0]?.href.slice(1)) === tab.href.slice(1);
        return (
          <a
            key={tab.href}
            href={tab.href}
            aria-current={on ? "location" : undefined}
            className={`-mb-px grid h-12 place-items-center whitespace-nowrap border-b-2 px-1 text-[13px] tracking-[-0.03em] md:h-14 md:text-body-lg md:tracking-normal ${
              on ? "border-ink font-bold text-ink" : "border-transparent text-sub"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

/** 지금 화면 위쪽에 걸린 구획 id — 탭 밑줄이 따라간다 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const sections = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      // 탭 바 바로 아래 띠에 들어온 구획을 고른다
      { rootMargin: "-64px 0px -70% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [key]);
  return active;
}

export function ProductDetailBody({ product }: { product: ProductDetail }) {
  return (
    <>
      <section id="detail" aria-label={m.pd_tab_detail()} className="mx-auto max-w-[860px] pt-10">
        <div
          className="reader text-body-lg leading-[1.8]"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: 서버가 정화한 상세 설명 HTML이다
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
        {product.notice ? (
          <>
            <h2 className="mt-14 mb-4 font-black text-lg">
              {m.pd_notice({ name: product.notice.name })}
            </h2>
            {/* 전역 keep-all이라 긴 어절이 표를 화면 밖으로 밀어낸다 — 고정 레이아웃에서 칸 안에서 끊는다 */}
            <table className="w-full table-fixed border-collapse border-ink border-t text-body [overflow-wrap:anywhere]">
              <tbody>
                {product.notice.fields.map((field) => (
                  <tr key={field.key} className="border-line border-b">
                    <th
                      scope="row"
                      className="w-28 bg-surface px-3 py-3 text-left font-medium md:w-44 md:px-4"
                    >
                      {field.label}
                    </th>
                    <td className="px-3 py-3 md:px-4">{field.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
        {product.certifications ? (
          <>
            <h2 className="mt-10 mb-3 font-black text-lg">{m.pd_certifications()}</h2>
            <ul className="flex flex-col gap-1 text-body">
              {product.certifications.items.map((item) => (
                <li key={`${item.kindLabel}-${item.number}`}>
                  {item.kindLabel} · {item.agency} · {item.number}
                </li>
              ))}
              {product.certifications.exemptions.map((item) => (
                <li key={item.subjectLabel}>
                  {item.subjectLabel} — {item.exemptionLabel}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <section id="shipping" aria-label={m.pd_tab_shipping()} className="mx-auto max-w-[860px]">
        {product.infoSections.map((section) => (
          <div key={section.infoSectionId} className="mt-10">
            <h2 className="mb-3 font-black text-lg">{section.title}</h2>
            <div
              className="reader text-body leading-[1.8]"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: 서버가 정화한 안내 HTML이다
              dangerouslySetInnerHTML={{ __html: section.body }}
            />
          </div>
        ))}
      </section>
    </>
  );
}

/** 리뷰 미리보기 — 요약, 사진 줄, 3개, 전체 보기 */
export function ReviewPreview({
  product,
  reviews,
}: {
  product: ProductDetail;
  reviews: ReviewPage | null;
}) {
  const productNo = String(product.productNo ?? product.productId);
  const photos = (reviews?.contents ?? []).flatMap((review) => review.images).slice(0, 8);
  return (
    <section id="reviews" aria-labelledby="rv-h" className="mx-auto max-w-[860px] pt-20">
      <h2 id="rv-h" className="mb-6 font-black text-[22px] tracking-[-0.03em]">
        {m.rv_title({ count: product.reviewCount.toLocaleString("ko-KR") })}
      </h2>
      {reviews && reviews.contents.length > 0 ? (
        <>
          {reviews.summary ? <ReviewSummary summary={reviews.summary} /> : null}
          {photos.length > 0 ? (
            <div className="mt-5 mb-2 grid grid-cols-4 gap-1.5 md:grid-cols-8">
              {photos.map((src, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 같은 사진 주소가 반복될 수 있다
                <img key={i} src={src} alt="" className="aspect-square w-full object-cover" />
              ))}
            </div>
          ) : null}
          {reviews.contents.slice(0, 3).map((review) => (
            <ReviewItem key={review.reviewId} review={review} />
          ))}
          <Link
            to="/p/$productNo/reviews"
            params={{ productNo }}
            className="mt-5 grid h-13 place-items-center border border-ink font-bold text-body-lg"
          >
            {m.rv_all({ count: product.reviewCount.toLocaleString("ko-KR") })}
          </Link>
        </>
      ) : (
        <p className="py-12 text-center text-muted">{m.rv_empty()}</p>
      )}
    </section>
  );
}

/** 상품 문의 미리보기 */
export function QnaPreview({
  product,
  inquiries,
  total,
}: {
  product: ProductDetail;
  inquiries: PublicInquiry[];
  total: number;
}) {
  const productNo = String(product.productNo ?? product.productId);
  return (
    <section id="qna" aria-labelledby="qa-h" className="mx-auto max-w-[860px] pt-16">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="qa-h" className="font-black text-[22px] tracking-[-0.03em]">
          {m.qna_title({ count: total })}
        </h2>
        <Link
          to="/p/$productNo/qna"
          params={{ productNo }}
          search={{ write: true }}
          className="grid h-10 place-items-center border border-ink px-4 font-bold text-meta"
        >
          {m.qna_write()}
        </Link>
      </div>
      {inquiries.length === 0 ? (
        <p className="py-10 text-center text-muted">{m.qna_empty()}</p>
      ) : (
        <ul className="border-ink border-t text-body">
          {inquiries.slice(0, 5).map((inquiry) => (
            <li key={inquiry.inquiryId} className="flex gap-4 border-line border-b py-4">
              <span className={`w-16 shrink-0 font-bold ${inquiry.answer ? "" : "text-muted"}`}>
                {inquiry.answer ? m.qna_answered() : m.qna_waiting()}
              </span>
              <span className={`min-w-0 flex-1 ${inquiry.content === null ? "text-muted" : ""}`}>
                {inquiry.content ?? m.qna_secret()}
              </span>
              <span className="shrink-0 text-muted">{formatDate(inquiry.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
