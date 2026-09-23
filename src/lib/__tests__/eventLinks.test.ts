import { describe, expect, it } from "vitest";
import { EVENT_ID_PATTERN, eventIdFrom } from "../eventLinks";

describe("eventIdFrom", () => {
  it("makes stable IDs for accented event names and dates", () => {
    expect(eventIdFrom("Rencontre à Montréal", "2026-09-24")).toBe("rencontre-a-montreal-2026-09-24");
    expect(eventIdFrom("Rencontre à Montréal", "2026-09-25")).toBe("rencontre-a-montreal-2026-09-25");
  });

  it("rejects invalid dates and names without usable characters", () => {
    expect(eventIdFrom("Montréal", "2026-02-30")).toBeNull();
    expect(eventIdFrom("***", "2026-09-24")).toBeNull();
  });

  it("keeps long IDs within the signup route limit", () => {
    const id = eventIdFrom("An exceptionally long name for a meetup with many details", "2026-09-24");
    expect(id).not.toBeNull();
    expect(id).toMatch(EVENT_ID_PATTERN);
    expect(id?.length).toBeLessThanOrEqual(64);
  });
});
