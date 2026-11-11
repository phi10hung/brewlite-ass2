import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getSession,
  safeNext,
  saveSession,
  type Session,
} from "./session";

const SESSION: Session = {
  accessToken: "token-thu",
  user: {
    id: 1,
    name: "Khách hàng mẫu",
    email: "khach@brewlite.vn",
    role: "CUSTOMER",
    loyaltyPoints: 0,
  },
};

beforeEach(() => {
  localStorage.clear();
});

describe("Phiên đăng nhập (CT-42)", () => {
  it("CT-42: lưu phiên vào localStorage, đọc lại được, đăng xuất thì xóa", () => {
    expect(getSession()).toBeNull();

    saveSession(SESSION);
    expect(getSession()).toEqual(SESSION);
    expect(JSON.parse(localStorage.getItem("brewlite-auth") ?? "")).toEqual(
      SESSION,
    );

    clearSession();
    expect(getSession()).toBeNull();
  });

  it("chỉ cho quay lại trang trong BrewLite sau khi đăng nhập", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("https://trang-la.vn")).toBe("/");
    expect(safeNext("//trang-la.vn")).toBe("/");
  });
});