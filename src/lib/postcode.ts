/**
 * 카카오(다음) 우편번호 서비스 — 키 없이 쓰는 공개 스크립트다(https://postcode.map.daum.net/guide).
 * 브라우저에서 처음 쓸 때 한 번 불러온다. 서버 렌더에서는 부르지 않는다.
 */
const SCRIPT_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

/** `oncomplete`가 넘기는 값 중 쓰는 칸 */
export interface PostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
}

interface PostcodeInstance {
  embed(element: HTMLElement, options?: { autoClose?: boolean }): void;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: PostcodeResult) => void;
        width?: string;
        height?: string;
      }) => PostcodeInstance;
    };
  }
}

let loaded: Promise<NonNullable<Window["daum"]>> | null = null;

export function loadPostcode(): Promise<NonNullable<Window["daum"]>> {
  if (window.daum?.Postcode) return Promise.resolve(window.daum);
  // 실패하면 다음 클릭에서 다시 불러오도록 비운다
  loaded ??= new Promise<NonNullable<Window["daum"]>>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.daum ? resolve(window.daum) : reject(new Error("postcode")));
    script.onerror = () => reject(new Error("postcode"));
    document.head.append(script);
  }).catch((error: unknown) => {
    loaded = null;
    throw error;
  });
  return loaded;
}

/**
 * 고른 주소 → 기본 주소 한 줄. 도로명을 고르면 법정동·건물명을 괄호로 덧붙인다(공식 안내의 참고 항목).
 */
export function addressLineOf(data: PostcodeResult): string {
  if (data.userSelectedType === "J") return data.jibunAddress;
  const extra = [
    /[동로가]$/.test(data.bname) ? data.bname : "",
    data.buildingName && data.apartment === "Y" ? data.buildingName : "",
  ].filter(Boolean);
  return extra.length > 0 ? `${data.roadAddress} (${extra.join(", ")})` : data.roadAddress;
}
