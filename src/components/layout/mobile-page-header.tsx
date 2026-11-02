import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Home, Search, ShoppingBag } from "lucide-react";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { MarketSelect } from "./market-select";

/**
 * 모바일 하위 화면 상단 바(md 미만) — 뒤로, 화면 제목, 검색·장바구니. 이 바를 쓰는 라우트는
 * `staticData: { mobileHeader: "page" }`로 루트의 로고 헤더를 모바일에서 숨긴다.
 */
export function MobilePageHeader({
  title,
  icons = true,
  center = false,
  back = true,
  home = false,
}: {
  title: string;
  icons?: boolean;
  /** 탭 화면(기획전·찜·마이)은 뒤로 버튼이 없다 */
  back?: boolean;
  /** 검색 대신 홈 아이콘(상품 상세) */
  home?: boolean;
  /** 제목 가운데 정렬(장바구니·주문서처럼 아이콘 없는 화면) */
  center?: boolean;
}) {
  const router = useRouter();
  const store = useStore();
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-1 border-line border-b bg-page px-2 md:hidden">
      {back ? (
        <button
          type="button"
          aria-label={m.search_back()}
          onClick={() => router.history.back()}
          className="grid h-11 w-11 shrink-0 place-items-center"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
      ) : null}
      <h1
        className={`min-w-0 flex-1 truncate ${back ? "font-bold text-[17px]" : "pl-2 font-black text-xl tracking-[-0.03em]"} ${center ? "text-center" : ""}`}
      >
        {title}
      </h1>
      {icons ? (
        <>
          <MarketSelect compact />
          {home ? (
            <Link to="/" aria-label={m.nav_home()} className="grid h-11 w-11 place-items-center">
              <Home size={22} strokeWidth={1.8} aria-hidden />
            </Link>
          ) : (
            <Link
              to="/search"
              aria-label={m.nav_search()}
              className="grid h-11 w-11 place-items-center"
            >
              <Search size={22} aria-hidden />
            </Link>
          )}
          {store.checkoutAvailable ? (
            <Link
              to="/cart"
              aria-label={m.nav_cart()}
              className="grid h-11 w-11 place-items-center"
            >
              <ShoppingBag size={22} strokeWidth={1.8} aria-hidden />
            </Link>
          ) : null}
        </>
      ) : (
        <span className="w-11" />
      )}
    </div>
  );
}
