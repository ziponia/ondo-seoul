import type { MemberAddress } from "@sayren/storefront-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { m } from "../../i18n";
import { addAddress } from "../../lib/checkout";
import { formatPhone } from "../../lib/format";
import { PostcodeFields } from "../address/postcode-fields";

export const MEMO_PRESETS = [
  () => m.co_memo_door(),
  () => m.co_memo_guard(),
  () => m.co_memo_call(),
  () => m.co_memo_none(),
] as const;

export const CUSTOM_MEMO = "__custom__";

function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: MemberAddress;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex flex-col gap-1.5 px-5 py-4 text-left text-body ${
        selected ? "border-2 border-ink" : "border border-line"
      }`}
    >
      <span>
        <b>{address.alias}</b>
        <span className="text-sub"> · {address.receiverName}</span>
      </span>
      <span>{formatPhone(address.phone)}</span>
      <span className="text-sub">
        {address.address1} {address.address2 ?? ""}
      </span>
    </button>
  );
}

/**
 * 배송지 — 저장한 배송지 가운데 하나를 고른다(데스크톱은 카드 목록, 모바일은 고른 배송지 + 변경).
 * 새 배송지는 회원 배송지로 저장한 뒤 고른다(배송지 원천은 `member.listAddresses`).
 */
export function AddressSection({
  addresses,
  addressId,
  onAddress,
  memo,
  onMemo,
  customMemo,
  onCustomMemo,
  pickupButton,
}: {
  addresses: MemberAddress[];
  addressId: string | null;
  onAddress: (addressId: string) => void;
  memo: string;
  onMemo: (memo: string) => void;
  customMemo: string;
  onCustomMemo: (memo: string) => void;
  pickupButton: React.ReactNode;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [adding, setAdding] = useState(addresses.length === 0);
  const selected = addresses.find((a) => a.addressId === addressId);
  return (
    <section className="bg-page px-4 py-6 md:px-7 md:py-7">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-black text-lg tracking-[-0.03em] md:text-xl">{m.co_address()}</h2>
        <div className="hidden gap-1.5 md:flex">
          {pickupButton}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-10 border border-line-strong px-3.5 font-bold text-meta"
          >
            {m.co_add_address()}
          </button>
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => setListOpen(!listOpen)}
            className="h-9 border border-line-strong px-3 font-bold text-meta md:hidden"
          >
            {listOpen ? m.co_close() : m.co_change()}
          </button>
        ) : null}
      </div>
      {/* 모바일 — 고른 배송지 한 줄 요약, 변경을 누르면 목록 */}
      {selected && !listOpen ? (
        <div className="flex flex-col gap-1 text-body md:hidden">
          <span>
            <b>
              {selected.alias} · {selected.receiverName}
            </b>{" "}
            {formatPhone(selected.phone)}
          </span>
          <span className="text-sub">
            {selected.address1} {selected.address2 ?? ""}
          </span>
        </div>
      ) : null}
      <div className={`grid-cols-2 gap-2.5 md:grid ${listOpen ? "grid grid-cols-1" : "hidden"}`}>
        {addresses.map((address) => (
          <AddressCard
            key={address.addressId}
            address={address}
            selected={address.addressId === addressId}
            onSelect={() => {
              onAddress(address.addressId);
              setListOpen(false);
            }}
          />
        ))}
      </div>
      {listOpen ? (
        <div className="mt-2.5 flex flex-col gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-11 border border-line-strong font-bold text-meta"
          >
            {m.co_add_address()}
          </button>
          {pickupButton}
        </div>
      ) : null}
      {addresses.length === 0 && !adding ? (
        <p className="text-body text-sub">{m.co_no_address()}</p>
      ) : null}
      {adding ? (
        <NewAddressForm
          onDone={(created) => {
            setAdding(false);
            if (created) onAddress(created);
          }}
          cancelable={addresses.length > 0}
        />
      ) : null}
      {selected ? (
        <label className="mt-5 flex flex-col gap-2 font-bold text-meta">
          <span className="max-md:sr-only">{m.co_memo()}</span>
          <select
            value={memo}
            onChange={(event) => onMemo(event.target.value)}
            className="h-11 w-full border border-line-strong bg-page px-3.5 font-normal text-body-lg"
          >
            {MEMO_PRESETS.map((preset) => (
              <option key={preset()} value={preset()}>
                {preset()}
              </option>
            ))}
            <option value={CUSTOM_MEMO}>{m.co_memo_custom()}</option>
          </select>
          {memo === CUSTOM_MEMO ? (
            <input
              value={customMemo}
              maxLength={50}
              placeholder={m.co_memo_custom_placeholder()}
              onChange={(event) => onCustomMemo(event.target.value)}
              className="h-11 border border-line-strong px-3.5 font-normal text-body-lg"
            />
          ) : null}
        </label>
      ) : null}
    </section>
  );
}

const field = "h-11 w-full border border-line-strong px-3.5 font-normal text-body-lg";

function NewAddressForm({
  onDone,
  cancelable,
}: {
  onDone: (addressId: string | null) => void;
  cancelable: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    alias: "",
    receiverName: "",
    phone: "",
    zipCode: "",
    address1: "",
    address2: "",
  });
  const save = useMutation({
    mutationFn: () =>
      addAddress({
        data: {
          alias: form.alias || form.receiverName,
          receiverName: form.receiverName,
          phone: form.phone.replace(/\D/g, ""),
          zipCode: form.zipCode,
          address1: form.address1,
          ...(form.address2 ? { address2: form.address2 } : {}),
        },
      }),
    onSuccess: async (addresses) => {
      await queryClient.invalidateQueries({ queryKey: ["checkout"] });
      // 방금 저장한 배송지 — 목록에서 새로 생긴 줄
      const created = addresses.find(
        (a) => a.address1 === form.address1 && a.receiverName === form.receiverName,
      );
      onDone(created?.addressId ?? null);
    },
  });
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });
  const rows: { key: keyof typeof form; label: string; required: boolean; mode?: "numeric" }[] = [
    { key: "receiverName", label: m.co_address_receiver(), required: true },
    { key: "phone", label: m.co_address_phone(), required: true, mode: "numeric" },
    { key: "alias", label: m.co_address_alias(), required: false },
  ];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="mt-4 grid gap-3 border border-line p-4 md:grid-cols-2"
    >
      {rows.map((row) => (
        <label key={row.key} className="flex flex-col gap-1.5 font-bold text-meta">
          {row.label}
          <input
            required={row.required}
            inputMode={row.mode}
            value={form[row.key]}
            onChange={set(row.key)}
            className={field}
          />
        </label>
      ))}
      <PostcodeFields
        value={form}
        onChange={(next) => setForm({ ...form, ...next })}
        inputClassName={field}
        wideClassName="md:col-span-2"
      />
      {save.isError ? (
        <p role="alert" className="text-meta text-point md:col-span-2">
          {m.co_address_failed()}
        </p>
      ) : null}
      <div className="flex gap-2 md:col-span-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="h-11 flex-1 bg-ink font-bold text-body text-page disabled:bg-disabled"
        >
          {m.co_address_save()}
        </button>
        {cancelable ? (
          <button
            type="button"
            onClick={() => onDone(null)}
            className="h-11 flex-1 border border-line-strong font-bold text-body"
          >
            {m.co_close()}
          </button>
        ) : null}
      </div>
    </form>
  );
}
