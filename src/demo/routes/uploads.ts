import { type DemoRoute, route } from "../http";
import { requireMember } from "../member-state";

/** 데모 업로드 — 실제 저장 없이 자리표시 이미지 주소를 돌려준다(`/api/demo-upload`가 PUT을 받기만 한다) */
function ticket(origin: string) {
  const id = crypto.randomUUID();
  return {
    url: `${origin}/demo/uploads/placeholder.svg?u=${id}`,
    uploadUrl: `${origin}/api/demo-upload?u=${id}`,
  };
}

export const uploadRoutes: DemoRoute[] = [
  route("POST", "/uploads/order-inputs", ({ ctx }) => ticket(ctx.origin)),
  route("POST", "/me/uploads", ({ ctx }) => {
    requireMember(ctx);
    return ticket(ctx.origin);
  }),
];
