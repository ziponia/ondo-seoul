const CDN_HOST = "cdn.avarlabs.com";

/**
 * sayren CDN 사진을 표시 크기에 맞춰 줄여 받는다(`?w=…&f=webp`). 리뷰 사진은 구매자가 올린 원본(수 MB)이라
 * 작은 칸에 원본을 받으면 늦게 그려진다. CDN 밖 주소는 그대로 둔다.
 */
export function cdnImage(src: string, width: number): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== CDN_HOST) return src;
  url.searchParams.set("w", String(width));
  url.searchParams.set("f", "webp");
  return url.toString();
}
