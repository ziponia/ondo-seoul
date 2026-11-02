import { AsyncLocalStorage } from "node:async_hooks";
import { type Locale, setServerLocaleGetter } from "./index";

/** 요청마다 정한 언어를 그 요청이 끝날 때까지 유지한다(동시에 들어온 요청끼리 섞이지 않는다) */
const storage = new AsyncLocalStorage<Locale>();
setServerLocaleGetter(() => storage.getStore());

export function runWithLocale<T>(locale: Locale, fn: () => T): T {
  return storage.run(locale, fn);
}
