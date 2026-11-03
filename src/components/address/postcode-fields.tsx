import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { m } from "../../i18n";
import { addressLineOf, loadPostcode } from "../../lib/postcode";

export interface PostcodeValue {
  zipCode: string;
  address1: string;
  address2: string;
}

/**
 * 국내 배송지의 우편번호·주소·상세 주소 칸 — 우편번호와 주소는 카카오 우편번호 검색으로만 채우고,
 * 고르면 상세 주소 칸으로 넘어간다. 주문서 새 배송지와 내 정보 › 배송지가 같이 쓴다.
 */
export function PostcodeFields({
  value,
  onChange,
  inputClassName,
  wideClassName = "",
}: {
  value: PostcodeValue;
  onChange: (next: PostcodeValue) => void;
  inputClassName: string;
  /** 주소·상세 주소 칸에 붙인다(격자 폼에서 두 칸을 차지하게) */
  wideClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const detail = useRef<HTMLInputElement>(null);
  const label = "flex flex-col gap-1.5 font-bold text-meta";
  return (
    <>
      <label className={label}>
        {m.co_address_zip()}
        <span className="flex gap-2">
          <input
            required
            readOnly
            value={value.zipCode}
            onClick={() => setOpen(true)}
            className={`${inputClassName} flex-1 bg-surface/60`}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 shrink-0 items-center gap-1.5 bg-ink px-4 font-bold text-body text-page"
          >
            <Search size={15} aria-hidden />
            {m.addr_search()}
          </button>
        </span>
      </label>
      <label className={`${label} ${wideClassName}`}>
        {m.co_address_1()}
        <input
          required
          readOnly
          value={value.address1}
          onClick={() => setOpen(true)}
          className={`${inputClassName} bg-surface/60`}
        />
      </label>
      <label className={`${label} ${wideClassName}`}>
        {m.co_address_2()}
        <input
          ref={detail}
          value={value.address2}
          onChange={(event) => onChange({ ...value, address2: event.target.value })}
          className={inputClassName}
        />
      </label>
      {open ? (
        <PostcodeDialog
          onClose={() => setOpen(false)}
          onPick={(zipCode, address1) => {
            onChange({ ...value, zipCode, address1 });
            setOpen(false);
            // 대화상자가 닫힌 뒤 상세 주소 칸으로 옮긴다
            requestAnimationFrame(() => detail.current?.focus());
          }}
        />
      ) : null}
    </>
  );
}

function PostcodeDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (zipCode: string, address1: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    let alive = true;
    loadPostcode()
      .then((daum) => {
        if (!alive || !host.current) return;
        new daum.Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (data) => pick.current(data.zonecode, addressLineOf(data)),
        }).embed(host.current, { autoClose: false });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 md:items-center md:p-6">
      <button
        type="button"
        aria-label={m.co_close()}
        onClick={onClose}
        className="absolute inset-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="postcode-h"
        className="relative flex h-[85dvh] w-full flex-col bg-page md:h-[600px] md:max-w-[500px]"
      >
        <div className="flex items-center justify-between border-line border-b px-5 py-4">
          <h2 id="postcode-h" className="font-black text-lg tracking-[-0.03em]">
            {m.addr_search()}
          </h2>
          <button
            type="button"
            aria-label={m.co_close()}
            onClick={onClose}
            className="-mr-2.5 grid h-11 w-11 place-items-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {failed ? (
          <p role="alert" className="px-5 py-10 text-center text-body text-point">
            {m.addr_search_failed()}
          </p>
        ) : (
          <div ref={host} className="min-h-0 flex-1" />
        )}
      </section>
    </div>
  );
}
