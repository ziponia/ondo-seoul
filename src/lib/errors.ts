import { ApiError } from "@sayren/storefront-sdk";

/**
 * 없는 리소스(404)는 null로 바꾼다 — 서버 함수 안에서 쓴다. 오류 객체는 서버 함수 경계를 넘으며 클래스가 사라지므로
 * 화면은 null을 보고 404 화면(`notFound()`)을 띄운다. 그 밖의 오류는 그대로 던진다.
 */
export function nullOn404(error: unknown): null {
  if (error instanceof ApiError && error.status === 404) return null;
  throw error;
}
