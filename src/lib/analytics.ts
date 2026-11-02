import {
  type Analytics,
  type AnalyticsOptions,
  type AnalyticsTrackInput,
  createAnalytics,
} from "@sayren/storefront-sdk/analytics";
import { useEffect } from "react";

/**
 * 방문 분석 — 브라우저 전용. 루트가 한 번 시작하고, 화면은 `useTrack`으로 행동을 남긴다.
 *
 * 장바구니·결제 시작·구매는 여기서 보내지 않는다. 스토어프론트 API가 요청을 처리하면서 서버에서
 * 기록한다(`api.server.ts`가 방문자·세션 쿠키를 헤더로 싣는다).
 */

/** 루트 loader(서버 함수)가 내려주는 값 */
export interface AnalyticsConfig {
  apiBaseUrl: string;
  storeCode: string;
  /** localhost에서도 보낸다(`SAYREN_ANALYTICS_DEBUG=1`) */
  debug: boolean;
}

let instance: Analytics | null = null;
/**
 * 시작 전에 들어온 행동. React는 자식 effect를 부모보다 먼저 돌리므로 첫 화면의 `useTrack`이
 * 루트의 시작보다 앞선다.
 */
let pending: AnalyticsTrackInput[] = [];

export function startAnalytics(config: AnalyticsConfig): Analytics {
  if (instance) return instance;
  const options: AnalyticsOptions = {
    baseUrl: config.apiBaseUrl,
    storeCode: config.storeCode,
    debug: config.debug,
    // 쿠키 동의 배너를 붙이는 상점은 "pending"으로 시작하고 배너에서 setConsent를 부른다
    consent: "granted",
  };
  instance = createAnalytics(options);
  for (const input of pending) instance.track(input);
  pending = [];
  return instance;
}

export function track(input: AnalyticsTrackInput) {
  if (instance) instance.track(input);
  else pending.push(input);
}

/**
 * 화면이 보일 때 행동을 한 번 남긴다. 내용이 같으면 리렌더·StrictMode 이중 실행에도 다시 보내지
 * 않는다(SDK도 같은 페이지뷰 안의 중복을 거른다). `null`이면 아무것도 보내지 않는다.
 */
export function useTrack(input: AnalyticsTrackInput | null) {
  const key = input ? JSON.stringify(input) : "";
  useEffect(() => {
    if (key) track(JSON.parse(key) as AnalyticsTrackInput);
  }, [key]);
}
