import { describe, it, expect } from "vitest";
import { verifyVipOrder, vipConfig, belongsToEvent, isUpgradeTicket } from "../vipVerification";
import { extractPurchasedTicket } from "../ticketTailor";
const config = { eventId: "2415502", productId: "ao_vip", upgradeTicketId: "tt_free" };
function order(extra = {}) { return { id: "or_123", event_summary: { event_series_id: "es_2415502" }, status: "completed", total: 1500, total_paid: 1500, line_items: [{ item_id: "ao_vip", quantity: 1, total: 1500 }], refund_amount: 0,
 issued_tickets: [ { id: "it_free", ticket_type_id: "tt_free", status: "valid" }, { id: "it_vip", add_on_id: "ao_vip", status: "valid" } ], ...extra }; }
describe("verified VIP purchases", () => {
 it("requires complete product configuration", () => { expect(vipConfig({})).toBeNull(); });
 it("recognizes the paid upgrade by exact ids", () => { expect(verifyVipOrder(order(), config)).toMatchObject({ source: "upgrade", issuedTicketId: "it_vip" }); });
 it("recognizes VIP on an original single admission", () => { const o=order(); o.issued_tickets[0].ticket_type_id="tt_student"; expect(verifyVipOrder(o,config)?.source).toBe("initial-checkout"); });
 it("does not trust a VIP display name or the free ticket alone", () => { expect(verifyVipOrder(order({issued_tickets:[{id:"it_free",ticket_type_id:"tt_free",status:"valid",description:"VIP"}]}),config)).toBeNull(); });
 it("rejects a different event, pending payment, or missing payment evidence", () => {
  for (const extra of [{event_summary:{event_series_id:"es_other"}},{status:"pending"},{total_paid:0},{total_paid:undefined}]) expect(verifyVipOrder(order(extra),config)).toBeNull();
 });
 it("rejects refunds and cancelled orders",()=>{for(const extra of [{refund_amount:1500},{status:"cancelled"}])expect(verifyVipOrder(order(extra),config)).toBeNull();});
 it("rejects voided or different products",()=>{for(const product of [{id:"it_vip",add_on_id:"ao_vip",status:"voided"},{id:"it_vip",add_on_id:"ao_other",status:"valid",description:"VIP"}])expect(verifyVipOrder(order({issued_tickets:[order().issued_tickets[0],product]}),config)).toBeNull();});
 it("rejects ambiguous group orders or multiple VIP items",()=>{const o=order();expect(verifyVipOrder(order({issued_tickets:[...o.issued_tickets,{id:"it_other",status:"valid"}]}),config)).toBeNull();expect(verifyVipOrder(order({issued_tickets:[...o.issued_tickets,o.issued_tickets[1]]}),config)).toBeNull();});
 it("matches event ids exactly, not by suffix",()=>{expect(belongsToEvent({event_summary:{event_series_id:"es_12415502"}},config.eventId)).toBe(false);});
 it("excludes upgrade-only tickets from admission extraction even without configured ids",()=>{
  expect(isUpgradeTicket("tt_free","VIP Add-On: WITHOUT TICKET PURCHASE",config)).toBe(true);
  expect(extractPurchasedTicket({id:"or_123",line_items:[{item_id:"tt_free",description:"VIP Add-On: WITHOUT TICKET PURCHASE"}]}).ticketTypeId).toBeNull();
 });
});
