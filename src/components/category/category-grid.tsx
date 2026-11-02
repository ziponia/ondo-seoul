import { Link } from "@tanstack/react-router";
import { useCategories } from "../../hooks/use-catalog";
import { m } from "../../i18n";

const CELL =
  "flex h-12 items-center justify-center border-line border-r border-b px-2 text-center font-bold text-body tracking-[-0.02em] md:h-14 md:text-body-lg";

/**
 * 1단계 카테고리 글자 격자 — 모바일 4열, `row`면 데스크톱 한 줄. 끝 칸은 카테고리 전체 화면이다.
 * 홈 바로가기와 검색 시작 화면이 같이 쓴다(원형 첫 글자 아이콘을 쓰지 않는다).
 */
export function CategoryGrid({ row = false }: { row?: boolean }) {
  const categories = useCategories();
  if (categories.length === 0) return null;
  return (
    <ul
      className={`grid grid-cols-4 border-line border-t border-l ${
        row ? "md:grid-flow-col md:auto-cols-fr md:grid-cols-none" : ""
      }`}
    >
      {categories.map((category) => (
        <li key={category.categoryId} className="contents">
          <Link to="/c/$categoryId" params={{ categoryId: category.categoryId }} className={CELL}>
            {category.name}
          </Link>
        </li>
      ))}
      <li className="contents">
        <Link to="/categories" className={`${CELL} text-sub`}>
          {m.home_all()}
        </Link>
      </li>
    </ul>
  );
}
