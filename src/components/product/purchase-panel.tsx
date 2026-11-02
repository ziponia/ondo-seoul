import {
  BASE_CURRENCY,
  deliveryNoticeOf,
  optionChoicesOf,
  type ProductCouponBenefit,
  type ProductDetail,
  priceViewOf,
  type StorefrontPointPolicy,
} from "@sayren/storefront-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useStore } from "../../hooks/use-catalog";
import { m } from "../../i18n";
import { meQuery } from "../../lib/account";
import { addToCart, cartQuery, createDirectCheckout } from "../../lib/cart";
import { formatMoney } from "../../lib/format";
import { WishButton } from "../my/wish-button";
import { CustomInputs, missingRequired } from "./custom-inputs";
import { OptionPicker } from "./option-picker";
import { Price } from "./price";

function deliveryText(product: ProductDetail): string {
  const notice = deliveryNoticeOf(product.fulfillment);
  const days =
    "estimatedDays" in notice && notice.estimatedDays ? ` · ${notice.estimatedDays}` : "";
  switch (notice.kind) {
    case "FREE":
      return m.pd_delivery_free() + days;
    case "PAID":
      return m.pd_delivery_paid({ fee: formatMoney(notice.fee) }) + days;
    case "CONDITIONAL_FREE":
      return (
        m.pd_delivery_conditional({
          fee: formatMoney(notice.fee),
          over: formatMoney(notice.freeOver),
        }) + days
      );
    case "NO_SHIPPING":
      return m.pd_delivery_none();
    default:
      return m.pd_delivery_unknown();
  }
}

/**
 * 구매 영역 — 이름·별점·가격·쿠폰 적용가·적립·배송·교환, 옵션, 수량, 담기·바로 구매.
 * 가격·옵션 상태·배송 문구는 SDK 판정 함수(`priceViewOf`·`optionChoicesOf`·`deliveryNoticeOf`) 결과다.
 */
