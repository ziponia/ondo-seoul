import type { MemberAddress } from "@sayren/storefront-sdk";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mark, STYLE } from "../../components/account/social-buttons";
import { PostcodeFields } from "../../components/address/postcode-fields";
import { MySubPage } from "../../components/my/my-sub-page";
import { m } from "../../i18n";
import { meQuery, startLinkIdentity, unlinkIdentity, withdraw } from "../../lib/account";
import { formatDate } from "../../lib/date";
import { formatMoney, formatPhone } from "../../lib/format";
import {
  accountQuery,
  deleteAddress,
  myCouponsQuery,
  pointsQuery,
  saveAddress,
  updateConsents,
  updateProfile,
} from "../../lib/my";

/**
 * 내 정보 — 회원 정보(member.updateMe), 배송지(member 배송지 API), 알림 수신 동의(member.updateConsents),
 * 연결된 계정(소셜 연결·해제), 회원 탈퇴. 탭은 주소(`?tab=`)에 남는다.
 */
const TABS = ["profile", "addresses", "consents", "identities", "withdraw"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/my/account")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined) }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(accountQuery()),
  head: () => ({ meta: [{ title: m.ac_title() }] }),
  component: Account,
});

const field = "h-12 w-full border border-line-strong px-3.5 font-normal text-body-lg";
const TAB_LABEL: Record<Tab, () => string> = {
  profile: m.ac_tab_profile,
  addresses: m.ac_tab_addresses,
  consents: m.ac_tab_consents,
  identities: m.ac_tab_identities,
  withdraw: m.ac_tab_withdraw,
};

function Account() {
  const { tab = "profile" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <MySubPage title={m.ac_title()}>
      <div
        role="tablist"
        className="flex overflow-x-auto px-2 shadow-[inset_0_-1px_0_var(--color-line)] md:px-0"
      >
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() =>
              navigate({ search: { tab: key === "profile" ? undefined : key }, replace: true })
            }
            className={`h-12 shrink-0 border-b-2 px-3 font-bold text-body-lg md:px-[18px] ${
              tab === key ? "border-ink" : "border-transparent text-muted"
            }`}
          >
            {TAB_LABEL[key]()}
          </button>
        ))}
      </div>
      <div className="px-4 pt-6 md:max-w-[480px] md:px-0 md:pt-7">
        {tab === "profile" ? <Profile /> : null}
        {tab === "addresses" ? <Addresses /> : null}
        {tab === "consents" ? <Consents /> : null}
        {tab === "identities" ? <Identities /> : null}
        {tab === "withdraw" ? <Withdraw /> : null}
      </div>
    </MySubPage>
  );
}

function Profile() {
  const queryClient = useQueryClient();
  const me = useSuspenseQuery(meQuery()).data;
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ? formatPhone(me.phone) : "");
  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        data: { name: name.trim(), ...(phone ? { phone: phone.replace(/\D/g, "") } : {}) },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-5"
    >
      <label className="flex flex-col gap-2 font-bold text-meta">
        {m.ac_email()}
        <input value={me?.email ?? ""} readOnly className={`${field} bg-surface/60 text-sub`} />
      </label>
      <label className="flex flex-col gap-2 font-bold text-meta">
        {m.ac_name()}
        <input
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-2 font-bold text-meta">
        {m.ac_phone()}
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={field}
        />
      </label>
      {save.data ? (
        <p
          role={save.data.ok ? "status" : "alert"}
          className={`text-meta ${save.data.ok ? "text-sub" : "text-point"}`}
        >
          {save.data.ok ? m.ac_saved() : save.data.message}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-page px-4 pt-2.5 pb-3.5 md:static md:border-0 md:p-0">
        <button
          type="submit"
          disabled={save.isPending || !name.trim()}
          className="h-[52px] w-full bg-ink font-bold text-base text-page disabled:bg-disabled"
        >
          {m.ac_save()}
        </button>
      </div>
    </form>
  );
}

