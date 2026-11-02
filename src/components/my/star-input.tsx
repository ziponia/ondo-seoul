import { m } from "../../i18n";

/** 별점 고르기(1~5) — 리뷰 작성·수정. 화면에는 별만, 화면 읽기에는 라디오 버튼 */
export function StarInput({
  value,
  onChange,
  size = "text-[28px]",
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: string;
}) {
  return (
    <fieldset className="m-0 flex gap-1 border-0 p-0">
      <legend className="sr-only">{m.rw_rating()}</legend>
      {[1, 2, 3, 4, 5].map((rating) => (
        <label
          key={rating}
          className={`cursor-pointer ${size} leading-none has-focus-visible:outline-2 ${
            rating <= value ? "text-ink" : "text-line-strong"
          }`}
        >
          <input
            type="radio"
            name="rating"
            value={rating}
            checked={value === rating}
            onChange={() => onChange(rating)}
            className="sr-only"
          />
          <span className="sr-only">{m.mr_stars({ rating })}</span>
          <span aria-hidden>★</span>
        </label>
      ))}
    </fieldset>
  );
}
