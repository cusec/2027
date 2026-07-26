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
  // Public event URL, e.g. https://buytickets.at/cusec/2329159. Computed
  // from boxOfficeName + eventId rather than a separate env var, so there is
  // a single source of truth for the event identity.
  eventUrl: string | null;
  // Same URL plus the query params Ticket Tailor's widget.js would append,
  // so it can be used as a plain <iframe src> without loading their script.
  checkoutEmbedUrl: string | null;
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
  const boxOfficeName = process.env.TICKET_TAILOR_BOX_OFFICE_NAME || null;
  const eventId = process.env.TICKET_TAILOR_EVENT_ID || null;
  const customDomain = process.env.TICKET_TAILOR_CUSTOM_DOMAIN || null;

  // Serving checkout from a custom domain that shares a registrable domain
  // with this site (e.g. tickets.2027.cusec.net under cusec.net) is what
  // makes the embedded checkout's cookies FIRST-party. Without it the
  // browser blocks them and Ticket Tailor deliberately bounces checkout to a
  // new tab ("Checkout has opened in a new tab or window") - so in-page
  // checkout genuinely cannot work until this is configured, and never works
  // on localhost. See the custom-domain note in docs/ticket-tailor.
  //
  // The event_series API reports its `url` as the buytickets.at short-domain,
  // but that 301s to this canonical path - use the canonical form directly so
  // the iframe doesn't eat a redirect hop on every open.
  const host = customDomain
    ? customDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")
    : "www.tickettailor.com";
  const eventUrl =
    boxOfficeName && eventId
      ? `https://${host}/events/${boxOfficeName}/${eventId}`
      : null;

  return {
    boxOfficeName,
    eventId,
    customDomain,
    eventUrl,
    // Query params copied from widget.js's own iframe-URL construction, so
    // the embed renders identically to their official widget without taking
    // on its script + iframe-resizer handshake (which silently leaves the
    // frame unsized and unscrollable when it fails).
    checkoutEmbedUrl: eventUrl
      ? `${eventUrl}?widget=true&minimal=true&show_logo=false&bg_fill=false`
      : null,
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

// Confirmed against a real Order via GET /v1/orders: buyer fields live under
// `buyer_details` (email, first_name, last_name, name). The other lookup
// paths are kept as defensive fallbacks in case of API/version variance.
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

export interface PurchasedTicket {
  ticketTypeId: string | null;
  name: string | null;
}

// Confirmed against a real Order via GET /v1/orders: `line_items[].item_id`
// is the purchased item's id and `.description` its display name.
//
// Line items aren't only ticket types - an order that includes a bundle
// lists the bundle (`bu_...`) alongside the ticket (`tt_...`), and the
// bundle can come first. So prefer the first `tt_`-prefixed item and only
// fall back to the first line item if there isn't one. Multi-ticket orders
// aren't disambiguated further; this is just for showing "which ticket you
// have" on the confirmation screen.
export function extractPurchasedTicket(payload: Record<string, unknown>): PurchasedTicket {
  const lineItems = (
    Array.isArray(payload.line_items) ? payload.line_items : []
  ) as Record<string, unknown>[];

  const ticketItem =
    lineItems.find(
      li => typeof li.item_id === "string" && li.item_id.startsWith("tt_")
    ) ?? lineItems[0];

  if (!ticketItem) return { ticketTypeId: null, name: null };

  return {
    ticketTypeId: typeof ticketItem.item_id === "string" ? ticketItem.item_id : null,
    name: typeof ticketItem.description === "string" ? ticketItem.description : null,
  };
}

// Looks up whether an email has a completed order, straight from the Ticket
// Tailor API. This is the reconciliation path that makes purchases detectable
// WITHOUT a registered webhook (and without the custom domain needed for
// in-page checkout) - see docs/ticket-tailor/REQUIRED.md.
//
// Note the API masks buyer PII on this key, so we can't verify the email by
// reading it back; we rely on the server-side `email=` filter instead. That
// filter is silently DROPPED for malformed addresses (returning unrelated
// orders), so the address is validated first - without that guard a bad
// address would look like "this person has a ticket".
export async function findCompletedOrderByEmail(
  email: string
): Promise<PurchasedTicket | null> {
  const apiKey = process.env.TICKET_TAILOR_API_KEY;
  if (!apiKey) return null;

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(normalized)) return null;

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(
      `https://api.tickettailor.com/v1/orders?email=${encodeURIComponent(normalized)}&limit=50`,
      { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );
    if (!res.ok) return null;

    const body = await res.json();
    const orders = (Array.isArray(body?.data) ? body.data : []) as Record<string, unknown>[];

    // Restrict to completed orders for the configured event, so a stale
    // order against some other event in the same box office can't be
    // mistaken for a ticket to this one.
    const eventId = process.env.TICKET_TAILOR_EVENT_ID;
    const match = orders.find(order => {
      if (order.status !== "completed") return false;
      if (!eventId) return true;
      const summary = (order.event_summary ?? {}) as Record<string, unknown>;
      const seriesId = String(summary.event_series_id ?? "");
      const evId = String(summary.event_id ?? "");
      return seriesId.endsWith(eventId) || evId.endsWith(eventId);
    });

    return match ? extractPurchasedTicket(match) : null;
  } catch {
    return null;
  }
}
