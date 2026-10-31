import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("account password hashes", () => {
  it("accepts the password used to create a hash", () => {
    const hash = hashPassword("a-secure-student-password");
    expect(verifyPassword(hash, "a-secure-student-password")).toBe(true);
  });
  it("rejects wrong, missing, and malformed passwords", () => {
    const hash = hashPassword("a-secure-student-password");
    expect(verifyPassword(hash, "wrong-password")).toBe(false);
    expect(verifyPassword(null, "a-secure-student-password")).toBe(false);
    expect(verifyPassword("garbage", "x")).toBe(false);
  });
});