export function PurchasePanel({
  product,
  benefit,
  policy,
}: {
  product: ProductDetail;
  benefit: ProductCouponBenefit | null;
  policy: StorefrontPointPolicy | null;
}) {
  const store = useStore();
  const queryClient = useQueryClient();
  // 처음에는 살 수 있는 첫 조합을 골라 둔다(시안) — 모두 품절이면 고르지 않는다
  const [chosen, setChosen] = useState<(string | null)[]>(
    () =>
      product.variants.find((variant) => !variant.soldOut)?.valueIds ??
      product.optionGroups.map(() => null),
  );
  const [quantity, setQuantity] = useState(1);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const { variant } = optionChoicesOf(product, chosen);
  const allSoldOut = product.soldOut || product.variants.every((v) => v.soldOut);
  // 기본 통화(원화)가 아닌 권역 — 해외 구매자
  const overseas = product.currency !== BASE_CURRENCY;
  const marketName = store.markets.find((mk) => mk.marketId === store.market?.marketId)?.name;
  const canOrder = store.checkoutAvailable && product.availableInMarket && !allSoldOut;
  const missing = missingRequired(product.customInputs, inputs);
  const ready = canOrder && variant !== null && !variant.soldOut && !missing;
  const unit = priceViewOf(product).price + (variant?.additionalPrice ?? 0);
  const line = () => ({
    productId: product.productId,
    optionId: variant?.variantId,
    quantity,
    customInputs: Object.entries(inputs)
      .filter(([, value]) => value.trim())
      .map(([inputId, value]) => ({ inputId, value })),
  });
  const add = useMutation({
    mutationFn: () => addToCart({ data: line() }),
    onSuccess: (cart) => queryClient.setQueryData(cartQuery().queryKey, cart),
  });
  const navigate = useNavigate();
  const location = useLocation();
  /** 바로 구매 — 장바구니를 거치지 않고 주문서를 만들고 이동한다. 비회원 주문을 받지 않으면 로그인부터 */
  const buyNow = useMutation({
    mutationFn: async () => {
      if (!store.guestCheckout && !(await queryClient.ensureQueryData(meQuery()))) {
        await navigate({ to: "/login", search: { redirect: location.href } });
        return;
      }
      const { checkoutId } = await createDirectCheckout({ data: line() });
      await navigate({ to: "/checkout/$checkoutId", params: { checkoutId } });
    },
  });
  const buy = (
    <>
      <OptionPicker product={product} chosen={chosen} onChange={setChosen} />
      <CustomInputs inputs={product.customInputs} values={inputs} onChange={setInputs} />
      {variant && !allSoldOut ? (
        <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3.5">
          <span className="min-w-0 flex-1 truncate text-body">{variant.name || product.name}</span>
          <div className="flex items-center border border-line-strong bg-page">
            <button
              type="button"
              aria-label={m.pd_qty_dec()}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="grid h-9 w-9 place-items-center"
            >
              <Minus size={14} aria-hidden />
            </button>
            <span aria-live="polite" className="tabular w-8 text-center font-bold text-body">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={m.pd_qty_inc()}
              onClick={() => setQuantity(Math.min(999, quantity + 1))}
              className="grid h-9 w-9 place-items-center"
            >
              <Plus size={14} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
      {variant && !allSoldOut ? (
        <div className="flex items-baseline justify-between border-ink border-t pt-4">
          <span className="font-bold text-body-lg">{m.pd_total()}</span>
          <span className="tabular font-black text-[26px]">
            {formatMoney(unit * quantity, product.currency)}
          </span>
        </div>
      ) : null}
      {store.checkoutAvailable ? (
        <div className="grid grid-cols-[56px_1fr_1fr] gap-2">
          <WishButton
            productId={product.productId}
            className="grid h-14 place-items-center border border-line-strong"
          />
          {allSoldOut ? (
            <button
              type="button"
              disabled
              className="col-span-2 h-14 bg-disabled font-bold text-base text-page"
            >
              {m.pd_soldout()}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!ready || add.isPending}
                onClick={() => add.mutate()}
                className="h-14 border border-ink font-bold text-base disabled:border-line-strong disabled:text-faint"
              >
                {m.pd_cart()}
              </button>
              <button
                type="button"
                disabled={!ready || buyNow.isPending}
                onClick={() => buyNow.mutate()}
                className="h-14 bg-ink font-bold text-base text-page disabled:bg-disabled"
              >
                {m.pd_buy()}
              </button>
            </>
          )}
        </div>
      ) : null}
      {missing ? (
        <p role="status" className="text-meta text-point">
          {m.ci_required_missing({ label: missing.label })}
        </p>
      ) : variant === null && !allSoldOut && canOrder ? (
        <p className="text-meta text-muted">{m.pd_option_choose()}</p>
      ) : null}
      {add.isSuccess ? (
        <p
          role="status"
          className="flex items-center justify-between bg-ink px-4 py-3 text-body text-page"
        >
          {m.pd_added()}
          <Link to="/cart" className="font-bold underline underline-offset-4">
            {m.pd_go_cart()}
          </Link>
        </p>
      ) : null}
      {add.isError ? (
        <p role="alert" className="text-meta text-point">
          {m.pd_add_failed()}
        </p>
      ) : null}
    </>
  );
  return (
    <section aria-label={m.pd_purchase()} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h1 className="font-bold text-[22px] leading-[1.4] tracking-[-0.03em] md:text-2xl">
          {product.name}
        </h1>
        {product.reviewCount > 0 ? (
          <a href="#reviews" className="flex items-center gap-1.5 text-body">
            <span aria-hidden>★</span>
            <strong>{product.averageRating.toFixed(1)}</strong>
            <span className="text-sub underline">
              {m.pd_reviews_link({ count: product.reviewCount.toLocaleString("ko-KR") })}
            </span>
          </a>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 border-line border-b pb-5">
        <Price product={product} size="detail" strike muted={allSoldOut} />
        {overseas ? (
          <p className="text-meta text-sub">{m.pd_prices_in({ currency: product.currency })}</p>
        ) : null}
        {benefit && benefit.maxDiscountAmount > 0 && !allSoldOut ? (
          <div className="flex flex-col gap-1.5 bg-surface px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-body">
                {m.pd_coupon_price()}{" "}
                <span className="font-black text-lg text-point">
                  {formatMoney(benefit.priceAfterDiscount, benefit.currency)}
                </span>
              </span>
              {benefit.coupons.some((coupon) => coupon.needsDownload) ? (
                <Link
                  to={benefit.loginRequired ? "/login" : "/coupons"}
                  search={benefit.loginRequired ? { redirect: "/coupons" } : undefined}
                  className="grid h-8 place-items-center bg-ink px-3 font-bold text-caption text-page"
                >
                  {m.pd_coupon_take()}
                </Link>
              ) : null}
            </div>
            <span className="text-meta text-sub">
              {benefit.coupons
                .map((coupon) =>
                  m.pd_coupon_line({
                    name: coupon.name,
                    amount: formatMoney(coupon.discountAmount, benefit.currency),
                  }),
                )
                .join(" · ")}
            </span>
          </div>
        ) : null}
      </div>
      <dl
        className={`grid-cols-[88px_1fr] gap-x-3 gap-y-2.5 text-body ${allSoldOut ? "hidden" : "grid"}`}
      >
        {product.purchasePoint ? (
          <>
            <dt className="text-muted">{m.pd_points()}</dt>
            <dd>
              {m.pd_points_value({ amount: formatMoney(product.purchasePoint) })}
              {policy?.reviewReward.enabled ? ` · ${m.pd_points_review()}` : ""}
            </dd>
          </>
        ) : null}
        {overseas ? (
          <>
            {/* 해외 권역 — 배송비는 배송 국가로 주문서에서 정해진다(상품의 국내 배송비 정책을 보이지 않는다) */}
            <dt className="text-muted">{m.pd_shipping_label()}</dt>
            <dd>{m.pd_shipping_calc()}</dd>
            {marketName ? (
              <>
                <dt className="text-muted">{m.pd_ships_to()}</dt>
                <dd>{marketName}</dd>
              </>
            ) : null}
          </>
        ) : (
          <>
            <dt className="text-muted">{m.pd_delivery()}</dt>
            <dd>{deliveryText(product)}</dd>
          </>
        )}
        <dt className="text-muted">{m.pd_return()}</dt>
        <dd>{m.pd_return_days({ days: product.returnPeriodDays })}</dd>
      </dl>
      {allSoldOut ? (
        <div className="flex flex-col gap-1.5 bg-surface px-5 py-4">
          <strong className="text-body-lg">{m.pd_all_soldout()}</strong>
          <span className="text-meta text-sub">{m.pd_all_soldout_hint()}</span>
        </div>
      ) : null}{" "}
      <div className="hidden flex-col gap-5 md:flex">{buy}</div>
      {store.checkoutAvailable ? (
        <MobileBuyBar
          open={sheetOpen}
          onOpen={() => setSheetOpen(true)}
          onClose={() => setSheetOpen(false)}
          soldOut={allSoldOut}
          productId={product.productId}
        >
          {buy}
        </MobileBuyBar>
      ) : null}
    </section>
  );
}

/**
 * 모바일 구매 — 화면 아래 고정 바(찜·구매하기)와 옵션 바텀시트. 데스크톱은 구매 영역을 그 자리에 그린다.
 */
function MobileBuyBar({
  open,
  onOpen,
  onClose,
  soldOut,
  productId,
  children,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  soldOut: boolean;
  productId: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-[52px_1fr] gap-2 border-line border-t bg-page px-3 pt-2.5 pb-3.5 md:hidden">
        <WishButton
          productId={productId}
          className="grid h-13 place-items-center border border-line-strong"
        />
        <button
          type="button"
          disabled={soldOut}
          onClick={onOpen}
          className="h-13 bg-ink font-bold text-base text-page disabled:bg-disabled"
        >
          {soldOut ? m.pd_soldout() : m.pd_open_sheet()}
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/55 md:hidden">
          <button
            type="button"
            aria-label={m.pd_sheet_close()}
            onClick={onClose}
            className="absolute inset-0"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={m.pd_sheet()}
            className="relative flex max-h-[85vh] w-full flex-col gap-5 overflow-y-auto bg-page px-4 pt-3 pb-5"
          >
            <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line-strong" />
            {children}
          </section>
        </div>
      ) : null}
    </>
  );
}
