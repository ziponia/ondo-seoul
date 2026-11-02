import { describe, expect, it } from "vitest";
import { couponAmount, couponCondition } from "./coupon-text";

describe("적립금 지급 쿠폰 표기", () => {
  it("benefit 근사값이 아니라 reward.benefit의 적립률·최대 적립액을 보인다", () => {
    const coupon = {
      kind: "ORDER" as const,
      // 서버는 확장 혜택 쿠폰의 benefit에 옛 코드용 근사값을 싣는다
      benefit: { type: "AMOUNT" as const, value: 1, maxDiscountAmount: null },
      reward: {
        type: "POINT" as const,
        benefit: { type: "RATE" as const, value: 3, maxDiscountAmount: 5000 },
      },
      minOrderAmount: 0,
      endsAt: null,
      validDaysAfterIssue: null,
    };
    expect(couponAmount(coupon)).toContain("3%");
    expect(couponCondition(coupon)).toContain("5,000");
  });
});
