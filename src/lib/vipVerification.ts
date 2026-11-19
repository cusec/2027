/** Pure, fail-closed rules. Names, client flags and free upgrade tickets are not entitlements. */
export interface VipConfig { eventId: string; productId: string; upgradeTicketId: string; }
export function vipConfig(env: Record<string, string | undefined> = process.env): VipConfig | null {
  const eventId = env.TICKET_TAILOR_EVENT_ID;
  const productId = env.TICKET_TAILOR_VIP_PRODUCT_ID;
  const upgradeTicketId = env.TICKET_TAILOR_UPGRADE_TICKET_ID;
  return eventId && productId && upgradeTicketId ? { eventId, productId, upgradeTicketId } : null;
}
type Row = Record<string, unknown>;
export function belongsToEvent(order: Row, eventId: string): boolean {
  const summary = order.event_summary as Row | undefined;
  return !!summary && [summary.event_series_id, summary.event_id].some(id => id === eventId || id === `es_${eventId}` || id === `ev_${eventId}`);
}
export function isUpgradeTicket(id: unknown, name: unknown, config = vipConfig()): boolean {
  return (!!config && id === config.upgradeTicketId) || /VIP Add-On:\s*WITHOUT TICKET PURCHASE/i.test(String(name ?? ""));
}
export function verifyVipOrder(order: Row, config: VipConfig) {
  if (!belongsToEvent(order, config.eventId) || order.status !== "completed") return null;
  // Completed orders may still have offline payment outstanding. Never grant for those.
  if (typeof order.total !== "number" || order.total <= 0 || typeof order.total_paid !== "number" || order.total_paid < order.total || Number(order.refund_amount ?? 0) > 0) return null;
  const lines = (Array.isArray(order.line_items) ? order.line_items : []) as Row[];
  const paidProduct = lines.filter(item => item.item_id === config.productId && item.quantity === 1 && typeof item.total === "number" && item.total > 0);
  if (paidProduct.length !== 1) return null;
  const issued = (Array.isArray(order.issued_tickets) ? order.issued_tickets : []) as Row[];
  const base = issued.filter(t => !t.add_on_id && t.status === "valid");
  const products = issued.filter(t => t.status === "valid" && t.add_on_id === config.productId);
  if (base.length !== 1 || products.length !== 1 || typeof products[0].id !== "string") return null;
  if (typeof order.id !== "string" || !order.id.startsWith("or_")) return null;
  return { orderId: order.id, addOnId: config.productId, issuedTicketId: products[0].id,
    baseTicketId: String(base[0].id), source: base[0].ticket_type_id === config.upgradeTicketId ? "upgrade" as const : "initial-checkout" as const,
    purchasedAt: typeof order.created_at === "number" ? new Date(order.created_at * 1000) : null };
}
