import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { MySubPage } from "../../components/my/my-sub-page";
import { WishButton } from "../../components/my/wish-button";
import { ProductCard } from "../../components/product/product-card";
import { m } from "../../i18n";
import { wishlistQuery } from "../../lib/my";
import { productsQuery } from "../../lib/queries";

/**
 * 찜 — `member.listWishlist` 응답의 상품 카드와 찜 해제 하트. 비어 있으면 랭킹으로 보내고 새로 들어온 상품을 보인다.
 * 모바일 하단 탭의 「찜」 화면이라 탭을 숨기지 않는다.
 */
export const Route = createFileRoute("/my/wishlist")({
  staticData: { mobileHeader: "page" },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(wishlistQuery()),
  head: () => ({ meta: [{ title: m.my_menu_wish() }] }),
  component: Wishlist,
});

const NEW_SEARCH = { sort: "latest", size: 5 } as const;

function Wishlist() {
  const wishlist = useSuspenseQuery(wishlistQuery()).data;
  const empty = wishlist.contents.length === 0;
  const fresh = useQuery({ ...productsQuery(NEW_SEARCH), enabled: empty }).data?.contents ?? [];
  const title = m.wl_title({ count: wishlist.totalElements });
  return (
    <MySubPage title={title} width="max-w-page" mobileBack={false}>
      {empty ? (
        <>
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center md:py-20">
            <Heart size={40} strokeWidth={1.6} aria-hidden />
            <h2 className="font-black text-[22px] tracking-[-0.03em]">{m.wl_empty_title()}</h2>
            <p className="text-body text-sub">{m.wl_empty_body()}</p>
            <Link
              to="/"
              className="mt-4 grid h-[52px] place-items-center bg-ink px-7 font-bold text-body-lg text-page"
            >
              {m.wl_ranking()}
            </Link>
          </div>
          {fresh.length > 0 ? (
            <section className="border-line border-t px-4 pt-10 md:px-0 md:pt-14">
              <h2 className="mb-5 font-black text-xl tracking-[-0.03em] md:text-2xl">
                {m.wl_new()}
              </h2>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-6 md:gap-x-3.5">
                {fresh.map((product) => (
                  <li key={product.productId}>
                    <ProductCard product={product} compact />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-8 px-4 pt-4 md:grid-cols-5 md:gap-x-4 md:px-0 md:pt-0">
          {wishlist.contents.map((product) => (
            <li key={product.productId} className="relative">
              <ProductCard product={product} />
              {/* 사진(4:5) 오른쪽 아래 — 사진과 같은 비율의 겹침 칸 안에 둔다 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
                <WishButton
                  productId={product.productId}
                  tone="overlay"
                  size={20}
                  className="pointer-events-auto absolute right-1 bottom-1 grid h-10 w-10 place-items-center"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </MySubPage>
  );
}