function Addresses() {
  const queryClient = useQueryClient();
  const { addresses } = useSuspenseQuery(accountQuery()).data;
  const [editing, setEditing] = useState<MemberAddress | "new" | null>(null);
  const remove = useMutation({
    mutationFn: (addressId: string) => deleteAddress({ data: { addressId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my", "account"] }),
  });
  const makeDefault = useMutation({
    mutationFn: (address: MemberAddress) =>
      saveAddress({
        data: {
          addressId: address.addressId,
          alias: address.alias,
          receiverName: address.receiverName,
          phone: address.phone,
          zipCode: address.zipCode,
          address1: address.address1,
          ...(address.address2 ? { address2: address.address2 } : {}),
          isDefault: true,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my", "account"] }),
  });
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="h-12 border border-ink font-bold text-body"
      >
        {m.ac_add_address()}
      </button>
      {editing === "new" ? <AddressForm onDone={() => setEditing(null)} /> : null}
      {addresses.map((address) =>
        editing !== "new" && editing?.addressId === address.addressId ? (
          <AddressForm key={address.addressId} address={address} onDone={() => setEditing(null)} />
        ) : (
          <div
            key={address.addressId}
            className="flex flex-col gap-1.5 border border-line px-5 py-4 text-body"
          >
            <p className="flex items-center gap-2">
              <b>{address.alias}</b>
              {address.isDefault ? (
                <span className="border border-ink px-1.5 font-bold text-caption">
                  {m.ac_default()}
                </span>
              ) : null}
            </p>
            <p>
              {address.receiverName} · {formatPhone(address.phone)}
            </p>
            <p className="text-sub">
              {address.address1} {address.address2 ?? ""}
            </p>
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(address)}
                className="h-9 border border-line-strong px-3 font-bold text-meta"
              >
                {m.ac_edit()}
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate(address.addressId)}
                className="h-9 border border-line-strong px-3 font-bold text-meta"
              >
                {m.ac_delete()}
              </button>
              {address.isDefault ? null : (
                <button
                  type="button"
                  disabled={makeDefault.isPending}
                  onClick={() => makeDefault.mutate(address)}
                  className="h-9 border border-line-strong px-3 font-bold text-meta"
                >
                  {m.ac_set_default()}
                </button>
              )}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function AddressForm({ address, onDone }: { address?: MemberAddress; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    alias: address?.alias ?? "",
    receiverName: address?.receiverName ?? "",
    phone: address ? formatPhone(address.phone) : "",
    zipCode: address?.zipCode ?? "",
    address1: address?.address1 ?? "",
    address2: address?.address2 ?? "",
  });
  const save = useMutation({
    mutationFn: () =>
      saveAddress({
        data: {
          ...(address ? { addressId: address.addressId } : {}),
          alias: form.alias || form.receiverName,
          receiverName: form.receiverName,
          phone: form.phone.replace(/\D/g, ""),
          zipCode: form.zipCode,
          address1: form.address1,
          ...(form.address2 ? { address2: form.address2 } : {}),
          isDefault: address?.isDefault ?? false,
        },
      }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries({ queryKey: ["my", "account"] });
      onDone();
    },
  });
  const rows: { key: keyof typeof form; label: string; required: boolean }[] = [
    { key: "alias", label: m.co_address_alias(), required: false },
    { key: "receiverName", label: m.co_address_receiver(), required: true },
    { key: "phone", label: m.co_address_phone(), required: true },
  ];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-3 border border-ink p-4"
    >
      {rows.map((row) => (
        <label key={row.key} className="flex flex-col gap-1.5 font-bold text-meta">
          {row.label}
          <input
            required={row.required}
            value={form[row.key]}
            onChange={(event) => setForm({ ...form, [row.key]: event.target.value })}
            className="h-11 border border-line-strong px-3.5 font-normal text-body-lg"
          />
        </label>
      ))}
      <PostcodeFields
        value={form}
        onChange={(next) => setForm({ ...form, ...next })}
        inputClassName="h-11 w-full border border-line-strong px-3.5 font-normal text-body-lg"
      />
      {save.data && !save.data.ok ? (
        <p role="alert" className="text-meta text-point">
          {save.data.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="h-11 flex-1 border border-line-strong font-bold"
        >
          {m.co_close()}
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="h-11 flex-1 bg-ink font-bold text-page disabled:bg-disabled"
        >
          {m.co_address_save()}
        </button>
      </div>
    </form>
  );
}

function Consents() {
  const queryClient = useQueryClient();
  const { consents } = useSuspenseQuery(accountQuery()).data;
  const toggle = useMutation({
    mutationFn: () => updateConsents({ data: { marketing: !consents.marketing.agreed } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my", "account"] }),
  });
  const required = [
    { label: m.ac_required_terms(), row: consents.terms },
    { label: m.ac_required_privacy(), row: consents.privacy },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-line border-b py-5">
        <div className="flex flex-col gap-1">
          <b className="text-body-lg">{m.ac_marketing()}</b>
          <span className="text-meta text-sub">{m.ac_marketing_desc()}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={consents.marketing.agreed}
          aria-label={m.ac_marketing()}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate()}
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 ${
            consents.marketing.agreed ? "justify-end bg-ink" : "justify-start bg-line-strong"
          }`}
        >
          <span className="h-6 w-6 rounded-full bg-page" />
        </button>
      </div>
      {required.map(({ label, row }) => (
        <div
          key={label}
          className="flex items-center justify-between border-line border-b py-4 text-body"
        >
          <span>{label}</span>
          <span className="text-sub">
            {row.agreed && row.updatedAt ? m.ac_agreed({ date: formatDate(row.updatedAt) }) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

const PROVIDERS = [
  { key: "kakao" as const, label: m.provider_kakao },
  { key: "naver" as const, label: m.provider_naver },
  { key: "google" as const, label: m.provider_google },
];

function Identities() {
  const queryClient = useQueryClient();
  const { identities } = useSuspenseQuery(accountQuery()).data;
  const link = useMutation({
    mutationFn: (provider: "kakao" | "naver" | "google") =>
      startLinkIdentity({ data: { provider } }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const unlink = useMutation({
    mutationFn: (provider: "kakao" | "naver" | "google") => unlinkIdentity({ data: { provider } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my", "account"] }),
  });
  return (
    <div className="flex flex-col">
      {PROVIDERS.map(({ key, label }) => {
        const linked = identities.identities.find((i) => i.provider === key);
        return (
          <div key={key} className="flex items-center gap-4 border-line border-b py-4">
            <span
              aria-hidden
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${STYLE[key]}`}
            >
              <Mark provider={key} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <b className="text-body-lg">{label()}</b>
              <span className="text-meta text-sub">
                {linked ? m.ac_linked({ date: formatDate(linked.linkedAt) }) : m.ac_not_linked()}
              </span>
            </div>
            <button
              type="button"
              disabled={link.isPending || unlink.isPending}
              onClick={() => (linked ? unlink.mutate(key) : link.mutate(key))}
              className={`h-10 shrink-0 px-4 font-bold text-meta ${
                linked ? "border border-line-strong" : "bg-ink text-page"
              }`}
            >
              {linked ? m.ac_unlink() : m.ac_link()}
            </button>
          </div>
        );
      })}
      {unlink.data && !unlink.data.ok && unlink.data.message ? (
        <p role="alert" className="mt-3 text-meta text-point">
          {unlink.data.message}
        </p>
      ) : null}
    </div>
  );
}

function Withdraw() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { identities } = useSuspenseQuery(accountQuery()).data;
  const coupons = useQuery(myCouponsQuery()).data;
  const points = useQuery(pointsQuery()).data?.points;
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const out = useMutation({
    mutationFn: () => withdraw({ data: identities.hasPassword ? { password } : {} }),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries();
      router.history.push("/");
    },
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        out.mutate();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5 bg-surface px-5 py-4">
        <b className="text-body-lg">{m.ac_out_title()}</b>
        <span className="text-body text-sub">
          {m.ac_out_benefits({
            coupons: coupons?.available.length ?? 0,
            points: formatMoney(points?.balance ?? 0),
          })}
        </span>
      </div>
      {identities.hasPassword ? (
        <label className="flex flex-col gap-2 font-bold text-meta">
          {m.ac_out_password()}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
          />
          <span className="font-normal text-caption text-muted">{m.ac_out_password_hint()}</span>
        </label>
      ) : (
        <p className="text-meta text-muted">{m.ac_out_social_hint()}</p>
      )}
      <label className="flex items-center gap-2.5 text-body">
        <input
          type="checkbox"
          checked={agreed}
          onChange={() => setAgreed(!agreed)}
          className="h-[18px] w-[18px] accent-ink"
        />
        {m.ac_out_agree()}
      </label>
      {out.data && !out.data.ok && out.data.message ? (
        <p role="alert" className="text-meta text-point">
          {out.data.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!agreed || out.isPending || (identities.hasPassword && !password)}
        className="h-[52px] border border-point font-bold text-base text-point disabled:border-line-strong disabled:text-faint"
      >
        {m.ac_out_submit()}
      </button>
    </form>
  );
}
