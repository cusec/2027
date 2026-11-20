import { databaseName } from "./databaseName";

/** Purchase display/access preview for real signed-in accounts, never a login. */
export function localTicketPreviewAllowed(
  email: string,
  host: string | null,
  env: Record<string, string | undefined>,
  resolvedDatabase: string,
): boolean {
  if (env.NODE_ENV !== "development" || env.VERCEL || env.VERCEL_ENV) return false;
  if (databaseName(env) !== "CUSEC2027_dev" || resolvedDatabase !== "CUSEC2027_dev") return false;
  if (!host || !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host)) return false;
  const emails = (env.LOCAL_TICKET_PREVIEW_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return !!email && emails.includes(email.trim().toLowerCase());
}
