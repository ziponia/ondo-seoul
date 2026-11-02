import { useStore } from "../../hooks/use-catalog";
import { Logo } from "./logo";

/** 모바일 상단 로고 바(md 미만) — 결제 확인·주문 완료처럼 뒤로 갈 곳이 없는 결제 단계 화면 */
export function MobileLogoBar() {
  const store = useStore();
  return (
    <div className="sticky top-0 z-20 grid h-14 place-items-center border-line border-b bg-page md:hidden">
      <Logo name={store.name} logoUrl={store.logoUrl} />
    </div>
  );
}
