import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { m } from "../../i18n";
import { MobilePageHeader } from "../layout/mobile-page-header";

/**
 * 마이페이지 하위 화면 틀 — 데스크톱은 가운데 한 단에 「‹ 상위」 링크와 제목, 모바일은 상단 바.
 * `back`을 주지 않으면 마이페이지로 돌아간다.
 */
export function MySubPage({
  title,
  mobileTitle,
  back,
  width = "max-w-[960px]",
  heading = true,
  mobileBack = true,
  children,
}: {
  /** 모바일 상단 바의 뒤로 — 하단 탭 화면(찜)은 없다 */
  mobileBack?: boolean;
  /** 데스크톱 제목을 화면이 직접 그린다(두 단 화면) */
  heading?: boolean;
  title: string;
  mobileTitle?: string;
  back?: { label: string; to: "/my" | "/my/support" | "/my/reviews" | "/my/orders" };
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <MobilePageHeader
        title={mobileTitle ?? title}
        icons={!mobileBack}
        center={mobileBack}
        back={mobileBack}
      />
      <main className={`mx-auto ${width} pb-24 md:px-6 md:pt-10`}>
        <Link
          to={back?.to ?? "/my"}
          className="hidden items-center gap-0.5 text-meta text-sub md:inline-flex"
        >
          <ChevronLeft size={14} aria-hidden />
          {back?.label ?? m.my_title()}
        </Link>
        {heading ? (
          <h1 className="mt-2 mb-6 hidden font-black text-[32px] tracking-[-0.04em] md:block">
            {title}
          </h1>
        ) : null}
        {children}
      </main>
    </>
  );
}
