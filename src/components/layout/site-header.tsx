import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useCategories, useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { logout, meQuery } from "../../lib/account";
import { Logo } from "./logo";
import { MarketSelect } from "./market-select";

/** 데스크톱 헤더(md 이상) + 모바일 상단 바. 카테고리·상점 이름은 응답 값이다 */
export function SiteHeader() {
  const store = useStore();
  const categories = useCategories();
  const canOrder = store.checkoutAvailable;
  const me = useSuspenseQuery(meQuery()).data;
  const multiMarket = store.markets.length > 1;
  return (
    <header className="border-line border-b bg-page">
      <div className="mx-auto flex min-h-14 max-w-page items-center gap-x-8 gap-y-3 px-4 md:min-h-[72px] md:px-6">
        <Logo name={store.name} logoUrl={store.logoUrl} />
        <nav
          aria-label={m.nav_main()}
          className="hidden min-w-0 flex-1 gap-x-[22px] overflow-x-auto whitespace-nowrap font-bold text-[15px] md:flex"
        >
          {categories.map((category) => (
            <Link
              key={category.categoryId}
              to="/c/$categoryId"
              params={{ categoryId: category.categoryId }}
              className="hover:text-sub"
              activeProps={{ className: "text-point" }}
            >
              {category.name}
            </Link>
          ))}
          <Link
            to="/collections"
            className="hover:text-sub"
            activeProps={{ className: "text-point" }}
          >
            {m.nav_collections()}
          </Link>
          {/* 쿠폰을 쓰지 않는 판매 권역(해외)에서는 쿠폰존을 보이지 않는다 */}
          {store.market?.couponsEnabled !== false ? (
            <Link
              to="/coupons"
              className="hover:text-sub"
              activeProps={{ className: "text-point" }}
            >
              {m.nav_coupons()}
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <MarketSelect />
          {/* 판매 권역이 여럿이면 국가 고르기 자리를 위해 데스크톱 검색은 아이콘이다 */}
          {multiMarket ? null : <HeaderSearch />}
          <span className={multiMarket ? undefined : "md:hidden"}>
            <IconLink to="/search" label={m.nav_search()}>
              <Search size={22} strokeWidth={2} aria-hidden />
            </IconLink>
          </span>
          <span className="hidden md:inline-flex">
            <IconLink to="/my/wishlist" label={m.nav_wishlist()}>
              <Heart size={22} strokeWidth={1.8} aria-hidden />
            </IconLink>
          </span>
          {canOrder ? (
            <IconLink to="/cart" label={m.nav_cart()}>
              <ShoppingBag size={22} strokeWidth={1.8} aria-hidden />
            </IconLink>
          ) : null}
          {me ? (
            <LogoutButton />
          ) : (
            <Link
              to="/login"
              className="hidden h-11 items-center px-2 font-medium text-meta hover:text-sub md:inline-flex"
            >
              {m.nav_login()}
            </Link>
          )}
          <Link
            to="/my"
            className="hidden h-11 items-center px-2 font-medium text-meta hover:text-sub md:inline-flex"
          >
            {m.nav_mypage()}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** 데스크톱 검색창 — 입력하면 검색 결과로 간다 */
function HeaderSearch() {
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        navigate({ to: "/search", search: q ? { q } : {} });
      }}
      className="mr-2 hidden h-10 w-60 items-center rounded-full bg-chip pr-1 pl-4 lg:flex"
    >
      <label className="flex-1">
        <span className="sr-only">{m.search_label()}</span>
        <input
          name="q"
          type="search"
          placeholder={m.search_placeholder()}
          className="w-full bg-transparent text-body outline-none"
        />
      </label>
      <button type="submit" aria-label={m.nav_search()} className="grid h-9 w-9 place-items-center">
        <Search size={16} aria-hidden />
      </button>
    </form>
  );
}

function IconLink({
  to,
  label,
  children,
}: {
  to: "/search" | "/my/wishlist" | "/cart";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} aria-label={label} className="grid h-11 w-11 place-items-center hover:text-sub">
      {children}
    </Link>
  );
}

/** 로그아웃 — 세션 쿠키를 지우고 홈으로 간다(헤더·마이페이지 메뉴) */
export function LogoutButton({
  className = "hidden h-11 items-center px-2 font-medium text-meta hover:text-sub md:inline-flex",
}: {
  className?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const out = useMutation({
    mutationFn: () => logout(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.history.push("/");
    },
  });
  return (
    <button type="button" onClick={() => out.mutate()} className={className}>
      {m.nav_logout()}
    </button>
  );
}
