import { scryptSync, timingSafeEqual } from "node:crypto";

// Stored format: "<salt>:<128 hex chars>" (scrypt, 64-byte key).
const DUMMY_HASH = `dummy-salt:${"0".repeat(128)}`;

/** Constant-ish time check. Pass null for unknown accounts so timing doesn't reveal them. */
export function verifyDemoPassword(stored: string | null | undefined, password: string): boolean {
  const value = stored || DUMMY_HASH;
  const [salt, expectedHex] = value.split(":");
  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  const match = actual.length === expected.length && timingSafeEqual(actual, expected);
  return Boolean(stored) && match;
}
