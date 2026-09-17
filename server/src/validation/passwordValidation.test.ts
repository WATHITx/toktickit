import { describe, it, expect } from "vitest";
import { validatePassword } from "./passwordValidation.js";

describe("validatePassword", () => {
  it("rejects password shorter than 8 characters", () => {
    expect(validatePassword("Short1!")).toBe("Password must be at least 8 characters");
  });

  it("rejects password without uppercase letter", () => {
    expect(validatePassword("lowercase123!")).toBe("Password must include an uppercase letter");
  });

  it("rejects password without lowercase letter", () => {
    expect(validatePassword("UPPERCASE123!")).toBe("Password must include a lowercase letter");
  });

  it("rejects password without number", () => {
    expect(validatePassword("NoNumberPass!")).toBe("Password must include a number");
  });

  it("rejects password without special character", () => {
    expect(validatePassword("NoSpecialPass1")).toBe("Password must include a special character");
  });

  it("accepts valid password meeting all requirements", () => {
    expect(validatePassword("ValidPass!123")).toBeNull();
  });
});
