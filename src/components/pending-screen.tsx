import { Link } from "@tanstack/react-router";
import { m } from "../i18n";

/** 퍼블리싱 전 라우트의 자리 — 화면을 만들면 이 컴포넌트를 쓰는 라우트를 바꾼다(`docs/SCREENS.md`) */
export function PendingScreen({ title }: { title: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-28 text-center">
      <h1 className="font-black text-2xl tracking-[-0.03em]">{title}</h1>
      <p className="font-bold text-body-lg">{m.pending_title()}</p>
      <p className="text-body text-sub">{m.pending_body()}</p>
      <Link to="/" className="mt-4 grid h-12 place-items-center bg-ink px-6 font-bold text-page">
        {m.root_go_home()}
      </Link>
    </main>
  );
}
