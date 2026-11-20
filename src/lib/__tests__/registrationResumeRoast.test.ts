import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), profile: vi.fn(), update: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: m.session } }));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/analytics/server", () => ({ trackServerEvent: vi.fn() }));
vi.mock("@/lib/userService", () => ({ ensureAnalyticsId: async () => "anonymous-test-id" }));
vi.mock("@/lib/travelLocation", () => import("../travelLocation"));
vi.mock("@/lib/institutions", () => import("../institutions"));
vi.mock("@/lib/ticketWizardOptions", () => import("../ticketWizardOptions"));
vi.mock("@/lib/models", () => ({
  User: { findOne: m.user },
  DemographicInfo: {
    findOne: () => ({ select: () => ({ lean: m.profile }) }),
    findOneAndUpdate: (...args: unknown[]) => ({ select: () => ({ lean: () => m.update(...args) }) }),
  },
}));

import { PUT } from "../../app/api/demographics/route";
import { answersFrom } from "../../app/components/TicketWizard/profileAnswers";

const sections = Object.fromEntries(["basics", "background", "goals", "travel", "experience", "links"].map(key => [key, new Date()]));
const request = (answers: Record<string, unknown>) => new Request("http://localhost/api/demographics", {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "links", answers }),
});
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({ user: { email: "self@example.com" } });
  m.user.mockResolvedValue({ _id: "self-id", ticketWizard: { currentStep: "interests" }, save: m.save });
  m.profile.mockResolvedValue({ sponsorConsent: false, sections });
  m.update.mockResolvedValue({ sections });
});

describe("registration resume-roast consent", () => {
  it("defaults to no consent and restores the saved choice on return", () => {
    expect(answersFrom(null).resumeRoast).toBe(false);
    expect(answersFrom({ resumeRoast: true }).resumeRoast).toBe(true);
  });
  it("records opt-in and a server timestamp without opting into sponsor sharing", async () => {
    expect((await PUT(request({ resumeRoast: true, sponsorConsent: false, user: "other-id", resumeRoastConsentAt: "fake" }))).status).toBe(200);
    const [filter, update, options] = m.update.mock.calls[0];
    expect(filter).toEqual({ user: "self-id", resumePublicId: { $exists: true, $ne: "" } });
    expect(update.$set).toMatchObject({ resumeRoast: true, resumeRoastConsentAt: expect.any(Date), sponsorConsent: false });
    expect(options.upsert).toBe(false);
  });
  it("preserves the first consent timestamp on repeat saves", async () => {
    const consentAt = new Date("2026-11-01T12:00:00Z");
    m.profile.mockResolvedValue({ sections, resumeRoastConsentAt: consentAt });
    await PUT(request({ resumeRoast: true }));
    expect(m.update.mock.calls[0][1].$set.resumeRoastConsentAt).toBe(consentAt);
  });
  it("rejects opt-in when no resume exists, including concurrent deletion", async () => {
    m.update.mockResolvedValue(null);
    const response = await PUT(request({ resumeRoast: true, resumePublicId: "forged-file" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid-answer", field: "resumeRoast" });
    expect(m.save).not.toHaveBeenCalled();
  });
  it("allows declining roast participation independently of sponsor sharing", async () => {
    expect((await PUT(request({ resumeRoast: false, sponsorConsent: true }))).status).toBe(200);
    expect(m.update.mock.calls[0][1].$set).toMatchObject({ resumeRoast: false, resumeRoastConsentAt: null, sponsorConsent: true });
    expect(m.update.mock.calls[0][0]).toEqual({ user: "self-id" });
  });
  it.each(["true", 1, null])("rejects non-boolean consent: %s", async value => {
    expect((await PUT(request({ resumeRoast: value }))).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("preserves consent when an older client omits the new field", async () => {
    expect((await PUT(request({ sponsorConsent: true }))).status).toBe(200);
    const update = m.update.mock.calls[0][1].$set;
    expect(update).not.toHaveProperty("resumeRoast");
    expect(update).not.toHaveProperty("resumeRoastConsentAt");
  });
  it("rejects unauthenticated changes", async () => {
    m.session.mockResolvedValue(null);
    expect((await PUT(request({ resumeRoast: true }))).status).toBe(401);
    expect(m.update).not.toHaveBeenCalled();
  });
});
