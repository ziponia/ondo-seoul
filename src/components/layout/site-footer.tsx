import { type StorefrontStore, sellerInfoOf } from "@sayren/storefront-sdk";
import { m } from "../../i18n";

type SellerField = ReturnType<typeof sellerInfoOf>[number]["field"];

/** 라벨은 화면이 정한다 — 값과 순서는 `sellerInfoOf`가 셀러 설정대로 준다 */
function labelOf(field: SellerField): string {
  const labels: Record<SellerField, () => string> = {
    businessName: m.footer_business_name,
    representativeName: m.footer_representative,
    businessNumber: m.footer_business_number,
    mailOrderSalesNumber: m.footer_mail_order,
    businessAddress: m.footer_address,
    customerCenterPhone: m.footer_phone,
    customerCenterEmail: m.footer_email,
    privacyOfficerName: m.footer_privacy_officer,
    privacyOfficerEmail: m.footer_privacy_email,
  };
  return labels[field]();
}

/** 고객센터 칸으로 따로 보이는 항목 */
const CONTACT_FIELDS: SellerField[] = ["customerCenterPhone", "customerCenterEmail"];

/** 푸터 — 왼쪽 사업자 정보, 오른쪽 고객센터. 값이 없는 항목은 줄째 숨는다 */
export function SiteFooter({ store }: { store: StorefrontStore }) {
  const rows = sellerInfoOf(store);
  const business = rows.filter((row) => !CONTACT_FIELDS.includes(row.field));
  const phone = rows.find((row) => row.field === "customerCenterPhone")?.value;
  const email = rows.find((row) => row.field === "customerCenterEmail")?.value;
  return (
    <footer className="mt-24 border-line border-t bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 md:grid-cols-[1fr_1fr] md:px-6 md:py-12">
        <div className="flex flex-col gap-3">
          <span className="font-display font-extrabold text-lg tracking-[-0.04em]">
            {store.name}
          </span>
          {store.checkoutMode === "TEST" ? (
            <p className="text-meta text-point">{m.footer_test_mode()}</p>
          ) : null}
          <dl
            aria-label={m.footer_seller()}
            className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-sub"
          >
            {business.map(({ field, value }) => (
              <div key={field} className="flex gap-1">
                <dt>{labelOf(field)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-1.5 text-meta">
          {phone ? (
            <strong className="font-bold">
              {m.footer_cs()} {phone}
            </strong>
          ) : null}
          {store.businessHours ? <span className="text-sub">{store.businessHours}</span> : null}
          {email ? <span className="text-sub">{email}</span> : null}
          <span className="mt-auto pt-6 text-caption text-muted md:text-right">
            {m.footer_powered()}
          </span>
        </div>
      </div>
    </footer>
  );
}
