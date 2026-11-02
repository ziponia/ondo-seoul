import { Link } from "@tanstack/react-router";
import { m } from "../../i18n";
import { LogoutButton } from "../layout/site-header";

type MyPath =
  | "/my"
  | "/my/claims"
  | "/my/wishlist"
  | "/my/coupons"
  | "/my/points"
  | "/my/reviews"
  | "/my/inquiries"
  | "/my/support"
  | "/my/account";

export type AccountTab = "profile" | "addresses" | "consents" | "identities" | "withdraw";

type Item = { label: () => string; to: MyPath; search?: { tab: AccountTab } };

export const MY_GROUPS: { title: () => string; items: Item[] }[] = [
  {
    title: m.my_group_shopping,
    items: [
      { label: m.my_menu_orders, to: "/my" },
      { label: m.my_menu_claims, to: "/my/claims" },
      { label: m.my_menu_wish, to: "/my/wishlist" },
    ],
  },
  {
    title: m.my_group_benefit,
    items: [
      { label: m.my_menu_coupons, to: "/my/coupons" },
      { label: m.my_menu_points, to: "/my/points" },
    ],
  },
  {
    title: m.my_group_activity,
    items: [
      { label: m.my_menu_reviews, to: "/my/reviews" },
      { label: m.my_menu_inquiries, to: "/my/inquiries" },
      { label: m.my_menu_support, to: "/my/support" },
    ],
  },
  {
    title: m.my_group_info,
    items: [
      { label: m.my_menu_account, to: "/my/account" },
      { label: m.my_menu_addresses, to: "/my/account", search: { tab: "addresses" } },
      { label: m.my_menu_consents, to: "/my/account", search: { tab: "consents" } },
      { label: m.my_menu_identities, to: "/my/account", search: { tab: "identities" } },
      { label: m.my_menu_withdraw, to: "/my/account", search: { tab: "withdraw" } },
    ],
  },
];

/** 데스크톱 마이페이지 왼쪽 메뉴 — 지금 화면은 굵게·밑줄 */
export function MyNav({ current }: { current: string }) {
  return (
    <nav aria-label={m.my_title()} className="flex flex-col gap-7">
      {MY_GROUPS.map((group) => (
        <div key={group.title()} className="flex flex-col gap-3.5">
          <h2 className="font-bold text-caption text-sub">{group.title()}</h2>
          <ul className="flex flex-col gap-3.5 text-body-lg">
            {group.items.map((item) => {
              const key = `${item.to}${item.search?.tab ?? ""}`;
              const on = key === current;
              return (
                <li key={key}>
                  <Link
                    to={item.to}
                    search={item.search as never}
                    aria-current={on ? "page" : undefined}
                    className={on ? "font-bold underline underline-offset-[6px]" : "hover:text-sub"}
                  >
                    {item.label()}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <LogoutButton className="self-start text-meta text-muted hover:text-ink" />
    </nav>
  );
}
