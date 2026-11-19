import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({ user:vi.fn(),exists:vi.fn(),purchases:vi.fn(),update:vi.fn(),revoke:vi.fn(),summary:vi.fn(),active:vi.fn(),init:vi.fn(),end:vi.fn(),fallback:vi.fn() }));
vi.mock("../mongodb",()=>({default:vi.fn()}));
vi.mock("../ticketTailor",()=>({findTicketByEmail:m.fallback}));
vi.mock("../models",()=>({
 User:{findOne:m.user,updateOne:m.summary,startSession:async()=>({withTransaction:async(fn:()=>Promise<void>)=>fn(),endSession:m.end})},
 RegisteredUser:{exists:m.exists},
 VipPurchase:{find:()=>({lean:m.purchases}),init:m.init,updateOne:m.update,updateMany:m.revoke,findOne:()=>({session:()=>({sort:m.active})})}
}));
import { reconcileVip } from "../vipService";
const original={id:"or_original",status:"completed",event_summary:{event_series_id:"es_2415502"},issued_tickets:[{id:"it_admission",ticket_type_id:"tt_student",status:"valid"}]};
const upgrade={id:"or_upgrade",status:"completed",total:1500,total_paid:1500,line_items:[{item_id:"ao_vip",quantity:1,total:1500}],event_summary:{event_series_id:"es_2415502"},issued_tickets:[{id:"it_free",ticket_type_id:"tt_free",status:"valid"},{id:"it_vip",add_on_id:"ao_vip",status:"valid"}]};
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv("VIP_UPGRADES_ENABLED","true");vi.stubEnv("TICKET_TAILOR_API_KEY","test");vi.stubEnv("TICKET_TAILOR_EVENT_ID","2415502");vi.stubEnv("TICKET_TAILOR_VIP_PRODUCT_ID","ao_vip");vi.stubEnv("TICKET_TAILOR_UPGRADE_TICKET_ID","tt_free");
 m.user.mockResolvedValue({_id:"self",email:"self@example.com",linked_email:"ticket@example.com",ticketWizard:{purchasedOrderId:"or_original",purchasedTicketId:"it_admission"}});
 m.exists.mockResolvedValue(true);m.purchases.mockResolvedValue([]);m.active.mockResolvedValue({source:"upgrade",orderId:"or_upgrade",addOnId:"ao_vip"});m.update.mockResolvedValue({});
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>new Response(JSON.stringify(url.includes("orders?")?{data:[upgrade],links:{}}:url.endsWith("or_original")?original:upgrade),{status:200})));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("VIP ownership and persistence",()=>{
 it("commits the entitlement and source record without changing the admission",async()=>{
  expect(await reconcileVip("self@example.com")).toMatchObject({isVip:true,state:"verified"});
  expect(m.update.mock.calls[0][0]).toEqual({issuedTicketId:"it_vip",user:"self"});
  expect(Object.keys(m.summary.mock.calls[0][1].$set)).toEqual(["vip"]);
  expect(m.end).toHaveBeenCalled();
 });
 it("does not write during a dry run",async()=>{expect(await reconcileVip("self@example.com",undefined,true)).toMatchObject({state:"dry-run",isVip:true});expect(m.update).not.toHaveBeenCalled();expect(m.summary).not.toHaveBeenCalled();});
 it("never grants or revokes on upstream failure",async()=>{vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("network")));await expect(reconcileVip("self@example.com")).rejects.toThrow();expect(m.update).not.toHaveBeenCalled();expect(m.revoke).not.toHaveBeenCalled();});
 it("refuses accounts without an admission link",async()=>{m.exists.mockResolvedValue(false);expect(await reconcileVip("self@example.com")).toMatchObject({state:"ticket-required"});expect(fetch).not.toHaveBeenCalled();});
 it("does not let a second account claim the same product",async()=>{m.update.mockRejectedValue(Object.assign(new Error("duplicate"),{code:11000}));await expect(reconcileVip("self@example.com")).rejects.toThrow("duplicate");expect(m.summary).not.toHaveBeenCalled();});
 it("does not infer webhook order ownership without the email-filtered match",async()=>{vi.stubGlobal("fetch",vi.fn(async(url:string)=>new Response(JSON.stringify(url.includes("orders?")?{data:[],links:{}}:url.endsWith("or_original")?original:upgrade))));expect(await reconcileVip("self@example.com","or_upgrade",true)).toMatchObject({isVip:false,purchases:0});});
 it("revokes a previously recorded cancelled purchase",async()=>{m.purchases.mockResolvedValue([{orderId:"or_upgrade"}]);m.active.mockResolvedValue(null);vi.stubGlobal("fetch",vi.fn(async(url:string)=>new Response(JSON.stringify(url.includes("orders?")?{data:[],links:{}}:url.endsWith("or_original")?original:{...upgrade,status:"cancelled"}))));expect(await reconcileVip("self@example.com")).toMatchObject({isVip:false});expect(m.revoke).toHaveBeenCalled();expect(m.summary.mock.calls[0][1].$set.vip.status).toBe("revoked");});
 it("fails closed when disabled",async()=>{vi.stubEnv("VIP_UPGRADES_ENABLED","false");expect(await reconcileVip("self@example.com")).toMatchObject({state:"unconfigured"});expect(fetch).not.toHaveBeenCalled();});
});
