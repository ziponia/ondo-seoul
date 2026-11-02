import { ChevronLeft, ChevronRight } from "lucide-react";
import { m } from "../../i18n";

/** 페이지 번호 — 지금 페이지 앞뒤 2개씩 */
export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const cell = "grid h-10 w-10 place-items-center font-bold font-display text-[15px]";
  return (
    <nav aria-label={m.list_page()} className="mt-14 flex justify-center gap-1">
      <button
        type="button"
        aria-label={m.list_page_prev()}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={`${cell} disabled:text-disabled`}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      {pages.map((value) => (
        <button
          key={value}
          type="button"
          aria-current={value === page ? "page" : undefined}
          onClick={() => onPage(value)}
          className={`${cell} ${value === page ? "bg-ink text-page" : ""}`}
        >
          {value}
        </button>
      ))}
      <button
        type="button"
        aria-label={m.list_page_next()}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={`${cell} disabled:text-disabled`}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </nav>
  );
}
