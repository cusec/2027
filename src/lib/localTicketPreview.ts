export const LOCAL_TICKET_PREVIEW_EMAIL = "local-ticket-preview@cusec.dev";

export function isLocalTicketPreview(hostname: string | null): boolean {
  if (process.env.NODE_ENV !== "development" || !hostname) return false;
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
