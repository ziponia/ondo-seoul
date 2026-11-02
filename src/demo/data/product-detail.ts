import type { productDetailSchema } from "@sayren/storefront-sdk";
import type { z } from "zod";
import type { DemoContext } from "../http";
import { type DemoProduct, demoImageUrl, isSoldOut, productName, toCard } from "./catalog";

type DetailInput = z.input<typeof productDetailSchema>;

/** 카테고리별 조합 옵션 — 컬러 × 사이즈. 액세서리·가방은 컬러만 */
/** 영어 요청의 옵션 이름 — 실제 API의 번역 레코드를 흉내 낸 데모 값 */
const EN_OPTION: Record<string, string> = {
  컬러: "Color",
  사이즈: "Size",
  차콜: "Charcoal",
  오트밀: "Oatmeal",
  카멜: "Camel",
  탄: "Tan",
  블랙: "Black",
  브라운: "Brown",
};

function axes(ctx: DemoContext, product: DemoProduct): { name: string; values: string[] }[] {
  const tr = (text: string) => (ctx.locale === "en" ? (EN_OPTION[text] ?? text) : text);
  return baseAxes(product).map((axis) => ({ name: tr(axis.name), values: axis.values.map(tr) }));
}

function baseAxes(product: DemoProduct): { name: string; values: string[] }[] {
  const top = product.categoryId.split("-")[0];
  if (top === "shoes") {
    return [
      { name: "컬러", values: ["탄", "블랙"] },
      { name: "사이즈", values: ["230", "235", "240", "245", "250"] },
    ];
  }
  if (top === "acc" || top === "bag") return [{ name: "컬러", values: ["브라운", "블랙", "탄"] }];
  return [
    { name: "컬러", values: ["차콜", "오트밀", "카멜"] },
    { name: "사이즈", values: ["S", "M", "L"] },
  ];
}

function cartesian(lists: string[][]): number[][] {
  return lists.reduce<number[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((_, i) => [...prefix, i])),
    [[]],
  );
}

/** 각인 상품(16번)은 직접 입력이 있다 */
function customInputs(product: DemoProduct): DetailInput["customInputs"] {
  if (product.no !== 16) return [];
  return [
    {
      inputId: "in_engrave",
      label: "각인 문구",
      placeholder: "영문 대문자 최대 10자",
      maxLength: 10,
      required: true,
      type: "text",
    },
    {
      inputId: "in_font",
      label: "각인 서체",
      placeholder: null,
      maxLength: 20,
      required: true,
      type: "select",
      options: ["세리프", "산세리프", "필기체"],
    },
    {
      inputId: "in_logo",
      label: "로고 이미지",
      placeholder: null,
      maxLength: 2,
      required: false,
      type: "image",
    },
  ];
}

/** 의류 고시 — 셀러가 정한 값의 예시(데모) */
const WEAR_NOTICE = [
  ["material", "제품 소재", "울 60%, 폴리에스터 40%"],
  ["color", "색상", "차콜, 오트밀, 카멜"],
  ["size", "치수", "S, M, L (상세 실측표 참조)"],
  ["maker", "제조자", "ONDO SEOUL"],
  ["country", "제조국", "대한민국"],
  ["care", "세탁방법 및 취급시 주의사항", "드라이클리닝"],
  ["date", "제조연월", "2026년 10월"],
  ["warranty", "품질보증기준", "관련 법 및 소비자분쟁해결기준에 따름"],
] as const;

export function toDetail(ctx: DemoContext, product: DemoProduct): DetailInput {
  const groups = axes(ctx, product);
  const soldOutAll = isSoldOut(ctx, product);
  const combos = cartesian(groups.map((g) => g.values));
  const card = toCard(ctx, product);
  const top = product.categoryId.split("-")[0];
  const global = ctx.scenario === "global";
  return {
    ...card,
    description:
      ctx.locale === "en"
        ? `<p>Details for ${productName(ctx, product)}. This is demo data — a connected store shows the seller's own description.</p>`
        : `<p>${product.name}의 상세 설명입니다. 데모 데이터라 실제 상점에 연결하면 셀러가 쓴 상세 설명이 보입니다.</p>`,
    images: [1, 2, 3, 4, 5].map(() => demoImageUrl(ctx, product.image)),
    optionGroups: groups.map((group, g) => ({
      groupId: `grp_${g}`,
      name: group.name,
      values: group.values.map((name, v) => ({ valueId: `val_${g}_${v}`, name })),
    })),
    variants: combos.map((combo, index) => {
      // 마지막 사이즈의 첫 컬러는 품절 — 옵션 품절 표시를 보이려는 데모 값
      const lastSize =
        groups.length > 1 && combo[1] === groups[1].values.length - 1 && combo[0] === 0;
      return {
        variantId: `${product.id}_v${index}`,
        variantNo: `${product.no}-${String(index + 1).padStart(2, "0")}`,
        valueIds: combo.map((v, g) => `val_${g}_${v}`),
        name: combo.map((v, g) => groups[g].values[v]).join(" / "),
        // L 사이즈 추가금 — 해외 권역은 3달러(센트 단위)
        additionalPrice:
          groups.length > 1 && combo[1] === 2 && top !== "shoes" ? (global ? 300 : 3000) : 0,
        soldOut: soldOutAll || lastSize,
      };
    }),
    addonGroups: [],
    customInputs: customInputs(product),
    fulfillment: {
      type: "SHIPPING",
      requiresShipping: true,
      shipping: product.freeShipping
        ? {
            deliveryType: "FREE",
            deliveryFee: 0,
            conditionalFreeAmount: null,
            estimatedDays: "평일 14시 이전 주문 당일 출고",
            returnDeliveryFee: 3000,
            exchangeDeliveryFee: 6000,
          }
        : {
            deliveryType: "CONDITIONAL_FREE",
            deliveryFee: 3000,
            conditionalFreeAmount: 50000,
            estimatedDays: "평일 14시 이전 주문 당일 출고",
            returnDeliveryFee: 3000,
            exchangeDeliveryFee: 6000,
          },
      methods: ["CARRIER", "PICKUP"],
    },
    returnPeriodDays: 7,
    purchasePoint: global ? 0 : Math.floor((product.discounted ?? product.sale) * 0.01),
    categoryPath: [],
    notice: {
      schemaId: "WEAR",
      name: "의류",
      fields: WEAR_NOTICE.map(([key, label, value]) => ({ key, label, value })),
    },
    certifications: null,
    infoSections: [
      {
        infoSectionId: "info_return",
        title: "배송·교환·반품 안내",
        body: "<p>상품 수령 후 7일 이내 교환·반품을 신청할 수 있습니다. 단순 변심 반품 배송비는 3,000원입니다.</p>",
      },
    ],
  };
}
