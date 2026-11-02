import { Link } from "@tanstack/react-router";

/** 상점 로고 — 셀러가 올린 로고가 있으면 그 이미지, 없으면 상점 이름을 워드마크로 보인다 */
export function Logo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <Link to="/" className="shrink-0">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-7 w-auto md:h-8" />
      ) : (
        <span className="font-display font-extrabold text-[22px] tracking-[-0.04em] md:text-[26px]">
          {name}
        </span>
      )}
    </Link>
  );
}
