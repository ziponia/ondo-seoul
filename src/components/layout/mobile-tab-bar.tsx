import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, Home, Menu, User } from "lucide-react";
import { m } from "../../i18n";

const TABS = [
  { to: "/", label: () => m.nav_home(), Icon: Home, exact: true },
  { to: "/categories", label: () => m.nav_categories(), Icon: Menu, exact: false },
  { to: "/collections", label: () => m.nav_collections(), Icon: Bookmark, exact: false },
  { to: "/my/wishlist", label: () => m.nav_wishlist(), Icon: Heart, exact: false },
  { to: "/my", label: () => m.nav_my_short(), Icon: User, exact: true },
] as const;

/** 모바일 하단 탭(md 미만) — 화면 아래에 고정한다. 본문은 푸터 아래 여백(pb-24)으로 가리지 않는다 */
export function MobileTabBar() {
  return (
    <nav
      aria-label={m.nav_bottom()}
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-line border-t bg-page text-[11px] md:hidden"
    >
      {TABS.map(({ to, label, Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact, includeSearch: false }}
          className="flex flex-col items-center justify-center gap-1 text-muted"
          activeProps={{ className: "text-ink font-bold", "aria-current": "page" }}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden />
          {label()}
        </Link>
      ))}
    </nav>
  );
}
