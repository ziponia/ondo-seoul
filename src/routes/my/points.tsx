import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MySubPage } from "../../components/my/my-sub-page";
import { m } from "../../i18n";
import { formatDate } from "../../lib/date";
import { formatMoney } from "../../lib/format";
import { pointsQuery } from "../../lib/my";

/** 적립금 — 잔액·30일 내 소멸 예정(`member.getPoints`)과 변동 내역(`member.listPointHistory`) */
export const Route = createFileRoute("/my/points")({
  staticData: { mobileHeader: "page", hideTabBar: true },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(pointsQuery()),
  head: () => ({ meta: [{ title: m.pt_title() }] }),
  component: Points,
});

const TYPE: Record<string, () => string> = {
  EARN_REVIEW: m.pt_type_EARN_REVIEW,
  REVOKE_REVIEW: m.pt_type_REVOKE_REVIEW,
  EARN_PURCHASE: m.pt_type_EARN_PURCHASE,
  EXPIRE: m.pt_type_EXPIRE,
  ADJUST: m.pt_type_ADJUST,
  OPENING: m.pt_type_OPENING,
  USE_RESERVE: m.pt_type_USE_RESERVE,
  USE_RELEASE: m.pt_type_USE_RELEASE,
  REFUND_RESTORE: m.pt_type_REFUND_RESTORE,
};

function Points() {
  const { points, history } = useSuspenseQuery(pointsQuery()).data;
  return (
    <MySubPage title={m.pt_title()}>
      <dl className="mx-4 mt-4 grid grid-cols-2 border border-line md:mx-0 md:mt-0">
        {[
          { label: m.pt_available(), value: points.balance },
          { label: m.pt_expiring(), value: points.expiringSoon },
        ].map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1.5 border-line px-5 py-5 first:border-r"
          >
            <dt className="text-meta text-sub">{row.label}</dt>
            <dd className="font-black text-[24px] tracking-[-0.03em]">{formatMoney(row.value)}</dd>
          </div>
        ))}
      </dl>
      {history.contents.length === 0 ? (
        <p className="py-24 text-center text-body text-sub">{m.pt_empty()}</p>
      ) : (
        <table className="mt-6 w-full text-body">
          <thead>
            <tr className="border-ink border-b text-left text-meta text-sub">
              <th scope="col" className="py-3 pl-4 font-normal md:pl-0">
                {m.pt_date()}
              </th>
              <th scope="col" className="py-3 font-normal">
                {m.pt_desc()}
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-normal md:pr-0">
                {m.pt_amount()}
              </th>
            </tr>
          </thead>
          <tbody>
            {history.contents.map((entry) => (
              <tr key={entry.entryId} className="border-line border-b">
                <td className="py-3.5 pl-4 text-sub md:pl-0">{formatDate(entry.createdAt)}</td>
                <td className="py-3.5">{TYPE[entry.type]?.() ?? entry.type}</td>
                <td
                  className={`py-3.5 pr-4 text-right font-bold md:pr-0 ${entry.amount < 0 ? "text-point" : ""}`}
                >
                  {entry.amount < 0
                    ? `−${formatMoney(-entry.amount)}`
                    : `+${formatMoney(entry.amount)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </MySubPage>
  );
}
