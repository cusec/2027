import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localTicketPreviewAllowed } from "../localTicketPreview";

const m = vi.hoisted(() => ({
  user: vi.fn(), profile: vi.fn(), registration: vi.fn(), headers: vi.fn(), connect: vi.fn(),
  database: "CUSEC2027_dev",
}));
vi.mock("next/headers", () => ({ headers: m.headers }));
vi.mock("../mongodb", () => ({ default: m.connect, get DB_NAME() { return m.database; } }));
vi.mock("../models", () => ({
  User: { findOne: () => ({ lean: m.user }) },
  DemographicInfo: { findOne: () => ({ select: () => ({ lean: m.profile }) }) },
  RegisteredUser: { findOne: () => ({ lean: m.registration }) },
}));
import { getWizardStatus } from "../ticketWizard";

const env: Record<string, string | undefined> = {
  NODE_ENV: "development", MONGODB_DB_NAME: "CUSEC2027_dev",
  LOCAL_TICKET_PREVIEW_EMAILS: "first@example.test, second@example.test",
};
describe("localhost purchased-status isolation", () => {
  it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "localhost"])("allows an explicit account on %s", host => {
    expect(localTicketPreviewAllowed("first@example.test", host, env, "CUSEC2027_dev")).toBe(true);
  });
  it("matches exact addresses without case or whitespace differences", () => {
    expect(localTicketPreviewAllowed(" SECOND@example.test ", "localhost", env, "CUSEC2027_dev")).toBe(true);
    expect(localTicketPreviewAllowed("first+other@example.test", "localhost", env, "CUSEC2027_dev")).toBe(false);
    expect(localTicketPreviewAllowed("", "localhost", env, "CUSEC2027_dev")).toBe(false);
  });
  it.each([null, "2027.cusec.net", "localhost.example.com", "localhost@evil.test", "localhost:3000,evil.test", "192.168.1.2:3000"])("denies non-loopback/malformed Host %s", host => {
    expect(localTicketPreviewAllowed("first@example.test", host, env, "CUSEC2027_dev")).toBe(false);
  });
  it.each([
    { NODE_ENV: "production" }, { NODE_ENV: "test" }, { VERCEL: "1" },
    { VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" },
    { VERCEL_GIT_COMMIT_REF: "staging" }, { MONGODB_DB_NAME: "CUSEC2027" },
    { LOCAL_TICKET_PREVIEW_EMAILS: "" }, { LOCAL_TICKET_PREVIEW_EMAILS: "other@example.test" },
  ])("denies unsafe or unconfigured environment %j", patch => {
    expect(localTicketPreviewAllowed("first@example.test", "localhost", { ...env, ...patch }, "CUSEC2027_dev")).toBe(false);
  });
  it("checks the resolved database independently of environment configuration", () => {
    expect(localTicketPreviewAllowed("first@example.test", "localhost", env, "CUSEC2027")).toBe(false);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  m.database = "CUSEC2027_dev";
  for (const key of ["NODE_ENV", "MONGODB_DB_NAME", "LOCAL_TICKET_PREVIEW_EMAILS", "VERCEL", "VERCEL_ENV", "VERCEL_GIT_COMMIT_REF"]) vi.stubEnv(key, env[key]);
  m.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
  m.user.mockResolvedValue({ _id: "existing-account" });
  m.profile.mockResolvedValue(null);
  m.registration.mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe("purchase preview in wizard status", () => {
  it.each(["first@example.test", "second@example.test"])("marks %s purchased without completing survey sections or inventing a ticket", async email => {
    expect(await getWizardStatus(email)).toEqual({
      profileComplete: false, interestsComplete: false, purchaseComplete: true,
      linkedEmail: email, purchasedTicketName: null,
    });
  });
  it("leaves other signed-in accounts unpurchased", async () => {
    expect((await getWizardStatus("other@example.test")).purchaseComplete).toBe(false);
  });
  it("supports an allowed first login without seeding a synthetic identity", async () => {
    m.user.mockResolvedValue(null);
    expect((await getWizardStatus("first@example.test")).purchaseComplete).toBe(true);
  });
  it("denies the preview with a hosted Host even if forwarded Host says localhost", async () => {
    m.headers.mockResolvedValue(new Headers({ host: "2027.cusec.net", "x-forwarded-host": "localhost:3000" }));
    expect((await getWizardStatus("first@example.test")).purchaseComplete).toBe(false);
  });
  it("preserves an existing real ticket and its linked email", async () => {
    m.user.mockResolvedValue({ _id: "existing-account", linked_email: "buyer@example.test", ticketWizard: { purchasedTicketName: "Existing admission" } });
    m.registration.mockResolvedValue({ isLinked: true });
    expect(await getWizardStatus("first@example.test")).toMatchObject({ purchaseComplete: true, linkedEmail: "buyer@example.test", purchasedTicketName: "Existing admission" });
  });
  it("does not read request headers when the opt-in is absent", async () => {
    vi.stubEnv("LOCAL_TICKET_PREVIEW_EMAILS", "");
    expect((await getWizardStatus("first@example.test")).purchaseComplete).toBe(false);
    expect(m.headers).not.toHaveBeenCalled();
  });
});
