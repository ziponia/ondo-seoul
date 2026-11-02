import { useEffect, useState } from "react";
import { m } from "../../i18n";

const KEY = "ondo_recent_searches";
const LIMIT = 8;

function read(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 저장소를 쓸 수 없는 브라우저(사생활 보호 모드 등)는 최근 검색어 없이 쓴다
  }
}

/** 최근 검색어를 기기에 남긴다 — 서버에 보내지 않는다 */
export function rememberSearch(keyword: string) {
  write([keyword, ...read().filter((k) => k !== keyword)].slice(0, LIMIT));
}

/** 최근 검색어 — 이 기기에만 있다. 저장소를 읽을 수 없으면 숨긴다 */
export function RecentSearches({ onPick }: { onPick: (keyword: string) => void }) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => setList(read()), []);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="recent-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="recent-h" className="font-bold text-body-lg">
          {m.search_recent()}
        </h2>
        <button
          type="button"
          onClick={() => {
            write([]);
            setList([]);
          }}
          className="h-8 text-caption text-muted"
        >
          {m.search_recent_clear()}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((keyword) => (
          <button
            key={keyword}
            type="button"
            onClick={() => onPick(keyword)}
            className="h-9 rounded-full border border-line-strong px-3.5 text-meta"
          >
            {keyword}
          </button>
        ))}
      </div>
    </section>
  );
}
