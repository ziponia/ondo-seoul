import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { m } from "../../i18n";
import { meQuery } from "../../lib/account";
import { toggleWishlist, wishlistQuery } from "../../lib/my";

/**
 * 찜 버튼 — 찜 여부는 내 찜 목록 응답(`member.listWishlist`)으로 판단하고, 누르면 넣기·빼기를 부른다.
 * 로그인하지 않았으면 로그인 화면으로 보낸다(로그인 뒤 이 화면으로 돌아온다).
 */
export function WishButton({
  productId,
  className,
  size = 22,
  tone = "line",
}: {
  productId: string;
  className: string;
  size?: number;
  /** `line` 테두리 하트(구매 영역), `overlay` 사진 위 빨간 하트(찜 목록) */
  tone?: "line" | "overlay";
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useQuery(meQuery()).data;
  const wishlist = useQuery({ ...wishlistQuery(), enabled: Boolean(me) }).data;
  const on = wishlist?.contents.some((p) => p.productId === productId) ?? false;
  const toggle = useMutation({
    mutationFn: () => toggleWishlist({ data: { productId, on: !on } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my"] }),
  });
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? m.pd_wish_remove() : m.pd_wish()}
      disabled={toggle.isPending}
      onClick={() => {
        if (!me) {
          void navigate({ to: "/login", search: { redirect: location.href } });
          return;
        }
        toggle.mutate();
      }}
      className={className}
    >
      <Heart
        size={size}
        strokeWidth={1.8}
        aria-hidden
        className={on ? "fill-point text-point" : tone === "overlay" ? "text-page" : undefined}
      />
    </button>
  );
}
