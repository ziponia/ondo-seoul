import { useState } from "react";
import { m } from "../../i18n";

/**
 * 상품 사진 — 데스크톱은 왼쪽 썸네일 줄 + 큰 사진, 모바일은 가로로 미는 사진과 순번.
 * 사진이 없으면 같은 비율 자리에 상품 이름을 크게 둔다.
 */
export function Gallery({
  name,
  images,
  soldOut = false,
}: {
  name: string;
  images: string[];
  soldOut?: boolean;
}) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-end bg-surface p-6 font-black text-3xl leading-tight">
        {name}
      </div>
    );
  }
  return (
    <section aria-label={m.pd_images()} className="md:flex md:gap-3">
      <div className="hidden w-[72px] shrink-0 flex-col gap-2 md:flex">
        {images.map((src, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 주소가 반복될 수 있어 순번이 키다
            key={i}
            type="button"
            aria-label={m.pd_image_n({ n: i + 1 })}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={`aspect-[4/5] overflow-hidden ${i === index ? "outline-2 outline-ink" : ""}`}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="-mx-4 flex snap-x snap-mandatory overflow-x-auto md:mx-0 md:block md:overflow-visible"
          onScroll={(event) => {
            const el = event.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {images.map((src, i) => (
            <img
              // biome-ignore lint/suspicious/noArrayIndexKey: 같은 주소가 반복될 수 있어 순번이 키다
              key={i}
              src={src}
              alt={i === 0 ? name : ""}
              className={`aspect-[4/5] w-full shrink-0 snap-center object-cover md:max-h-[760px] ${
                i === index ? "" : "md:hidden"
              }`}
            />
          ))}
        </div>
        {soldOut ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-page/55 font-black text-[28px]">
            {m.pd_soldout()}
          </span>
        ) : null}
        <span className="absolute right-3 bottom-3 rounded-full bg-ink/60 px-2.5 py-1 font-bold font-display text-caption text-page md:hidden">
          {m.pd_image_count({ n: index + 1, total: images.length })}
        </span>
      </div>
    </section>
  );
}
