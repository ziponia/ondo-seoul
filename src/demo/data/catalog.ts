import type { CategoryNode, productCardSchema } from "@sayren/storefront-sdk";
import type { z } from "zod";
import type { DemoContext } from "../http";

/** 카테고리 스키마는 재귀(z.lazy)라 입력 타입을 뽑을 수 없어 출력 타입을 쓴다 — 기본값 없는 같은 모양이다 */
export type CategoryNodeInput = CategoryNode;
export type ProductCardInput = z.input<typeof productCardSchema>;

/** 데모 카테고리 — 2단계 트리 */
export const DEMO_CATEGORIES: CategoryNodeInput[] = [
  node("outer", "아우터", [
    ["outer-coat", "코트"],
    ["outer-padding", "패딩"],
    ["outer-jacket", "재킷"],
  ]),
  node("top", "상의", [
    ["top-knit", "니트"],
    ["top-shirt", "셔츠"],
    ["top-tee", "티셔츠"],
  ]),
  node("bottom", "하의", [
    ["bottom-slacks", "슬랙스"],
    ["bottom-denim", "데님"],
  ]),
  node("dress", "원피스", []),
  node("bag", "가방", []),
  node("shoes", "신발", []),
  node("acc", "액세서리", []),
];

function node(id: string, name: string, children: [string, string][]): CategoryNodeInput {
  return {
    categoryId: id,
    name,
    depth: 1,
    children: children.map(([categoryId, childName]) => ({
      categoryId,
      name: childName,
      depth: 2,
      children: [],
    })),
  };
}

/** 카테고리와 그 하위 id */
export function categoryAndDescendants(categoryId: string): string[] {
  const top = DEMO_CATEGORIES.find((c) => c.categoryId === categoryId);
  if (top) return [top.categoryId, ...top.children.map((c) => c.categoryId)];
  return [categoryId];
}

export function categoryName(categoryId: string): string | undefined {
  for (const top of DEMO_CATEGORIES) {
    if (top.categoryId === categoryId) return top.name;
    const child = top.children.find((c) => c.categoryId === categoryId);
    if (child) return child.name;
  }
  return undefined;
}

export interface DemoProduct {
  id: string;
  no: number;
  name: string;
  categoryId: string;
  /** 정가(비교용) — 없으면 null */
  original: number | null;
  /** 판매가 */
  sale: number;
  /** 즉시할인가 — 없으면 null */
  discounted: number | null;
  rating: number;
  reviews: number;
  freeShipping: boolean;
  /** 이미지 파일 이름(`public/demo/products/{image}.svg`) */
  image: string;
  /** 신상품 순서 — 클수록 최근 */
  arrival: number;
  /** 미국 권역 가격(센트) */
  usd: number;
}

const p = (
  no: number,
  name: string,
  categoryId: string,
  sale: number,
  discounted: number | null,
  original: number | null,
  rating: number,
  reviews: number,
  image: string,
  arrival: number,
  usd: number,
  freeShipping = true,
): DemoProduct => ({
  id: `prd_demo_${no}`,
  no,
  name,
  categoryId,
  sale,
  discounted,
  original,
  rating,
  reviews,
  freeShipping,
  image,
  arrival,
  usd,
});

