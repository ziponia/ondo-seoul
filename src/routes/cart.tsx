import type { Cart } from "@sayren/storefront-sdk";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { MobilePageHeader } from "../components/layout/mobile-page-header";
import { ProductGrid } from "../components/listing/product-grid";
import { productParam } from "../components/product/product-card";
import { ProductImage } from "../components/product/product-image";
import { QuantityStepper } from "../components/quantity-stepper";
import { useProducts, useStore } from "../hooks/use-catalog";
import { m } from "../i18n";
import { meQuery } from "../lib/account";
import { cartQuery, createCartCheckout, removeCartItems, updateCartItem } from "../lib/cart";
import { formatMoney } from "../lib/format";
import { productsQuery } from "../lib/queries";

const RECOMMEND = { sort: "recommend", size: 6 } as const;

export const Route = createFileRoute("/cart")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(cartQuery()),
      queryClient.ensureQueryData(productsQuery(RECOMMEND)),
    ]),
  component: CartPage,
});

const REASON = {
  SOLD_OUT: () => m.cart_unpurchasable_SOLD_OUT(),
  SUSPENDED: () => m.cart_unpurchasable_SUSPENDED(),
  CLOSED: () => m.cart_unpurchasable_CLOSED(),
} as const;

function CartPage() {
  const cart = useSuspenseQuery(cartQuery()).data as Cart;
  return (
    <div
      // 회색 바탕은 모바일 화면 아래 끝까지 깐다(상단 바 포함) — 중간에 끊기면 빈 띠가 남는다
      className={`min-h-dvh md:min-h-[60vh] ${cart.items.length === 0 ? "bg-page" : "bg-surface"}`}
    >
      <MobilePageHeader title={m.cart_title({ count: cart.items.length })} icons={false} center />
      <div className="hidden border-line border-b bg-page md:block">
        <ol
          aria-label={m.cart_steps()}
          className="mx-auto flex max-w-page justify-end gap-5 px-6 py-3 text-body text-faint"
        >
          <li aria-current="step" className="font-bold text-ink">
            {m.cart_step_cart()}
          </li>
          <li>{m.cart_step_checkout()}</li>
          <li>{m.cart_step_done()}</li>
        </ol>
      </div>
      {cart.items.length === 0 ? <EmptyCart /> : <CartBody cart={cart} />}
    </div>
  );
}

