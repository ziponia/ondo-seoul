import { ensureHistory } from "./data/history";
import { DemoApiError, type DemoContext } from "./http";

/**
 * 데모 회원 상태 — 로그인 토큰마다 메모리에 둔다(쿠폰 받기·찜·배송지 등). 서버를 다시 띄우면 처음으로 돌아간다.
 * 토큰은 로그인마다 새로 만들어 데모 방문자끼리 상태가 섞이지 않는다.
 */
export interface DemoMemberState {
  memberId: string;
  email: string | null;
  name: string;
  phone: string | null;
  joinedAt: string;
  marketingAgreed: boolean;
  hasPassword: boolean;
  identities: { provider: "kakao" | "naver" | "google"; email: string | null; linkedAt: string }[];
  downloadedCoupons: Set<string>;
  usedCoupons: Set<string>;
  wishlist: Set<string>;
  /** 이 회원이 결제를 마친 주문 id */
  orders: string[];
  /** 적립금 잔액 */
  points: number;
  /** 배송지 — 응답 그대로의 모양(`memberAddressSchema`) */
  addresses: DemoAddress[];
  /** 데모 기본 회원 — 처음 열 때 지난 주문·리뷰·문의 기록을 채운다(가입한 회원은 빈 상태로 시작) */
  sample: boolean;
  /** 지난 기록을 채웠는가 */
  seeded: boolean;
  /** 적립금 변동 내역(최신이 앞) */
  pointEntries: {
    entryId: string;
    type: string;
    amount: number;
    balanceAfter: number;
    createdAt: string;
  }[];
  /** 내 상품 문의 */
  productInquiries: DemoProductInquiry[];
  /** 1:1 문의 */
  customerInquiries: DemoCustomerInquiry[];
  extra: Record<string, unknown>;
}

export interface DemoProductInquiry {
  inquiryId: string;
  productId: string;
  category: "PRODUCT" | "DELIVERY" | "RETURN" | "EXCHANGE" | "ETC";
  content: string;
  secret: boolean;
  answer: { content: string; answeredAt: string } | null;
  createdAt: string;
}

export interface DemoCustomerInquiry {
  inquiryId: string;
  category: "DELIVERY" | "RETURN" | "EXCHANGE" | "ETC" | "PAYMENT";
  title: string;
  content: string;
  orderItemId: string | null;
  answer: { content: string; answeredAt: string } | null;
  createdAt: string;
}

export interface DemoAddress {
  addressId: string;
  alias: string;
  isDefault: boolean;
  receiverName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
}

// dev 서버가 모듈을 다시 읽어도 로그인 회원 상태가 남도록 globalThis에 둔다
const holder = globalThis as { __ondoDemoMembers?: Map<string, DemoMemberState> };
if (!holder.__ondoDemoMembers) holder.__ondoDemoMembers = new Map();
const states = holder.__ondoDemoMembers;

export const DEMO_TOKEN_PREFIX = "demo-member-";

function fresh(profile: Partial<DemoMemberState>): DemoMemberState {
  return {
    memberId: `mem_demo_${crypto.randomUUID().slice(0, 8)}`,
    email: "ondo@example.com",
    name: "김온도",
    phone: "01000000000",
    joinedAt: "2026-03-01T03:00:00.000Z",
    marketingAgreed: true,
    hasPassword: true,
    identities: [{ provider: "kakao", email: null, linkedAt: "2026-10-01T03:00:00.000Z" }],
    downloadedCoupons: new Set(["cpn_demo_cart"]),
    usedCoupons: new Set(),
    wishlist: new Set(["prd_demo_4", "prd_demo_6", "prd_demo_10", "prd_demo_2"]),
    orders: [],
    points: 3500,
    sample: true,
    seeded: false,
    pointEntries: [],
    productInquiries: [],
    customerInquiries: [],
    addresses: [
      {
        addressId: "adr_demo_home",
        alias: "집",
        isDefault: true,
        receiverName: "김온도",
        phone: "01000000000",
        zipCode: "04779",
        address1: "서울특별시 성동구 성수이로 00",
        address2: "000동 000호",
      },
      {
        addressId: "adr_demo_jeju",
        alias: "본가",
        isDefault: false,
        receiverName: "김온도",
        phone: "01000000000",
        zipCode: "63122",
        address1: "제주특별자치도 제주시 연동 00",
        address2: null,
      },
    ],
    extra: {},
    ...profile,
  };
}

/** 새 데모 회원 토큰 — 로그인·가입·소셜 로그인 때 만든다 */
export function issueDemoToken(profile: Partial<DemoMemberState> = {}): string {
  const token = `${DEMO_TOKEN_PREFIX}${crypto.randomUUID()}`;
  states.set(token, fresh(profile));
  return token;
}

/** 로그인한 데모 회원의 상태. 로그인하지 않았으면 null */
export function memberState(ctx: DemoContext): DemoMemberState | null {
  const token = ctx.accessToken;
  if (!token?.startsWith(DEMO_TOKEN_PREFIX)) return null;
  let state = states.get(token);
  if (!state) {
    // 서버를 다시 띄워 메모리가 비었으면 같은 토큰으로 기본 회원을 되살린다
    state = fresh({});
    states.set(token, state);
  }
  // dev 서버에서 상태 모양이 바뀐 뒤 남아 있던 옛 회원 — 빠진 필드를 기본값으로 채운다
  const defaults = fresh({});
  for (const key of Object.keys(defaults) as (keyof DemoMemberState)[]) {
    if (state[key] === undefined) Object.assign(state, { [key]: defaults[key] });
  }
  if (ctx.scenario === "empty") state.wishlist.clear();
  ensureHistory(ctx, state);
  return state;
}

/** 회원 전용 API — 로그인하지 않았으면 401 */
export function requireMember(ctx: DemoContext): DemoMemberState {
  const state = memberState(ctx);
  if (!state) throw new DemoApiError(401, "UNAUTHORIZED", "로그인이 필요합니다");
  return state;
}

/** 토큰을 지운다(로그아웃·탈퇴) */
export function dropDemoToken(token: string | null) {
  if (token) states.delete(token);
}