export const DEMO_PRODUCTS: DemoProduct[] = [
  p(
    1,
    "오버핏 울 블렌드 싱글 코트",
    "outer-coat",
    159000,
    117200,
    189000,
    4.8,
    1204,
    "coat-charcoal",
    10,
    8600,
  ),
  p(
    2,
    "크롭 덕다운 패딩 점퍼",
    "outer-padding",
    199000,
    155300,
    239000,
    4.9,
    1890,
    "padding-navy",
    12,
    11400,
  ),
  p(
    3,
    "울 캐시미어 핸드메이드 코트",
    "outer-coat",
    229000,
    173400,
    289000,
    4.9,
    744,
    "coat-camel",
    14,
    12700,
  ),
  p(
    4,
    "캐시미어 터치 라운드 니트",
    "top-knit",
    59000,
    48300,
    69000,
    4.9,
    3381,
    "knit-ivory",
    9,
    3500,
  ),
  p(
    5,
    "와이드 원턱 데님 팬츠",
    "bottom-denim",
    59000,
    null,
    null,
    4.7,
    872,
    "denim-blue",
    15,
    4300,
  ),
  p(6, "레더 스퀘어 숄더백", "bag", 129000, 100600, null, 4.8, 516, "bag-brown", 8, 7400),
  p(
    7,
    "세미 와이드 핀턱 슬랙스",
    "bottom-slacks",
    72000,
    57600,
    null,
    4.8,
    1012,
    "slacks-greige",
    7,
    4200,
  ),
  p(8, "스웨이드 페니 로퍼", "shoes", 98000, 83300, null, 4.6, 298, "loafer-tan", 6, 6100),
  p(9, "피그먼트 후드 스웨트셔츠", "top-tee", 54000, null, null, 4.7, 642, "hood-oat", 16, 3900),
  p(10, "램스울 머플러 오트밀", "acc", 39000, 33700, null, 4.8, 455, "muffler-oat", 13, 2500),
  p(11, "옥스퍼드 오버 셔츠", "top-shirt", 49000, 41600, null, 4.6, 388, "shirt-blue", 11, 3100),
  p(12, "니트 롱 원피스", "dress", 89000, 71200, 99000, 4.7, 233, "dress-brown", 5, 5200),
  p(13, "워시드 코튼 볼캡", "acc", 32000, null, null, 4.5, 174, "cap-khaki", 4, 2300, false),
  p(14, "퀼팅 라이너 점퍼", "outer-jacket", 89000, 75600, null, 4.6, 312, "liner-olive", 3, 5500),
  p(15, "하이넥 울 하프 코트", "outer-coat", 219000, 148900, null, 4.8, 467, "coat-grey", 2, 10900),
  p(16, "이니셜 각인 레더 카드지갑", "acc", 39000, null, null, 4.9, 421, "wallet-brown", 1, 2900),
  p(17, "숏 패딩 베스트", "outer-padding", 79000, 63200, null, 4.6, 205, "padding-navy", 17, 4600),
  p(
    18,
    "알파카 블렌드 브이넥 가디건",
    "top-knit",
    89000,
    62300,
    null,
    4.8,
    921,
    "knit-ivory",
    18,
    4500,
  ),
  p(
    19,
    "후드 덕다운 롱 패딩",
    "outer-padding",
    329000,
    197400,
    null,
    4.9,
    1532,
    "padding-navy",
    19,
    14500,
  ),
  p(
    20,
    "코듀로이 트러커 재킷",
    "outer-jacket",
    119000,
    97500,
    null,
    4.7,
    156,
    "liner-olive",
    20,
    7100,
  ),
  p(
    21,
    "오버사이즈 체크 재킷",
    "outer-jacket",
    139000,
    104200,
    null,
    4.7,
    284,
    "coat-grey",
    21,
    7600,
  ),
  p(
    22,
    "라운드 칼라 부클 재킷",
    "outer-jacket",
    119000,
    97500,
    null,
    4.8,
    199,
    "coat-camel",
    22,
    7100,
  ),
  p(
    23,
    "투버튼 테일러드 블레이저",
    "outer-jacket",
    129000,
    null,
    null,
    4.7,
    388,
    "coat-grey",
    23,
    8100,
    false,
  ),
  p(
    24,
    "더블 브레스티드 롱 코트",
    "outer-coat",
    219000,
    null,
    null,
    4.7,
    201,
    "coat-charcoal",
    24,
    13900,
  ),
  p(25, "케이블 크루넥 니트", "top-knit", 69000, 55200, null, 4.8, 712, "knit-ivory", 25, 4100),
  p(
    26,
    "스트라이프 롱 슬리브 티셔츠",
    "top-tee",
    29000,
    null,
    null,
    4.6,
    433,
    "hood-oat",
    26,
    2100,
  ),
  p(
    27,
    "린넨 블렌드 밴드 칼라 셔츠",
    "top-shirt",
    45000,
    38200,
    null,
    4.5,
    167,
    "shirt-blue",
    27,
    2900,
  ),
  p(
    28,
    "스트레이트 생지 데님",
    "bottom-denim",
    69000,
    null,
    null,
    4.7,
    540,
    "denim-blue",
    28,
    4900,
  ),
  p(
    29,
    "와이드 울 슬랙스",
    "bottom-slacks",
    79000,
    67100,
    null,
    4.8,
    302,
    "slacks-greige",
    29,
    5000,
  ),
  p(30, "플리츠 미디 원피스", "dress", 99000, 79200, null, 4.6, 118, "dress-brown", 30, 5900),
  p(31, "미니 크로스백", "bag", 69000, 58600, null, 4.7, 233, "bag-brown", 31, 4300),
  p(32, "캔버스 토트백", "bag", 39000, null, null, 4.5, 401, "bag-brown", 32, 2600),
  p(33, "청키 솔 로퍼", "shoes", 104000, 88400, null, 4.7, 187, "loafer-tan", 33, 6600),
  p(34, "스웨이드 앵클 부츠", "shoes", 139000, 104200, null, 4.8, 96, "loafer-tan", 34, 7900),
  p(35, "울 니트 비니", "acc", 25000, null, null, 4.6, 288, "muffler-oat", 35, 1700, false),
  p(36, "레더 장갑", "acc", 49000, 41600, null, 4.7, 74, "wallet-brown", 36, 3100),
  p(37, "레더 태슬 로퍼", "shoes", 99000, 79200, null, 4.7, 211, "loafer-tan", 37, 6000),
  p(38, "스퀘어토 메리제인", "shoes", 72000, null, null, 4.6, 143, "loafer-tan", 38, 4700),
  p(39, "캔버스 슬립온", "shoes", 45000, null, null, 4.5, 388, "loafer-tan", 39, 3000),
];

