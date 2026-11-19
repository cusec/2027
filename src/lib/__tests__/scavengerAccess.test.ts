import { afterEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
vi.mock("./attendeeSession", () => ({ getAttendeeSession: session }));
vi.mock("../attendeeSession", () => ({ getAttendeeSession: session }));
import { getScavengerAccess } from "../scavengerAccess";
afterEach(() => vi.unstubAllEnvs());
describe("conference hunt feature flags", () => {
  it("keeps all hunt navigation routes closed before the hunt opens", async () => {
    session.mockResolvedValue({ user: { email: "delegate@example.com" } });
    vi.stubEnv("SCAVENGER_HUNT_ENABLED", "false"); vi.stubEnv("SUBMISSIONS_ENABLED", "true");
    const access = await getScavengerAccess();
    expect(access.huntOpen).toBe(false); expect(access.submissionsOpen).toBe(false); expect(access.anyOpen).toBe(false);
  });
  it("opens the hunt and respects the separate submissions switch", async () => {
    session.mockResolvedValue({ user: { email: "delegate@example.com" } });
    vi.stubEnv("SCAVENGER_HUNT_ENABLED", "true"); vi.stubEnv("SUBMISSIONS_ENABLED", "false");
    expect((await getScavengerAccess()).submissionsOpen).toBe(false);
    vi.stubEnv("SUBMISSIONS_ENABLED", "true");
    expect((await getScavengerAccess()).submissionsOpen).toBe(true);
  });
  it("preserves staff access to prepare the conference", async () => {
    session.mockResolvedValue({ user: { "cusec/roles": ["Volunteer"] } });
    vi.stubEnv("SCAVENGER_HUNT_ENABLED", "false"); vi.stubEnv("SUBMISSIONS_ENABLED", "false");
    expect((await getScavengerAccess()).anyOpen).toBe(true);
  });
});
