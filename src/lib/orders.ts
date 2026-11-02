import { ApiError } from "@sayren/storefront-sdk";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buyerApi, readSession } from "./session.server";

/** 내 주문 — 로그인 회원의 주문 상세. 없거나 남의 주문이면 null */
const getMyOrder = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!readSession()) return { kind: "login" as const };
    try {
      return { kind: "ok" as const, order: await buyerApi().myOrders.get(data.orderId) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return { kind: "missing" as const };
      if (error instanceof ApiError && error.status === 401) return { kind: "login" as const };
      throw error;
    }
  });

export const myOrderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["my-order", orderId],
    queryFn: () => getMyOrder({ data: { orderId } }),
  });