/** 영어 요청(`Accept-Language: en`)에 돌려줄 이름 — 실제 API의 번역 레코드(칸 단위 대체)를 흉내 낸 데모 값 */
const EN_CATEGORY: Record<string, string> = {
  outer: "Outerwear",
  "outer-coat": "Coats",
  "outer-padding": "Puffers",
  "outer-jacket": "Jackets",
  top: "Tops",
  "top-knit": "Knitwear",
  "top-shirt": "Shirts",
  "top-tee": "T-shirts",
  bottom: "Bottoms",
  "bottom-slacks": "Trousers",
  "bottom-denim": "Denim",
  dress: "Dresses",
  bag: "Bags",
  shoes: "Shoes",
  acc: "Accessories",
};

const EN_PRODUCT: Record<number, string> = {
  "1": "Oversized Wool-Blend Single Coat",
  "2": "Cropped Duck Down Puffer",
  "3": "Handmade Wool Cashmere Coat",
  "4": "Cashmere-Touch Crewneck Knit",
  "5": "Wide One-Tuck Denim Pants",
  "6": "Leather Square Shoulder Bag",
  "7": "Semi-Wide Pintuck Trousers",
  "8": "Suede Penny Loafers",
  "9": "Pigment Hooded Sweatshirt",
  "10": "Lambswool Muffler Oatmeal",
  "11": "Oxford Overshirt",
  "12": "Long Knit Dress",
  "13": "Washed Cotton Ball Cap",
  "14": "Quilted Liner Jacket",
  "15": "High-Neck Wool Half Coat",
  "16": "Initial Leather Card Wallet",
  "17": "Short Puffer Vest",
  "18": "Alpaca-Blend V-Neck Cardigan",
  "19": "Hooded Long Down Puffer",
  "20": "Corduroy Trucker Jacket",
  "21": "Oversized Check Jacket",
  "22": "Round-Collar Bouclé Jacket",
  "23": "Two-Button Tailored Blazer",
  "24": "Double-Breasted Long Coat",
  "25": "Cable Crewneck Knit",
  "26": "Striped Long-Sleeve Tee",
  "27": "Linen-Blend Band-Collar Shirt",
  "28": "Straight Raw Denim",
  "29": "Wide Wool Trousers",
  "30": "Pleated Midi Dress",
  "31": "Mini Crossbody Bag",
  "32": "Canvas Tote Bag",
  "33": "Chunky-Sole Loafers",
  "34": "Suede Ankle Boots",
  "35": "Wool Knit Beanie",
  "36": "Leather Gloves",
  "37": "Leather Tassel Loafers",
  "38": "Square-Toe Mary Janes",
  "39": "Canvas Slip-Ons",
};

