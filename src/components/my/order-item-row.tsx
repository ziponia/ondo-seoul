import type { MyOrderItem } from "@sayren/storefront-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { m } from "../../i18n";
import { formatMoney } from "../../lib/format";
import { decidePurchase } from "../../lib/my";
import { ProductImage } from "../product/product-image";

/**
 * 주문상품 한 줄 — 상태 이름은 응답의 `step.label`(없으면 상태 값의 이름), 버튼은 응답이 허락한 것만 그린다.
 * `step.claimable`(취소·반품·교환), 배송 정보(`step.data.delivery`), 리뷰 쓰기(`reviewWritable`), 배송 완료의 구매 확정.
 */

export type ItemPanel = "track" | "claim" | "cancel";

const STATUS_LABEL: Record<string, () => string> = {
  PAID: m.my_status_PAID,
  CONFIRMED: m.my_status_CONFIRMED,
  DISPATCHED: m.my_status_DELIVERING,
  DELIVERING: m.my_status_DELIVERING,
  DELIVERED: m.my_status_DELIVERED,
  PURCHASE_DECIDED: m.my_status_PURCHASE_DECIDED,
  CANCELED: m.my_status_CANCELED,
};

export function itemStatusLabel(item: MyOrderItem): string {
  return item.step?.label ?? STATUS_LABEL[item.status]?.() ?? item.status;
}

/** 배송 중은 파랑, 끝난 상태(구매 확정·취소)는 흐리게 */
export function itemStatusTone(item: MyOrderItem): string {
  const type = item.step?.type;
  if (type === "IN_DELIVERY" || type === "CLAIM_IN_PROGRESS") return "text-info";
  if (type === "COMPLETED" || type === "CANCELED") return "text-muted";
  return "text-ink";
}

type Action =
  | { kind: "link"; label: string; primary: boolean; panel: ItemPanel }
  | { kind: "review"; label: string; primary: boolean }
  | { kind: "reviews"; label: string }
  | { kind: "product"; label: string }
  | { kind: "decide"; label: string };

export function itemActions(item: MyOrderItem): Action[] {
  const claimable = item.step?.claimable.map((c) => c.action) ?? [];
  const actions: Action[] = [];
  if (item.step?.type === "IN_DELIVERY" && item.step.data?.delivery) {
    actions.push({ kind: "link", label: m.my_act_track(), primary: true, panel: "track" });
  }
  if (item.status === "DELIVERED" && !item.claimStatus) {
    actions.push({ kind: "decide", label: m.my_act_decide() });
  }
  // 배송 완료 줄은 구매 확정을 먼저 권한다 — 리뷰는 작성 가능한 리뷰 목록에서도 쓸 수 있다
  if (item.reviewWritable && item.status !== "DELIVERED")
    actions.push({ kind: "review", label: m.my_act_review(), primary: true });
  if (claimable.includes("RETURN_REQUEST") || claimable.includes("EXCHANGE_REQUEST")) {
    actions.push({ kind: "link", label: m.my_act_claim(), primary: false, panel: "claim" });
  }
  if (claimable.includes("CANCEL") || claimable.includes("CANCEL_REQUEST")) {
    actions.push({ kind: "link", label: m.my_act_cancel(), primary: false, panel: "cancel" });
  }
  if (item.reviewWritten) actions.push({ kind: "reviews", label: m.my_act_review_view() });
  if (item.status === "CANCELED" && !item.claimStatus?.match(/REQUESTED|COLLECTING/)) {
    actions.push({ kind: "product", label: m.my_act_product() });
  }
  return actions;
}

const button =
  "grid h-11 flex-1 place-items-center px-4 font-bold text-body whitespace-nowrap md:h-[38px] md:min-w-[132px] md:flex-none md:text-meta";
const primary = `${button} bg-ink text-page`;
const secondary = `${button} border border-line-strong bg-page`;

export function ItemActions({
  orderId,
  item,
  onPanel,
}: {
  orderId: string;
  item: MyOrderItem;
  /** 주문 상세 — 링크 대신 이 화면의 창을 연다 */
  onPanel?: (panel: ItemPanel) => void;
}) {
  const queryClient = useQueryClient();
  const decide = useMutation({
    mutationFn: () => decidePurchase({ data: { orderItemId: item.orderItemId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my"] }),
  });
  return (
    <>
      {itemActions(item).map((action) => {
        switch (action.kind) {
          case "link":
            if (onPanel) {
              // 주문 상세에서는 배송 조회가 이미 위에 있다
              if (action.panel === "track") return null;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onPanel(action.panel)}
                  className={action.primary ? primary : secondary}
                >
                  {action.panel === "claim" ? m.claim_title_claim() : action.label}
                </button>
              );
            }
            return (
              <Link
                key={action.label}
                to="/my/orders/$orderId"
                params={{ orderId }}
                search={{ item: item.orderItemId, panel: action.panel }}
                className={action.primary ? primary : secondary}
              >
                {action.label}
              </Link>
            );
          case "decide":
            return (
              <button
                key={action.label}
                type="button"
                disabled={decide.isPending}
                onClick={() => decide.mutate()}
                className={primary}
              >
                {action.label}
              </button>
            );
          case "review":
            return (
              <Link
                key={action.label}
                to="/my/reviews/write/$orderItemId"
                params={{ orderItemId: item.orderItemId }}
                className={action.primary ? primary : secondary}
              >
                {action.label}
              </Link>
            );
          case "reviews":
            return (
              <Link
                key={action.label}
                to="/my/reviews"
                search={{ tab: "mine" }}
                className={secondary}
              >
                {action.label}
              </Link>
            );
          case "product":
            return (
              <Link
                key={action.label}
                to="/p/$productNo"
                params={{ productNo: item.productId }}
                className={secondary}
              >
                {action.label}
              </Link>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

/** 주문상품 줄 — 사진, 상태, 이름, 옵션·수량·금액, 버튼(데스크톱 오른쪽, 모바일 아래) */
export function OrderItemRow({
  orderId,
  item,
  actions = true,
  onPanel,
}: {
  orderId: string;
  item: MyOrderItem;
  actions?: boolean;
  onPanel?: (panel: ItemPanel) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="w-[72px] shrink-0">
          <ProductImage product={{ name: item.productName, thumbnailUrl: item.thumbnailUrl }} />
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <span className={`font-bold text-meta ${itemStatusTone(item)}`}>
            {itemStatusLabel(item)}
          </span>
          <span className="truncate text-body-lg">{item.productName}</span>
          <span className="text-meta text-muted">
            {m.my_item_meta({
              option: item.optionName ? `${item.optionName} · ` : "",
              qty: item.quantity,
              price: formatMoney(item.totalPrice),
            })}
          </span>
        </div>
      </div>
      {actions ? (
        <div className="flex gap-2 empty:hidden md:flex-col">
          <ItemActions orderId={orderId} item={item} onPanel={onPanel} />
        </div>
      ) : null}
    </div>
  );
}
