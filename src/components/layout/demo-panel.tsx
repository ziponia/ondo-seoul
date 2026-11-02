import { useState } from "react";
import { DEMO_SCENARIO_COOKIE, DEMO_SCENARIOS, type DemoScenario } from "../../demo/scenario";
import { m } from "../../i18n";

const LABELS: Record<DemoScenario, () => string> = {
  default: m.demo_scenario_default,
  empty: m.demo_scenario_empty,
  soldout: m.demo_scenario_soldout,
  closed: m.demo_scenario_closed,
  global: m.demo_scenario_global,
};

/**
 * 데모 패널 — 데모 모드에서만 그린다. 시나리오를 고르면 쿠키에 두고 새로 불러온다(서버가 쿠키로 데모 응답을 고른다).
 */
export function DemoPanel({ scenario }: { scenario: DemoScenario }) {
  const [open, setOpen] = useState(false);
  const pick = (next: DemoScenario) => {
    // biome-ignore lint/suspicious/noDocumentCookie: 데모 시나리오는 브라우저에서 고르는 비민감 값이다
    document.cookie = `${DEMO_SCENARIO_COOKIE}=${next}; Path=/; SameSite=Lax`;
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    window.location.assign(url.toString());
  };
  return (
    <div className="fixed bottom-20 left-3 z-40 md:bottom-4 md:left-4">
      {open ? (
        <section
          aria-label={m.demo_panel_title()}
          className="mb-2 flex w-64 flex-col gap-2 border border-ink bg-page p-4 shadow-lg"
        >
          <strong className="text-body">{m.demo_panel_title()}</strong>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_SCENARIOS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === scenario}
                onClick={() => pick(value)}
                className={`h-9 px-3 font-bold text-meta ${
                  value === scenario ? "bg-ink text-page" : "border border-line-strong"
                }`}
              >
                {LABELS[value]()}
              </button>
            ))}
          </div>
          <p className="text-caption text-muted">{m.demo_panel_note()}</p>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={m.demo_panel_open()}
        onClick={() => setOpen(!open)}
        className="h-9 bg-point px-3 font-bold text-meta text-page"
      >
        {m.demo_badge()} · {LABELS[scenario]()}
      </button>
    </div>
  );
}
