/**
 * Per-IP rate limiting for /api/*, applied in src/proxy.ts before any route
 * handler (and so before any database or Ticket Tailor call) runs.
 *
 * Fixed one-minute windows, counted in memory. That is per server instance:
 * on Vercel a burst spread across several instances gets each instance's
 * allowance, so treat this as the app's own floor, not the whole defence.
 * Vercel's platform DDoS mitigation sits in front of it, and a Firewall
 * rate-limit rule is the place for a hard, global cap.
 *
 * Limits are sized to what the real UI does, with headroom: the purchase step
 * polls ticket status as often as every 1.5s right after checkout, and the
 * city search fires on typing (debounced to 200ms).
 */

export interface Bucket {
  name: string;
  /** Requests allowed per IP per window. */
  limit: number;
}

const WINDOW_MS = 60_000;

const BUCKETS = {
  // Ticket Tailor signs its webhooks; this only stops a flood of forgeries.
  webhook: { name: "webhook", limit: 300 },
  // Résumé upload: multipart body, then a Cloudinary upload.
  upload: { name: "upload", limit: 10 },
  // Code-style endpoints someone could brute force.
  redeem: { name: "redeem", limit: 20 },
  // Each call goes out to Ticket Tailor.
  ticketing: { name: "ticketing", limit: 60 },
  // Search-as-you-type.
  locations: { name: "locations", limit: 90 },
  write: { name: "write", limit: 40 },
  read: { name: "read", limit: 120 },
} satisfies Record<string, Bucket>;

const REDEEM = [
  "/api/collectibles/redeem",
  "/api/shop/redeem",
  "/api/users/link-email",
  "/api/teams/join",
  "/api/ticket-wizard/claim",
];

const TICKETING = ["/api/ticket-wizard/status", "/api/ticket-types"];

export function bucketFor(pathname: string, method: string): Bucket {
  if (pathname.startsWith("/api/ticket-tailor/webhook")) return BUCKETS.webhook;
  if (pathname.startsWith("/api/demographics/resume") && method !== "GET") return BUCKETS.upload;
  if (REDEEM.some((p) => pathname.startsWith(p))) return BUCKETS.redeem;
  if (TICKETING.some((p) => pathname.startsWith(p))) return BUCKETS.ticketing;
  if (pathname.startsWith("/api/locations")) return BUCKETS.locations;
  return method === "GET" || method === "HEAD" ? BUCKETS.read : BUCKETS.write;
}

/** Vercel sets x-forwarded-for itself; the first entry is the client. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

const windows = new Map<string, { start: number; count: number }>();
let lastSweep = 0;

// Drop finished windows now and then so the map can't grow without bound
// under a spray of distinct IPs.
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, entry] of windows) {
    if (now - entry.start >= WINDOW_MS) windows.delete(key);
  }
}

export interface LimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until this IP's window for the bucket resets. */
  retryAfter: number;
}

export function takeToken(ip: string, bucket: Bucket, now = Date.now()): LimitResult {
  sweep(now);
  const key = `${bucket.name}:${ip}`;
  let entry = windows.get(key);
  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { start: now, count: 0 };
    windows.set(key, entry);
  }
  entry.count += 1;
  return {
    ok: entry.count <= bucket.limit,
    limit: bucket.limit,
    remaining: Math.max(0, bucket.limit - entry.count),
    retryAfter: Math.ceil((entry.start + WINDOW_MS - now) / 1000),
  };
}
