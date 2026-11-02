import en from "../../messages/en.json";
import ko from "../../messages/ko.json";

/**
 * 화면 문구(이슈 #73) — 문구는 `messages/{locale}.json`에만 쓰고 코드에서는 `m.키()`로 부른다.
 * 키는 `{영역}_{이름}`이고 값의 `{name}`은 인자로 채운다(`m.cart_count({ count: 3 })`).
 * 형식은 inlang 메시지 형식이라 Paraglide 같은 도구로 옮겨도 그대로 읽힌다.
 *
 * 언어를 더하려면 `messages/en.json`을 만들고 아래 `CATALOGS`와 `LOCALES`에 더한다. 빠진 키는 기본 언어(ko) 문구를 쓴다.
 * 언어는 요청마다 `?lang=` → `Accept-Language` → `ko` 순서로 정한다(`src/start.ts`, 서버). 브라우저는 서버가 정한
 * `<html lang>`을 읽어 같은 언어로 이어 그린다.
 *
 * 모듈 최상위에서 `m.*()`를 부르지 않는다 — 서버에서는 요청마다 언어가 다르다. 라벨 표는 `lazyMessages`로 만든다.
 */
export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const BASE_LOCALE: Locale = "ko";
export const LOCALE_QUERY_PARAM = "lang";

type Catalog = typeof ko;
export type MessageKey = Exclude<keyof Catalog, "$schema">;
export type MessageArgs = Readonly<Record<string, string | number>>;

const CATALOGS: Record<Locale, Partial<Record<MessageKey, string>>> = { ko, en };

/** `ko-KR`·`KO` → `ko`. 지원하지 않으면 undefined */
export function toLocale(value: string | null | undefined): Locale | undefined {
  if (!value) return undefined;
  const tag = value.trim().toLowerCase().replace("_", "-");
  return (LOCALES as readonly string[]).find((l) => l === tag || l === tag.split("-")[0]) as
    | Locale
    | undefined;
}

/** 고른 언어를 이어 쓰는 쿠키 — `?lang=`으로 고르면 다음 화면도 그 언어다 */
export const LOCALE_COOKIE = "ondo_lang";

/** 요청 언어 — `?lang=` → 언어 쿠키 → `Accept-Language`(q값 순) → 기본 언어 */
export function resolveLocale(
  url: URL,
  acceptLanguage: string | null,
  cookieHeader: string | null = null,
): Locale {
  const query = toLocale(url.searchParams.get(LOCALE_QUERY_PARAM));
  if (query) return query;
  const saved = toLocale(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
      ?.slice(LOCALE_COOKIE.length + 1),
  );
  if (saved) return saved;
  const accepted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { tag: tag ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of accepted) {
    const locale = toLocale(tag);
    if (locale) return locale;
  }
  return BASE_LOCALE;
}

let serverLocale: (() => Locale | undefined) | undefined;

/** 서버의 요청 언어 저장소를 연결한다(`locale.server.ts`) */
export function setServerLocaleGetter(getter: () => Locale | undefined): void {
  serverLocale = getter;
}

/** 지금 언어 — 서버는 요청 언어, 브라우저는 서버가 정한 `<html lang>` */
export function getLocale(): Locale {
  if (typeof document === "undefined") return serverLocale?.() ?? BASE_LOCALE;
  return toLocale(document.documentElement.lang) ?? BASE_LOCALE;
}

/** `{name}` 자리를 채운다. 값이 없는 자리는 그대로 둔다 */
export function formatMessage(template: string, args?: MessageArgs): string {
  if (!args) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.hasOwn(args, name) ? String(args[name]) : whole,
  );
}

export function t(key: MessageKey, args?: MessageArgs): string {
  const template = CATALOGS[getLocale()][key] ?? CATALOGS[BASE_LOCALE][key] ?? key;
  return formatMessage(template, args);
}

/** `m.키(인자)` — 키 오타는 타입 검사가 잡는다 */
export const m = Object.fromEntries(
  (Object.keys(ko) as (keyof Catalog)[])
    .filter((key): key is MessageKey => key !== "$schema")
    .map((key) => [key, (args?: MessageArgs) => t(key, args)]),
) as { readonly [K in MessageKey]: (args?: MessageArgs) => string };

/**
 * 라벨 표 — 값을 읽을 때마다 문구를 만든다(서버에서 요청 언어를 따른다). 타입은 `Record<K, string>`이다.
 */
export function lazyMessages<K extends string>(
  table: Record<K, () => string>,
): Readonly<Record<K, string>> {
  const labels = {} as Record<K, string>;
  for (const key of Object.keys(table) as K[]) {
    Object.defineProperty(labels, key, { enumerable: true, get: () => table[key]() });
  }
  return Object.freeze(labels);
}
