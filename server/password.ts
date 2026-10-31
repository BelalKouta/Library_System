import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
const DUMMY_HASH = `dummy-salt:${"0".repeat(128)}`;
export function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
export function verifyPassword(stored: string | null | undefined, password: string) {
  const value = stored || DUMMY_HASH; const [salt, expectedHex] = value.split(":");
  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex"); const actual = scryptSync(password, salt, expected.length);
  return Boolean(stored) && actual.length === expected.length && timingSafeEqual(actual, expected);
}