/** 요청 언어의 카테고리 트리 — 번역이 없는 칸은 기본 언어 */
export function localizedCategories(ctx: DemoContext): CategoryNodeInput[] {
  if (ctx.locale !== "en") return DEMO_CATEGORIES;
  const tr = (node: CategoryNodeInput): CategoryNodeInput => ({
    ...node,
    name: EN_CATEGORY[node.categoryId] ?? node.name,
    children: node.children.map(tr),
  });
  return DEMO_CATEGORIES.map(tr);
}

export function localizedCategoryName(ctx: DemoContext, categoryId: string): string | undefined {
  return ctx.locale === "en"
    ? (EN_CATEGORY[categoryId] ?? categoryName(categoryId))
    : categoryName(categoryId);
}

export function productName(ctx: DemoContext, product: DemoProduct): string {
  return ctx.locale === "en" ? (EN_PRODUCT[product.no] ?? product.name) : product.name;
}

/**
 * 판매 권역 가격 — 해외 권역은 USD(센트)다. 할인율은 원화 할인율을 그대로 써서 1달러 단위로 맞춘다.
 * 카드·상세·주문서가 이 함수 하나로 가격을 읽는다.
 */
export function marketPrice(ctx: DemoContext, product: DemoProduct) {
  if (ctx.scenario !== "global") {
    return {
      currency: "KRW",
      sale: product.sale,
      discounted: product.discounted,
      original: product.original,
    };
  }
  const discounted =
    product.discounted === null
      ? null
      : Math.round((product.usd * product.discounted) / product.sale / 100) * 100;
  return { currency: "USD", sale: product.usd, discounted, original: null };
}

export function findDemoProduct(idOrNo: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((product) => product.id === idOrNo || String(product.no) === idOrNo);
}

export function demoImageUrl(ctx: DemoContext, image: string): string {
  return `${ctx.origin}/demo/products/${image}.svg`;
}

/** 품절 시나리오에서 품절인 상품 */
export function isSoldOut(ctx: DemoContext, product: DemoProduct): boolean {
  return ctx.scenario === "soldout" && product.no === 8;
}

export function toCard(ctx: DemoContext, product: DemoProduct): ProductCardInput {
  const price = marketPrice(ctx, product);
  return {
    productId: product.id,
    productNo: product.no,
    currency: price.currency,
    name: productName(ctx, product),
    thumbnailUrl: demoImageUrl(ctx, product.image),
    salePrice: price.sale,
    discountedPrice: price.discounted,
    discountRate:
      price.discounted !== null ? Math.round((1 - price.discounted / price.sale) * 100) : null,
    originalPrice: price.original,
    freeShipping: product.freeShipping,
    fulfillment: { type: "SHIPPING", requiresShipping: true },
    averageRating: product.rating,
    reviewCount: product.reviews,
    soldOut: isSoldOut(ctx, product),
  };
}

/** 구매자가 내는 한 개 가격 — 데모 정렬·필터에 쓴다 */
export function payPrice(product: DemoProduct): number {
  return product.discounted ?? product.sale;
}
