import { type CustomInputView, customInputLength } from "@sayren/storefront-sdk";
import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { m } from "../../i18n";
import { createInputUpload } from "../../lib/cart";

/**
 * 직접 입력(각인 문구 등) — 값은 화면 상태에만 두고 서버 함수 본문으로만 보낸다
 * (주소·브라우저 저장소·로그에 남기지 않는다, `custom-input-private` 규칙).
 * 이미지 입력(`image`)은 업로드 자리를 받아 파일을 올리고, 공개 주소들을 줄바꿈으로 이어 값으로 둔다.
 */
export function CustomInputs({
  inputs,
  values,
  onChange,
}: {
  inputs: CustomInputView[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  if (inputs.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 bg-surface p-5">
      {inputs.map((input) => {
        const value = values[input.inputId] ?? "";
        const tag = (
          <span className={input.required ? "text-point" : "font-normal text-sub"}>
            {input.required ? m.ci_required() : m.ci_optional()}
          </span>
        );
        if (input.type === "image") {
          return (
            <ImageInput
              key={input.inputId}
              input={input}
              tag={tag}
              value={value}
              onChange={(next) => onChange({ ...values, [input.inputId]: next })}
            />
          );
        }
        if (input.type === "select") {
          return (
            <label key={input.inputId} className="flex flex-col gap-1.5 font-bold text-body">
              <span>
                {input.label} {tag}
              </span>
              <select
                value={value}
                onChange={(event) => onChange({ ...values, [input.inputId]: event.target.value })}
                className="h-12 border border-line-strong bg-page px-3 font-normal text-body-lg"
              >
                <option value="">{m.ci_choose()}</option>
                {(input.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={input.inputId} className="flex flex-col gap-1.5 font-bold text-body">
            <span>
              {input.label} {tag}
            </span>
            <input
              value={value}
              inputMode={input.type === "number" ? "numeric" : undefined}
              placeholder={input.placeholder ?? undefined}
              autoComplete="off"
              onChange={(event) => {
                const next = event.target.value;
                if (customInputLength(next) <= input.maxLength) {
                  onChange({ ...values, [input.inputId]: next });
                }
              }}
              className="h-12 border border-line-strong bg-page px-3.5 font-normal text-body-lg"
            />
            <span className="text-right font-normal text-caption text-sub">
              {m.ci_count({ count: customInputLength(value), max: input.maxLength })}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** 필수 입력이 비었는가 */
export function missingRequired(inputs: CustomInputView[], values: Record<string, string>) {
  return inputs.find((input) => input.required && !(values[input.inputId] ?? "").trim());
}

/** 이미지 입력 — 최대 `maxLength`장 */
function ImageInput({
  input,
  tag,
  value,
  onChange,
}: {
  input: CustomInputView;
  tag: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
}) {
  const urls = value ? value.split("\n") : [];
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ticket = await createInputUpload({ data: { filename: file.name, size: file.size } });
      const response = await fetch(ticket.uploadUrl, { method: "PUT", body: file });
      if (!response.ok) throw new Error("upload failed");
      return ticket.url;
    },
    onSuccess: (url) => onChange([...urls, url].join("\n")),
  });
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold text-body">
        {input.label} {tag}{" "}
        <span className="font-normal text-sub">· {m.ci_photo_limit({ max: input.maxLength })}</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={url} className="relative h-22 w-22">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={m.ci_remove_photo({ n: i + 1 })}
              onClick={() => onChange(urls.filter((u) => u !== url).join("\n"))}
              className="absolute top-0.5 right-0.5 grid h-7 w-7 place-items-center bg-ink text-page"
            >
              <X size={12} aria-hidden />
            </button>
          </div>
        ))}
        {urls.length < input.maxLength ? (
          <label className="flex h-22 w-22 cursor-pointer flex-col items-center justify-center gap-1 border border-faint border-dashed bg-page text-caption text-sub">
            <Plus size={18} aria-hidden />
            {m.ci_add_photo()}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      {upload.isError ? (
        <span role="alert" className="text-meta text-point">
          {m.ci_upload_failed()}
        </span>
      ) : null}
    </div>
  );
}
