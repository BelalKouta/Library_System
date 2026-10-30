import { describe, expect, it } from "vitest";
import { isSecureRequest, parseCookies, serializeCookie } from "./cookies";

describe("cookies", () => {
  it("parses a cookie header", () => {
    expect(parseCookies("a=1; shelfwalk_demo_session=abc.def; b=x%20y")).toEqual({ a: "1", shelfwalk_demo_session: "abc.def", b: "x y" });
    expect(parseCookies(null)).toEqual({});
  });
  it("serializes a session cookie safely", () => {
    const c = serializeCookie("s", "tok", { maxAgeSeconds: 60, secure: true });
    expect(c).toContain("HttpOnly"); expect(c).toContain("SameSite=Lax"); expect(c).toContain("Secure"); expect(c).toContain("Max-Age=60");
  });
  it("clears with Max-Age=0", () => {
    expect(serializeCookie("s", "", { maxAgeSeconds: 0, secure: false })).toMatch(/Max-Age=0.*Expires=/);
  });
  it("detects https behind Vercel's proxy", () => {
    expect(isSecureRequest(new Request("http://x/api", { headers: { "x-forwarded-proto": "https" } }))).toBe(true);
    expect(isSecureRequest(new Request("http://localhost:3000/api"))).toBe(false);
  });
});
