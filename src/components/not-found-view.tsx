import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { m } from "../i18n";

/** 404 — 없는 상품·기획전·주소. 검색으로 다시 찾게 한다 */
export function NotFoundView() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 pt-28 pb-32 text-center">
      <span className="font-display font-extrabold text-[120px] leading-none tracking-[-0.06em]">
        404
      </span>
      <h1 className="font-black text-[26px] tracking-[-0.04em]">{m.root_not_found_title()}</h1>
      <p className="text-body-lg text-sub">{m.not_found_body()}</p>
      <form
        className="mt-3 w-full max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          const keyword = new FormData(event.currentTarget).get("q")?.toString().trim();
          navigate({ to: "/search", search: keyword ? { q: keyword } : {} });
        }}
      >
        <label className="flex h-13 items-center gap-2.5 border-ink border-b-2">
          <span className="sr-only">{m.search_label()}</span>
          <input
            name="q"
            type="search"
            placeholder={m.search_label()}
            className="w-full border-0 bg-transparent text-base outline-none"
          />
          <button
            type="submit"
            aria-label={m.nav_search()}
            className="grid h-11 w-11 place-items-center"
          >
            <Search size={20} aria-hidden />
          </button>
        </label>
      </form>
      <div className="mt-4 flex gap-2">
        <Link
          to="/"
          className="grid h-13 place-items-center bg-ink px-7 font-bold text-[15px] text-page"
        >
          {m.root_go_home()}
        </Link>
        <Link
          to="/search"
          className="grid h-13 place-items-center border border-ink px-7 font-bold text-[15px]"
        >
          {m.not_found_all_products()}
        </Link>
      </div>
    </main>
  );
}
