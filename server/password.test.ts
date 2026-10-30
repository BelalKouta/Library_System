import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifyDemoPassword } from "./password";

const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const hashFor = (username: string) => seed.match(new RegExp(`'${username}',[^\\n]*?'(shelfwalk-demo-${username}-v1:[a-f0-9]{128})'`))?.[1] ?? null;

describe("demo password hashes in supabase/seed.sql", () => {
  it("accepts the documented credentials", () => {
    expect(verifyDemoPassword(hashFor("admin"), "Shelfwalk2026!")).toBe(true);
    expect(verifyDemoPassword(hashFor("reader"), "Reader2026!")).toBe(true);
  });
  it("rejects wrong passwords, swapped accounts and missing accounts", () => {
    expect(verifyDemoPassword(hashFor("admin"), "Reader2026!")).toBe(false);
    expect(verifyDemoPassword(hashFor("reader"), "nope")).toBe(false);
    expect(verifyDemoPassword(null, "Shelfwalk2026!")).toBe(false);
    expect(verifyDemoPassword("garbage", "x")).toBe(false);
  });
});
