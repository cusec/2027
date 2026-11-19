import connectMongoDB from "./mongodb";
import { User, RegisteredUser, VipPurchase } from "./models";
import { vipConfig, verifyVipOrder, belongsToEvent, isUpgradeTicket } from "./vipVerification";
import { findTicketByEmail } from "./ticketTailor";

type Order = Record<string, unknown>;
async function read(path: string): Promise<Order> {
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) throw new Error("vip-not-configured");
  const response = await fetch(`https://api.tickettailor.com/v1/${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("vip-verification-unavailable");
  return response.json();
}
export function vipCheckoutConfigured() { return process.env.VIP_UPGRADES_ENABLED === "true" && !!vipConfig() && !!process.env.TICKET_TAILOR_API_KEY; }

/** Shared by authenticated reconciliation and signed webhooks. All evidence is fetched server-side.
 * Unknown/network failures never grant or revoke. Source records and summary commit atomically. */
export async function reconcileVip(email: string, changedOrderId?: string, dryRun = false) {
  const config = vipConfig();
  if (!config || !process.env.TICKET_TAILOR_API_KEY || (!dryRun && !vipCheckoutConfigured())) return { state: "unconfigured", isVip: null };
  await connectMongoDB();
  const user = await User.findOne({ email });
  if (!user?.linked_email || !await RegisteredUser.exists({ linkedEmail: user.linked_email, isLinked: true })) return { state: "ticket-required", isVip: false };
  const linked = user.linked_email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(linked)) return { state: "ticket-required", isVip: false };
  let originalId = user.ticketWizard?.purchasedOrderId;
  let originalTicketId = user.ticketWizard?.purchasedTicketId;
  if (!originalId) {
    const admission = await findTicketByEmail(linked);
    originalId = admission?.orderId; originalTicketId = admission?.ticketId;
  }
  if (!originalId || !/^or_[a-zA-Z0-9]+$/.test(originalId)) return { state: "admission-unverified", isVip: null };
  const original = await read(`orders/${originalId}`);
  if (!belongsToEvent(original, config.eventId)) return { state: "admission-unverified", isVip: null };
  const admissions = ((original.issued_tickets ?? []) as Order[]).filter(t => t.status === "valid" && !t.add_on_id && !isUpgradeTicket(t.ticket_type_id, t.description, config));
  const hasAdmission = original.status === "completed" && (originalTicketId ? admissions.some(t => t.id === originalTicketId) : admissions.length === 1);
  const candidates = new Map<string, Order>([[originalId, original]]);
  let after = "";
  // Must finish pagination before concluding that no upgrade exists.
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ email: linked, event_series_id: `es_${config.eventId.replace(/^es_/, "")}`, limit: "100" });
    if (after) params.set("starting_after", after);
    const result = await read(`orders?${params}`);
    const rows = (Array.isArray(result.data) ? result.data : []) as Order[];
    for (const row of rows) if (typeof row.id === "string") candidates.set(row.id, row);
    if (!(result.links as Order | undefined)?.next) break;
    if (page === 19 || !rows.length) throw new Error("vip-verification-incomplete");
    after = String(rows[rows.length - 1].id);
  }
  // Re-fetch known records, including cancelled orders omitted by a list filter.
  const previous = await VipPurchase.find({ user: user._id }).lean();
  const ids = new Set([...candidates.keys(), ...previous.map(p => p.orderId), ...(changedOrderId ? [changedOrderId] : [])]);
  const evidence: NonNullable<ReturnType<typeof verifyVipOrder>>[] = [];
  const checked = new Map<string, Order>();
  for (const id of ids) {
    if (!/^or_[a-zA-Z0-9]+$/.test(id)) continue;
    const order = id === originalId ? original : await read(`orders/${id}`);
    if (!belongsToEvent(order, config.eventId)) continue;
    checked.set(id, order);
    // A webhook-supplied id does not establish ownership: it must be returned by
    // the linked-email lookup, or already owned by this attendee in our ledger.
    if (!candidates.has(id) && !previous.some(p => p.orderId === id)) continue;
    const verified = hasAdmission ? verifyVipOrder(order, config) : null;
    if (verified && (verified.source === "upgrade" || (id === originalId && (!originalTicketId || verified.baseTicketId === originalTicketId)))) evidence.push(verified);
  }
  if (dryRun) return { state: "dry-run", isVip: evidence.length > 0, purchases: evidence.length, legacy: !user.vip };
  await VipPurchase.init(); // Wait for the unique ownership index before accepting purchases.
  const session = await User.startSession();
  try {
    await session.withTransaction(async () => {
      // Preserve order ownership and serialize concurrent retries against unique issuedTicketId.
      for (const item of evidence) {
        await VipPurchase.updateOne({ issuedTicketId: item.issuedTicketId, user: user._id }, {
          $set: { ...item, status: "active", verifiedAt: new Date() }, $setOnInsert: { user: user._id },
        }, { upsert: true, session });
      }
      const validIds = evidence.map(p => p.issuedTicketId);
      await VipPurchase.updateMany({ user: user._id, orderId: { $in: [...checked.keys()] }, issuedTicketId: { $nin: validIds } }, { $set: { status: "revoked", verifiedAt: new Date() } }, { session });
      const active = await VipPurchase.findOne({ user: user._id, status: "active" }).session(session).sort({ purchasedAt: 1 });
      await User.updateOne({ _id: user._id }, { $set: { vip: {
        status: active ? "active" : previous.length ? "revoked" : "none", purchaseSource: active?.source ?? null,
        orderId: active?.orderId ?? null, addOnId: active?.addOnId ?? null,
        purchasedAt: active?.purchasedAt ?? null, verifiedAt: new Date(),
      } } }, { session, runValidators: true });
    });
  } finally { await session.endSession(); }
  return { state: "verified", isVip: evidence.length > 0 };
}
