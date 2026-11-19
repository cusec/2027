import { describe, expect, it } from "vitest";
import { parseProfileSettings } from "../profileSettings";

const sponsor = { group: "sponsor", sponsorConsent: false, opportunities: [], opportunitiesOther: "", techAreas: [], techAreasOther: "", workLocations: [], workArrangement: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "" };

describe("attendee profile editor boundaries", () => {
  it("allows withdrawing consent and clearing sponsor preferences", () => {
    const result = parseProfileSettings(sponsor);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields.sponsorConsent).toBe(false);
  });
  it("never admits client-supplied ownership, tickets or progress", () => {
    const result = parseProfileSettings({ ...sponsor, email: "someone@example.com", user: "other", sections: { basics: null }, ticketWizard: { currentStep: "completed" }, linked_email: "other" });
    expect(result.ok).toBe(true);
    if (result.ok) for (const key of ["email", "user", "sections", "ticketWizard", "linked_email"]) expect(result.fields).not.toHaveProperty(key);
  });
  it("rejects invalid options, excess selections, and incompatible choices", () => {
    expect(parseProfileSettings({ ...sponsor, opportunities: ["unrecognized"] }).ok).toBe(false);
    expect(parseProfileSettings({ ...sponsor, techAreas: Array(6).fill("web") }).ok).toBe(false);
    expect(parseProfileSettings({ ...sponsor, opportunities: ["not-looking", "internship"] }).ok).toBe(false);
    expect(parseProfileSettings({ ...sponsor, sponsorConsent: "true" }).ok).toBe(false);
  });
  it("rejects unsafe links rather than storing them", () => {
    expect(parseProfileSettings({ ...sponsor, portfolioUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseProfileSettings({ ...sponsor, linkedinUrl: "https://evil.example/in/me" }).ok).toBe(false);
  });
  it("whitelists travel plans without accepting registration progress", () => {
    const result = parseProfileSettings({ group: "travel", transport: "train", transportOther: "", delegation: "no", delegationSchool: "", delegationOther: "", connectWithSchool: "later", travelFunding: "no", accommodation: "yes", travelCountry: "CA", travelRegion: "QC", travelCity: "Montréal", postalCode: "H3A 0G4", sections: { travel: null } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields).not.toHaveProperty("sections");
  });
  it("accepts known avatar poses only", () => {
    expect(parseProfileSettings({ group: "avatar", avatarPose: "book" })).toEqual({ ok: true, group: "avatar", fields: { avatarPose: "book" } });
    expect(parseProfileSettings({ group: "avatar", avatarPose: "../../admin" }).ok).toBe(false);
  });
  it("requires an explicit boolean for résumé roast consent", () => {
    expect(parseProfileSettings({ group: "resume", resumeRoast: false }).ok).toBe(true);
    expect(parseProfileSettings({ group: "resume", resumeRoast: "yes" }).ok).toBe(false);
  });
  it("limits account edits to name and supported pronouns", () => {
    const result = parseProfileSettings({ group: "account", firstName: " Alex ", lastName: "Chen", pronoun: "they-them", email: "change@example.com", roles: ["Admin"] });
    expect(result).toEqual({ ok: true, group: "account", fields: { firstName: "Alex", lastName: "Chen", pronoun: "they-them" } });
    expect(parseProfileSettings({ group: "account", firstName: "", lastName: "Chen", pronoun: "" }).ok).toBe(false);
  });
});


it("uses trusted sponsor roles and never grants VIP from a ticket name", async () => {
  const { getProfileEntitlements } = await import("../profileSettings");
  expect(getProfileEntitlements([])).toEqual({ isSponsor: false, isVip: false });
  expect(getProfileEntitlements(["Sponsor"])).toEqual({ isSponsor: true, isVip: false });
  expect(getProfileEntitlements(["Admin"]).isSponsor).toBe(false);
});
