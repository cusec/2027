export const LOCAL_TICKET_PREVIEW_EMAIL = "local-ticket-preview@cusec.dev";

export function isLocalTicketPreview(hostname: string | null): boolean {
  if (process.env.NODE_ENV !== "development" || !hostname) return false;
  if (process.env.LOCAL_TICKET_PREVIEW !== "true") return false;
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "::1" ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

/** Separate from the blank registration form preview: a seeded, ticketed delegate. */
export function isLocalPurchasedTicketPreview(
  host: string | null,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV === "development" && !env.VERCEL_ENV &&
    env.LOCAL_PURCHASED_TICKET_PREVIEW === "true" &&
    env.MONGODB_DB_NAME === "CUSEC2027_dev" && env.VERCEL_GIT_COMMIT_REF !== "staging" &&
    !!host && /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i.test(host);
}
