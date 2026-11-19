import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),status:vi.fn(),reconcile:vi.fn(),configured:vi.fn(),user:vi.fn()}));
vi.mock("@/lib/attendeeSession",()=>({getAttendeeSession:m.session}));
vi.mock("@/lib/ticketWizard",()=>({getWizardStatus:m.status}));
vi.mock("@/lib/vipService",()=>({reconcileVip:m.reconcile,vipCheckoutConfigured:m.configured}));
vi.mock("@/lib/models",()=>({User:{findOne:()=>({select:m.user})}}));
vi.mock("@/lib/ticketTailor",()=>({getTicketWidgetConfig:async()=>({checkoutEmbedUrl:"https://tickets.cusec.net/checkout/new-session/id/9084777?widget=true&modal_widget=true"})}));
import {GET,POST} from "../../app/api/vip/status/route";
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{email:"self@example.com"}});m.status.mockResolvedValue({purchaseComplete:true});m.user.mockResolvedValue({vip:{status:"active"},linked_email:"ticket@example.com"});m.configured.mockReturnValue(true);m.reconcile.mockResolvedValue({state:"verified",isVip:true});});
const request=(origin="http://localhost")=>new Request("http://localhost/api/vip/status",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({email:"victim@example.com",isVip:true})});
describe("VIP status API",()=>{
 it("requires authentication",async()=>{m.session.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await POST(request())).status).toBe(401);expect(m.reconcile).not.toHaveBeenCalled();});
 it("does not expose status or email for an unlinked account",async()=>{m.status.mockResolvedValue({purchaseComplete:false});expect((await GET()).status).toBe(403);expect(m.user).not.toHaveBeenCalled();});
 it("does not accept cross-origin activation requests",async()=>{expect((await POST(request("https://evil.example"))).status).toBe(403);expect(m.reconcile).not.toHaveBeenCalled();});
 it("ignores client email/flags and reconciles only the authenticated account",async()=>{expect((await POST(request())).status).toBe(200);expect(m.reconcile).toHaveBeenCalledWith("self@example.com");});
 it("preserves widget mode and the upgrade access code in the embedded URL",async()=>{const body=await(await GET()).json();const url=new URL(body.checkoutEmbedUrl);expect(url.searchParams.get("a")).toBe("VIPAddOn");expect(url.searchParams.get("widget")).toBe("true");expect(url.searchParams.get("modal_widget")).toBe("true");});
 it("returns private uncached status",async()=>{const r=await GET();expect(r.headers.get("Cache-Control")).toBe("private, no-store");expect(await r.json()).toMatchObject({isVip:true,checkoutEmail:"ticket@example.com"});});
 it("reports verification unavailable without granting success",async()=>{m.reconcile.mockRejectedValue(new Error("offline"));const r=await POST(request());expect(r.status).toBe(503);expect(await r.json()).toEqual({state:"unavailable",isVip:null});});
});
