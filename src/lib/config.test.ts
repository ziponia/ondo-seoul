import { describe, expect, it } from "vitest";
import { storeCodeFromHost } from "./config";

describe("상점 코드 해석", () => {
  it("서브도메인이 있으면 첫 라벨을 쓴다", () => {
    expect(storeCodeFromHost("mystore.example.com")).toBe("mystore");
    expect(storeCodeFromHost("mystore.example.com:443")).toBe("mystore");
  });

  it("서브도메인이 없거나 로컬·IP면 알 수 없다", () => {
    expect(storeCodeFromHost("example.com")).toBeNull();
    expect(storeCodeFromHost("localhost:4010")).toBeNull();
    expect(storeCodeFromHost("127.0.0.1:4010")).toBeNull();
    expect(storeCodeFromHost(null)).toBeNull();
  });
});
