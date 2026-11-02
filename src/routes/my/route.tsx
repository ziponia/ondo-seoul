import { createFileRoute, Outlet, redirect, useMatches } from "@tanstack/react-router";
import { MyNav } from "../../components/my/my-nav";
import { m } from "../../i18n";
import { meQuery } from "../../lib/account";

/**
 * 마이페이지 틀 — 로그인 회원만. 데스크톱은 왼쪽 메뉴 + 오른쪽 화면, 모바일은 화면만(메뉴는 마이페이지 첫 화면에 있다).
 */
export const Route = createFileRoute("/my")({
  staticData: { mobileHeader: "page" },
  beforeLoad: async ({ context: { queryClient }, location }) => {
    if (!(await queryClient.ensureQueryData(meQuery()))) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  head: () => ({ meta: [{ title: m.my_title() }] }),
  component: MyLayout,
});

function MyLayout() {
  // 왼쪽 메뉴는 마이페이지 첫 화면에만 — 하위 화면은 가운데 한 단(MySubPage)이다
  const index = useMatches({
    select: (matches) => matches[matches.length - 1]?.fullPath === "/my/",
  });
  if (!index) return <Outlet />;
  return (
    <div className="mx-auto max-w-page md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-14 md:px-6 md:pt-10 md:pb-24">
      <aside className="hidden md:block">
        <h1 className="mb-8 font-black text-[32px] tracking-[-0.04em]">{m.my_title()}</h1>
        <MyNav current="/my" />
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
