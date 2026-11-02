import { type ProductInquiryCategory, productInquiryCategorySchema } from "@sayren/storefront-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { m } from "../../i18n";
import { createInquiry } from "../../lib/product-queries";

const LIMIT = 1000;

const LABELS: Record<ProductInquiryCategory, () => string> = {
  PRODUCT: m.qna_cat_PRODUCT,
  DELIVERY: m.qna_cat_DELIVERY,
  RETURN: m.qna_cat_RETURN,
  EXCHANGE: m.qna_cat_EXCHANGE,
  ETC: m.qna_cat_ETC,
};

/**
 * 상품 문의 쓰기 — 데스크톱은 가운데 대화상자, 모바일은 바텀시트. 유형·내용(최대 1,000자)·비밀글.
 * 문의는 로그인한 회원만 쓴다(SDK `catalog.createInquiry`). 제목은 없다.
 */
export function InquiryForm({
  productId,
  productName,
  thumbnail,
  redirect,
  onClose,
}: {
  productId: string;
  productName: string;
  thumbnail: React.ReactNode;
  redirect: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ProductInquiryCategory>("PRODUCT");
  const [content, setContent] = useState("");
  const [secret, setSecret] = useState(false);
  const submit = useMutation({
    mutationFn: () => createInquiry({ data: { productId, category, content, secret } }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries({
        queryKey: ["catalog", "product", productId, "inquiries"],
      });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 md:items-center md:p-6">
      <button
        type="button"
        aria-label={m.qna_close()}
        onClick={onClose}
        className="absolute inset-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="qf-h"
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto bg-page md:max-w-[560px]"
      >
        <div className="flex items-center justify-between border-line border-b px-5 py-4 md:px-6">
          <h2 id="qf-h" className="font-black text-lg tracking-[-0.03em] md:text-xl">
            {m.qna_form_title()}
          </h2>
          <button
            type="button"
            aria-label={m.qna_close()}
            onClick={onClose}
            className="-mr-2.5 grid h-11 w-11 place-items-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (content.trim()) submit.mutate();
          }}
          className="flex flex-col gap-5 p-5 md:p-6"
        >
          <div className="flex items-center gap-3.5">
            <span className="w-14 shrink-0">{thumbnail}</span>
            <span className="font-bold text-body">{productName}</span>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 font-bold text-body">{m.qna_category()}</legend>
            <div className="flex flex-wrap gap-2">
              {productInquiryCategorySchema.options.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={`h-10 px-4 font-bold text-body ${
                    category === value ? "bg-ink text-page" : "border border-line-strong"
                  }`}
                >
                  {LABELS[value]()}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 font-bold text-body">
            {m.qna_content()}
            <textarea
              rows={7}
              value={content}
              maxLength={LIMIT}
              onChange={(event) => setContent(event.target.value)}
              className="resize-y border border-line-strong p-3 font-normal text-body leading-[1.6]"
            />
            <span className="text-right font-normal text-caption text-sub">
              {content.length.toLocaleString("ko-KR")} / {LIMIT.toLocaleString("ko-KR")}
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-body">
            <input
              type="checkbox"
              checked={secret}
              onChange={() => setSecret(!secret)}
              className="h-[18px] w-[18px] accent-ink"
            />
            {m.qna_secret_label()}
            <span className="text-caption text-muted">{m.qna_secret_hint()}</span>
          </label>
          {submit.data?.loginRequired ? (
            <p
              role="alert"
              className="flex items-center justify-between bg-surface px-4 py-3 text-body"
            >
              {m.qna_login_needed()}
              <Link
                to="/login"
                search={{ redirect }}
                className="font-bold underline underline-offset-4"
              >
                {m.qna_go_login()}
              </Link>
            </p>
          ) : null}
          {submit.isError ? (
            <p role="alert" className="text-meta text-point">
              {m.qna_failed()}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-13 border border-ink font-bold text-body-lg"
            >
              {m.qna_cancel()}
            </button>
            <button
              type="submit"
              disabled={!content.trim() || submit.isPending}
              className="h-13 bg-ink font-bold text-body-lg text-page disabled:bg-disabled"
            >
              {m.qna_submit()}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