function CartBody({ cart }: { cart: Cart }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const purchasableIds = cart.items.filter((i) => i.purchasable).map((i) => i.cartItemId);
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const selected = purchasableIds.filter((id) => !unchecked.has(id));
  const setCart = (next: Cart) => queryClient.setQueryData(cartQuery().queryKey, next);
  const update = useMutation({
    mutationFn: (input: { cartItemId: string; quantity: number }) =>
      updateCartItem({ data: input }),
    onSuccess: setCart,
  });
  const remove = useMutation({
    mutationFn: (cartItemIds: string[]) => removeCartItems({ data: { cartItemIds } }),
    onSuccess: setCart,
  });
  const store = useStore();
  const order = useMutation({
    mutationFn: async () => {
      // 비회원 주문을 받지 않는 상점은 로그인 뒤 장바구니로 돌아온다(장바구니는 로그인 때 합쳐진다)
      if (!store.guestCheckout && !(await queryClient.ensureQueryData(meQuery()))) {
        await navigate({ to: "/login", search: { redirect: "/cart" } });
        return;
      }
      const { checkoutId } = await createCartCheckout({ data: { cartItemIds: selected } });
      await navigate({
        to: "/checkout/$checkoutId",
        params: { checkoutId },
        search: { items: selected.join(",") },
      });
    },
  });
  const toggle = (id: string) => {
    const next = new Set(unchecked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setUnchecked(next);
  };
  const allOn = selected.length === purchasableIds.length && purchasableIds.length > 0;
  const { summary } = cart;
  return (
    <main className="mx-auto flex max-w-page flex-col gap-2 pb-28 md:flex-row md:items-start md:gap-6 md:px-6 md:pt-8 md:pb-24">
      <section aria-labelledby="cart-h" className="min-w-0 flex-1 bg-page px-4 md:p-7">
        <div className="flex items-center justify-between border-line border-b py-3 md:mb-2 md:border-0 md:py-0">
          <h1 id="cart-h" className="hidden font-black text-2xl tracking-[-0.03em] md:block">
            {m.cart_title({ count: cart.items.length })}
          </h1>
          <div className="flex w-full items-center justify-between gap-4 text-body md:w-auto">
            <label className="flex items-center gap-2 font-bold md:font-normal">
              <input
                type="checkbox"
                checked={allOn}
                onChange={() => setUnchecked(allOn ? new Set(purchasableIds) : new Set())}
                className="h-5 w-5 accent-ink"
              />
              {m.cart_select_all()}
            </label>
            <button
              type="button"
              disabled={selected.length === 0 || remove.isPending}
              onClick={() => remove.mutate(selected)}
              className="h-9 px-3 text-meta text-sub md:border md:border-line-strong"
            >
              {m.cart_remove_selected()}
            </button>
          </div>
        </div>
        {cart.items.map((item) => (
          <div
            key={item.cartItemId}
            className="flex gap-3 border-line border-b py-4 md:gap-4 md:border-t md:border-b-0 md:py-5"
          >
            <label className="pt-0.5">
              <span className="sr-only">{m.cart_select_item({ name: item.productName })}</span>
              <input
                type="checkbox"
                disabled={!item.purchasable}
                checked={item.purchasable && !unchecked.has(item.cartItemId)}
                onChange={() => toggle(item.cartItemId)}
                className="h-5 w-5 accent-ink"
              />
            </label>
            <Link
              to="/p/$productNo"
              params={{
                productNo: productParam({ productNo: item.productNo, productId: item.productId }),
              }}
              className="w-[76px] shrink-0 md:w-[88px]"
            >
              <ProductImage product={{ name: item.productName, thumbnailUrl: item.thumbnailUrl }} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-body md:text-body-lg">{item.productName}</span>
                <button
                  type="button"
                  aria-label={m.cart_remove({ name: item.productName })}
                  onClick={() => remove.mutate([item.cartItemId])}
                  className="-mt-2.5 -mr-2.5 grid h-10 w-10 shrink-0 place-items-center text-sub"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
              {item.optionName ? (
                <span className="text-meta text-muted">{item.optionName}</span>
              ) : null}
              {item.purchasable ? null : (
                <span className="font-bold text-meta text-point">
                  {item.unpurchasableReason ? REASON[item.unpurchasableReason]() : ""}
                </span>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                <QuantityStepper
                  value={item.quantity}
                  disabled={update.isPending}
                  onChange={(quantity) => update.mutate({ cartItemId: item.cartItemId, quantity })}
                />
                <strong className="tabular font-black text-[17px]">
                  {formatMoney(item.totalPrice, item.currency)}
                </strong>
              </div>
            </div>
          </div>
        ))}
      </section>
      <aside
        aria-labelledby="sum-h"
        className="flex flex-col gap-3.5 bg-page px-4 py-5 md:sticky md:top-6 md:w-[380px] md:shrink-0 md:p-7"
      >
        <h2 id="sum-h" className="sr-only font-black text-xl tracking-[-0.03em] md:not-sr-only">
          {m.cart_summary()}
        </h2>
        <dl className="flex flex-col gap-3 text-body">
          <div className="flex justify-between">
            <dt className="text-sub">{m.cart_product_amount()}</dt>
            <dd className="tabular">{formatMoney(summary.productAmount, summary.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sub">{m.cart_delivery_fee()}</dt>
            <dd className="tabular">
              {summary.deliveryFee === 0
                ? m.cart_free()
                : formatMoney(summary.deliveryFee, summary.currency)}
            </dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between border-ink border-t pt-4">
          <span className="font-bold text-body-lg">{m.cart_total()}</span>
          <span className="tabular font-black text-xl tracking-[-0.03em] md:text-[28px]">
            {formatMoney(summary.totalAmount, summary.currency)}
          </span>
        </div>
        <span className="text-meta text-sub">{m.cart_note()}</span>
        {order.isError ? (
          <p role="alert" className="text-meta text-point">
            {m.cart_order_failed()}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:border-0 md:p-0">
          <button
            type="button"
            disabled={selected.length === 0 || order.isPending}
            onClick={() => order.mutate()}
            className="h-14 w-full bg-ink font-bold text-base text-page disabled:bg-disabled md:h-15 md:text-[17px]"
          >
            <span className="md:hidden">
              {m.cart_order_count({
                amount: formatMoney(summary.totalAmount, summary.currency),
                count: cart.items
                  .filter((i) => selected.includes(i.cartItemId))
                  .reduce((sum, i) => sum + i.quantity, 0),
              })}
            </span>
            <span className="hidden md:inline">{m.cart_order()}</span>
          </button>
        </div>
      </aside>
    </main>
  );
}

function EmptyCart() {
  const recommend = useProducts(RECOMMEND).contents;
  return (
    <main className="mx-auto max-w-page bg-page px-4 pb-24 md:px-6">
      <section className="flex flex-col items-center gap-3.5 border-line border-b pt-24 pb-18 text-center">
        <ShoppingBag size={56} strokeWidth={1.2} aria-hidden />
        <h1 className="font-black text-[26px] tracking-[-0.04em]">{m.cart_empty_title()}</h1>
        <p className="text-body-lg text-sub">{m.cart_empty_body()}</p>
        <div className="mt-3 flex gap-2">
          <Link
            to="/"
            className="grid h-13 place-items-center bg-ink px-7 font-bold text-body-lg text-page"
          >
            {m.cart_go_shop()}
          </Link>
          <Link
            to="/my/wishlist"
            className="grid h-13 place-items-center border border-ink px-7 font-bold text-body-lg"
          >
            {m.cart_go_wish()}
          </Link>
        </div>
      </section>
      {recommend.length > 0 ? (
        <section aria-labelledby="rec-h" className="pt-12">
          <h2 id="rec-h" className="mb-5 font-black text-[22px] tracking-[-0.03em]">
            {m.cart_recommend()}
          </h2>
          <ProductGrid products={recommend} columns={6} />
        </section>
      ) : null}
    </main>
  );
}
