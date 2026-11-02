import { m } from "../i18n";

const CARDS = Array.from({ length: 10 }, (_, i) => i);

/**
 * 로딩 스켈레톤 — 라우트를 옮길 때 데이터가 늦으면 보인다(`defaultPendingComponent`).
 * 첫 화면은 서버가 데이터와 함께 그리므로 보이지 않는다.
 */
export function PageSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-page px-4 pt-7 pb-24 md:px-6">
      <span role="status" className="sr-only">
        {m.loading()}
      </span>
      <div aria-hidden className="flex flex-col">
        <span className="skeleton block h-3.5 w-30" />
        <span className="skeleton mt-4 mb-6 block h-9 w-45" />
        <div className="mb-8 flex gap-2">
          {[64, 64, 64, 80, 64].map((width, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 자리표시
              key={i}
              className="skeleton block h-10 rounded-full"
              style={{ width }}
            />
          ))}
        </div>
        <div className="mb-5 h-px bg-ink" />
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-11 md:grid-cols-3 lg:grid-cols-6">
          {CARDS.map((i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <span className="skeleton block aspect-[4/5]" />
              <span className="skeleton block h-3.5 w-[90%]" />
              <span className="skeleton block h-3.5 w-[60%]" />
              <span className="skeleton block h-5 w-[45%]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
