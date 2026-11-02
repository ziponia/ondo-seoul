import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { COUNTRY_COOKIE } from "../../lib/config";

/**
 * 배송 국가·통화 고르기 — 상점의 판매 권역(`store.markets`)이 둘 이상일 때만 보인다.
 * 고른 권역의 첫 국가를 쿠키에 두면 다음 요청부터 API가 그 권역의 통화·가격으로 답한다(`x-buyer-country`).
 */
export function MarketSelect({ compact = false }: { compact?: boolean }) {
  const store = useStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  if (store.markets.length < 2) return null;
  const current = store.market?.marketId ?? store.markets[0]?.marketId;
  return (
    <label
      className={compact ? "flex items-center md:hidden" : "hidden items-center gap-1.5 md:flex"}
    >
      {compact ? null : <Globe size={18} strokeWidth={1.8} aria-hidden />}
      <span className="sr-only">{m.market_label()}</span>
      <select
        value={current}
        onChange={async (event) => {
          const market = store.markets.find((mk) => mk.marketId === event.target.value);
          const country = market?.countries[0];
          if (!country) return;
          // biome-ignore lint/suspicious/noDocumentCookie: 화면 선택값(비밀 아님)을 다음 요청에 싣는다
          document.cookie = `${COUNTRY_COOKIE}=${country}; Path=/; Max-Age=31536000; SameSite=Lax`;
          await queryClient.invalidateQueries();
          await router.invalidate();
        }}
        className={
          compact
            ? "h-10 max-w-[120px] bg-page font-bold text-meta"
            : "h-10 max-w-[180px] border border-line-strong bg-page px-2 text-meta"
        }
      >
        {store.markets.map((market) => (
          <option key={market.marketId} value={market.marketId}>
            {m.market_option({
              name: compact ? (market.countries[0] ?? market.marketId).toUpperCase() : market.name,
              currency: market.currency,
            })}
          </option>
        ))}
      </select>
    </label>
  );
}
