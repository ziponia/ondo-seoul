import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { Logo } from "./logo";

/**
 * 결제 단계 헤더(데스크톱) — 주문서·결제 확인·주문 완료 화면은 상점 메뉴 대신 로고와 단계만 보인다.
 * 라우트가 `staticData.checkoutStep`으로 지금 단계를 알린다.
 */
export function CheckoutHeader({ step }: { step: 2 | 3 }) {
  const store = useStore();
  const steps = [m.cart_step_cart(), m.cart_step_checkout(), m.cart_step_done()];
  return (
    <header className="hidden border-line border-b bg-page md:block">
      <div className="mx-auto flex h-[72px] max-w-page items-center justify-between px-6">
        <Logo name={store.name} logoUrl={store.logoUrl} />
        <ol aria-label={m.cart_steps()} className="flex gap-5 text-body text-faint">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index + 1 === step ? "step" : undefined}
              className={index + 1 === step ? "font-bold text-ink" : undefined}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}
