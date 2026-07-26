import crypto from "node:crypto";

export interface TicketType {
  id: string;
  name: string;
  priceCents: number;
  status: "on_sale" | "sold_out" | "unavailable";
  quantityAvailable: number | null;
}

export interface TicketTypesResult {
  tickets: TicketType[];
  source: "live" | "mock" | "error";
}

export interface TicketWidgetConfig {
  boxOfficeName: string | null;
  eventId: string | null;
  customDomain: string | null;
}

const MOCK_TICKETS: TicketType[] = [
  {
    id: "mock-general",
    name: "General",
    priceCents: 0,
    status: "on_sale",
    quantityAvailable: 150,
  },
  {
    id: "mock-vip",
    name: "VIP",
    priceCents: 0,
    status: "on_sale",
    quantityAvailable: 20,
  },
];

function normalizeStatus(raw: unknown): TicketType["status"] {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("sold")) return "sold_out";
  if (value === "on_sale" || value === "onsale") return "on_sale";
  return "unavailable";
}

// Ticket Tailor's v1 API nests fields under `attributes` on some endpoints
// and returns them flat on others — read both so this survives either shape.
function parseTicketType(raw: Record<string, unknown>, index: number): TicketType {
  const attrs = (raw?.attributes as Record<string, unknown>) ?? raw ?? {};
  const prices = attrs.prices as Array<{ price?: number }> | undefined;

  const priceCents =
    typeof attrs.price === "number"
      ? attrs.price
      : typeof attrs.price_cents === "number"
        ? (attrs.price_cents as number)
        : typeof prices?.[0]?.price === "number"
          ? prices[0].price
          : 0;

  return {
    id: String(raw?.id ?? attrs.id ?? `ticket-${index}`),
    name: String(attrs.name ?? "Ticket"),
    priceCents,
    status: normalizeStatus(attrs.status),
    // Confirmed against a real event: Ticket Tailor's ticket_type objects
    // expose the currently-available count as `quantity` (quantity_total is
    // the original capacity). `quantity_available` doesn't actually exist on
    // the live payload but is kept as a fallback in case of API variance.
    quantityAvailable:
      typeof attrs.quantity === "number"
        ? (attrs.quantity as number)
        : typeof attrs.quantity_available === "number"
          ? (attrs.quantity_available as number)
          : null,
  };
}

// Returns mock $0 ticket data when Ticket Tailor credentials aren't configured,
// so the /tickets page is testable end-to-end before a real event exists.
export async function getTicketTypes(): Promise<TicketTypesResult> {
  const apiKey = process.env.TICKET_TAILOR_API_KEY;
  const eventId = process.env.TICKET_TAILOR_EVENT_ID;

  if (!apiKey || !eventId) {
    return { tickets: MOCK_TICKETS, source: "mock" };
  }

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const headers = { Authorization: `Basic ${auth}` };

    // There is no separate `/ticket_types` sub-resource in Ticket Tailor's
    // v1 API (confirmed against a live event - it 404s). Ticket types are
    // embedded directly on the resource itself instead.
    //
    // TICKET_TAILOR_EVENT_ID is the public-facing id used in checkout/box
    // office URLs (e.g. buytickets.at/cusec/2329159 or the "eventId" the
    // TTWidget popup needs) - confirmed that id belongs to the *event
    // series* resource (Ticket Tailor wraps every event in a series, even a
    // one-off), not the internal single-event occurrence id. So try
    // event_series first (reading `default_ticket_types`), and fall back to
    // the single-event resource (reading `ticket_types`) for box offices set
    // up without series.
    const seriesId = eventId.startsWith("es_") ? eventId : `es_${eventId}`;
    let res = await fetch(`https://api.tickettailor.com/v1/event_series/${seriesId}`, {
      headers,
      next: { revalidate: 300 },
    });
    let ticketTypesKey = "default_ticket_types";

    if (!res.ok) {
      const eventResId = eventId.startsWith("ev_") ? eventId : `ev_${eventId}`;
      res = await fetch(`https://api.tickettailor.com/v1/events/${eventResId}`, {
        headers,
        next: { revalidate: 300 },
      });
      ticketTypesKey = "ticket_types";
    }

    if (!res.ok) {
      throw new Error(`Ticket Tailor API responded ${res.status}`);
    }

    const body = await res.json();
    const rawTickets = Array.isArray(body?.[ticketTypesKey]) ? body[ticketTypesKey] : [];
    return { tickets: rawTickets.map(parseTicketType), source: "live" };
  } catch {
    return { tickets: [], source: "error" };
  }
}

export function getTicketWidgetConfig(): TicketWidgetConfig {
  // `||` (not `??`) so an empty-string env var (unset-but-present, as
  // TICKET_TAILOR_CUSTOM_DOMAIN commonly is until a custom domain is
  // connected) falls back to null instead of being passed to the widget as
  // an empty string, which the widget script fails to resolve as a host.
  return {
    boxOfficeName: process.env.TICKET_TAILOR_BOX_OFFICE_NAME || null,
    eventId: process.env.TICKET_TAILOR_EVENT_ID || null,
    customDomain: process.env.TICKET_TAILOR_CUSTOM_DOMAIN || null,
  };
}

// ---- Webhook (order.created -> RegisteredUser) ----

export interface TicketTailorWebhookEnvelope {
  id: string;
  created_at: string;
  event: string;
  resource_url: string;
  payload: Record<string, unknown>;
}

export interface TicketPurchaser {
  email: string;
  name: string;
}

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

// Ticket Tailor signs webhooks as `key=<timestamp>,key=<hex signature>` where
// signature = HMAC-SHA256(timestamp + rawBody, sharedSecret). Parsed
// positionally (not by key name) to match Ticket Tailor's own reference
// implementation, since their docs don't confirm the literal key names.
export function verifyTicketTailorWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",");
  if (parts.length < 2) return false;

  const timestamp = parts[0].split("=")[1];
  const signature = parts[1].split("=")[1];
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("hex");

  let expectedBuf: Buffer;
  let providedBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    providedBuf = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

// Best-effort extraction across the plausible shapes Ticket Tailor's Order
// resource may use for its buyer fields — their docs site doesn't statically
// expose a payload example (it's rendered client-side). Verify this against
// a real delivery (dashboard -> Webhooks -> Send test webhook, or a real $0
// test purchase) and tighten the field paths once the true shape is known.
export function extractPurchaser(payload: Record<string, unknown>): TicketPurchaser | null {
  const buyer = (payload.buyer_details ??
    payload.buyer ??
    payload.customer ??
    payload.contact ??
    {}) as Record<string, unknown>;

  const rawEmail = payload.email ?? payload.buyer_email ?? buyer.email;
  if (typeof rawEmail !== "string" || !rawEmail.includes("@")) return null;
  const email = rawEmail.trim().toLowerCase();

  const firstName = typeof buyer.first_name === "string" ? buyer.first_name : "";
  const lastName = typeof buyer.last_name === "string" ? buyer.last_name : "";
  const joinedName = [firstName, lastName].filter(Boolean).join(" ");

  const rawName = payload.buyer_name ?? buyer.name ?? (joinedName || undefined);
  const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : email;

  return { email, name };
}
