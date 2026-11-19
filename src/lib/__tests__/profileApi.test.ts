import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), status: vi.fn(), connect: vi.fn(), user: vi.fn(), current: vi.fn(), demographicsUpdate: vi.fn(), userUpdate: vi.fn(), path: vi.fn() }));
vi.mock("@/lib/attendeeSession", () => ({ getAttendeeSession: m.session }));
vi.mock("@/lib/ticketWizard", () => ({ getWizardStatus: m.status }));
vi.mock("@/lib/mongodb", () => ({ default: m.connect }));
vi.mock("@/lib/models", () => ({
  User: { findOne: () => ({ select: m.user }), updateOne: m.userUpdate },
  DemographicInfo: { findOne: () => ({ select: m.current }), updateOne: m.demographicsUpdate },
}));
vi.mock("@/lib/profileSettings", () => import("../profileSettings"));
vi.mock("@/lib/travelLocation", () => import("../travelLocation"));
vi.mock("next/cache", () => ({ revalidatePath: m.path }));
import { PATCH } from "../../app/api/profile/route";
const request = (body: unknown) => new Request("http://localhost/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue({ user: { email: "self@example.com" } });
  m.status.mockResolvedValue({ purchaseComplete: true });
  m.user.mockResolvedValue({ _id: "self-id" });
  m.current.mockResolvedValue(null);
  m.demographicsUpdate.mockResolvedValue({ matchedCount: 1 });
});
const sponsorRequest = { group: "sponsor", sponsorConsent: false, opportunities: [], opportunitiesOther: "", techAreas: [], techAreasOther: "", workLocations: [], workArrangement: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "" };
describe("sponsor editor authorization", () => {
  it("rejects ordinary ticket holders even when they send a sponsor role in the body", async () => {
    expect((await PATCH(request({ ...sponsorRequest, roles: ["Sponsor"] }))).status).toBe(403);
    expect(m.demographicsUpdate).not.toHaveBeenCalled();
  });
  it("allows the authenticated Sponsor role to update its own preferences", async () => {
    m.session.mockResolvedValue({ user: { email: "self@example.com", "cusec/roles": ["Sponsor"] } });
    expect((await PATCH(request(sponsorRequest))).status).toBe(200);
    expect(m.demographicsUpdate.mock.calls[0][0]).toEqual({ user: "self-id" });
  });
});
describe("profile updates are owned and ticket-gated", () => {
  it("rejects anonymous users before database writes", async () => {
    m.session.mockResolvedValue(null);
    expect((await PATCH(request({ group: "avatar", avatarPose: "book" }))).status).toBe(401);
    expect(m.demographicsUpdate).not.toHaveBeenCalled();
    expect(m.userUpdate).not.toHaveBeenCalled();
  });
  it("rejects accounts without a verified linked ticket", async () => {
    m.status.mockResolvedValue({ purchaseComplete: false });
    expect((await PATCH(request({ group: "avatar", avatarPose: "book" }))).status).toBe(403);
    expect(m.connect).not.toHaveBeenCalled();
  });
  it("scopes avatar updates to the signed-in user's record", async () => {
    expect((await PATCH(request({ group: "avatar", avatarPose: "book", user: "victim-id", roles: ["Admin"] }))).status).toBe(200);
    expect(m.userUpdate).toHaveBeenCalledWith({ _id: "self-id" }, { $set: { avatarPose: "book" } }, { runValidators: true });
  });
  it("requires an uploaded résumé before accepting roast consent", async () => {
    m.demographicsUpdate.mockResolvedValue({ matchedCount: 0 });
    const response = await PATCH(request({ group: "resume", resumeRoast: true }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "resume-required" });
    expect(m.demographicsUpdate.mock.calls[0][0]).toEqual({ user: "self-id", resumePublicId: { $exists: true, $ne: "" } });
  });
  it("can withdraw roast consent without touching sponsor consent or progress", async () => {
    expect((await PATCH(request({ group: "resume", resumeRoast: false }))).status).toBe(200);
    expect(m.demographicsUpdate).toHaveBeenCalledWith({ user: "self-id" }, { $set: { resumeRoast: false, resumeRoastConsentAt: null } }, { upsert: true, runValidators: true });
  });
});
