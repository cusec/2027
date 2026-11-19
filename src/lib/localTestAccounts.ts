import { createHmac, timingSafeEqual, scryptSync } from "node:crypto";
export const LOCAL_LOGIN_COOKIE = "cusec-local-test-session";
export const LOCAL_ACCOUNTS = {
  basic: { name: "test - basic", email: "local-basic@cusec.dev", isVip: false },
  vip: { name: "test - VIP", email: "local-vip@cusec.dev", isVip: true },
} as const;
export type LocalAccount = keyof typeof LOCAL_ACCOUNTS;
export function localCredentials(username: string, password: string): LocalAccount | null {
  const account = username.trim().toLowerCase();
  if (!(account === "basic" || account === "vip")) return null;
  const expected = process.env.LOCAL_TEST_PASSWORD;
  if (!expected) return null;
  const actualHash = scryptSync(password, "cusec-local-testing", 32);
  const expectedHash = scryptSync(expected, "cusec-local-testing", 32);
  return timingSafeEqual(actualHash, expectedHash) ? account : null;
}
export function signLocalAccount(account: LocalAccount, now = Date.now()): string {
  const secret = process.env.LOCAL_TEST_SESSION_SECRET;
  if (!secret) throw new Error("Local test session secret missing");
  const payload = `${account}:${now}`;
  return `${payload}:${createHmac("sha256", secret).update(payload).digest("hex")}`;
}
export function readLocalAccount(cookie: string | undefined, now = Date.now()): LocalAccount | null {
  const secret = process.env.LOCAL_TEST_SESSION_SECRET;
  if (!cookie || !secret) return null;
  const parts = cookie.split(":");
  if (parts.length !== 3 || !["basic", "vip"].includes(parts[0]) || !/^\d+$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return null;
  const age = now - Number(parts[1]);
  if (age < 0 || age > 8 * 60 * 60 * 1000) return null;
  const mac = createHmac("sha256", secret).update(parts.slice(0, 2).join(":")).digest();
  return timingSafeEqual(Buffer.from(parts[2], "hex"), mac) ? parts[0] as LocalAccount : null;
}
