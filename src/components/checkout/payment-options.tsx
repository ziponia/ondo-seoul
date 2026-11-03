import { type AvailablePaymentOption, paymentOptionKey } from "@sayren/storefront-sdk";
import { CreditCard } from "lucide-react";
import { m } from "../../i18n";

/**
 * 결제수단 — 주문서 응답의 `paymentOptions`만 그린다(상점이 켠 PG·수단). 간편결제·카드·그 밖의 결제로 묶는다.
 * 이름은 응답의 `label`, 간편결제사 로고는 응답의 `logoUrl`(CDN)이다. 로고 이미지를 저장소에 두지 않는다.
 */
export function PaymentOptions({
  options,
  value,
  onChange,
}: {
  options: AvailablePaymentOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  const easy = options.filter((o) => o.method === "EASY_PAY");
  const card = options.filter((o) => o.method === "CARD");
  const other = options.filter((o) => o.method !== "EASY_PAY" && o.method !== "CARD");
  const tile = (option: AvailablePaymentOption, extra = "") => {
    const key = paymentOptionKey(option);
    const selected = key === value;
    return (
      <button
        key={key}
        type="button"
        aria-pressed={selected}
        onClick={() => onChange(key)}
        className={`flex h-[52px] items-center gap-2.5 px-4 font-bold text-body ${extra} ${
          selected ? "border-2 border-ink" : "border border-line-strong"
        }`}
      >
        {option.method === "CARD" ? <CreditCard size={20} strokeWidth={1.6} aria-hidden /> : null}
        <PaymentLogo option={option} />
        {option.label}
      </button>
    );
  };
  const group = (
    label: string,
    items: AvailablePaymentOption[],
    className: string,
    center = false,
  ) =>
    items.length > 0 ? (
      <div className="flex flex-col gap-3 border-line border-t pt-5 first:border-t-0 first:pt-0">
        <h3 className="font-bold text-body">{label}</h3>
        <div className={className}>{items.map((o) => tile(o, center ? "justify-center" : ""))}</div>
      </div>
    ) : null;
  return (
    <section className="bg-page px-4 py-6 md:px-7 md:py-7">
      <h2 className="mb-5 font-black text-lg tracking-[-0.03em] md:text-xl">{m.co_payment()}</h2>
      {options.length === 0 ? (
        <p role="alert" className="text-body text-point">
          {m.co_no_payment()}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {group(m.co_easy_pay(), easy, "grid grid-cols-2 gap-2 md:grid-cols-4")}
          {group(m.co_card(), card, "grid grid-cols-1 gap-2")}
          {group(
            m.co_other_pay(),
            other,
            "grid grid-cols-2 gap-2 md:grid-cols-[repeat(2,220px)]",
            true,
          )}
        </div>
      )}
    </section>
  );
}

/** 간편결제사 로고 — 이름이 옆에 있어 장식 이미지다(alt 비움). CDN이 48px WebP로 줄여 준다 */
export function PaymentLogo({ option }: { option: AvailablePaymentOption }) {
  if (!option.logoUrl) return null;
  return (
    <img
      src={`${option.logoUrl}?w=48&f=webp`}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      className="size-6 shrink-0 rounded-md object-contain"
    />
  );
}
