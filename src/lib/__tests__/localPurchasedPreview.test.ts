import { describe, expect, it } from "vitest";
import { isLocalPurchasedTicketPreview } from "../localTicketPreview";

const env = { NODE_ENV: "development", LOCAL_PURCHASED_TICKET_PREVIEW: "true", MONGODB_DB_NAME: "CUSEC2027_dev" };

describe("local purchased-ticket preview isolation", () => {
  it("allows explicit loopback development previews", () => {
    for (const host of ["localhost", "localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
      expect(isLocalPurchasedTicketPreview(host, env)).toBe(true);
    }
  });
  it("requires the dedicated opt-in flag", () => {
    expect(isLocalPurchasedTicketPreview("localhost:3000", { ...env, LOCAL_PURCHASED_TICKET_PREVIEW: "false" })).toBe(false);
  });
  it("rejects production and hosted previews even on a spoofed localhost host", () => {
    expect(isLocalPurchasedTicketPreview("localhost", { ...env, NODE_ENV: "production" })).toBe(false);
    expect(isLocalPurchasedTicketPreview("localhost", { ...env, VERCEL_ENV: "preview" })).toBe(false);
    expect(isLocalPurchasedTicketPreview("localhost", { ...env, VERCEL_GIT_COMMIT_REF: "staging" })).toBe(false);
  });
  it("refuses any database other than the isolated dev database", () => {
    expect(isLocalPurchasedTicketPreview("localhost", { ...env, MONGODB_DB_NAME: "CUSEC2027" })).toBe(false);
    expect(isLocalPurchasedTicketPreview("localhost", { ...env, MONGODB_DB_NAME: undefined })).toBe(false);
  });
  it("rejects remote hosts and deceptive loopback prefixes", () => {
    for (const host of [null, "2027.cusec.net", "localhost.evil.com", "127.0.0.1.evil.com", "localhost:bad", "172.17.0.1:3000"]) {
      expect(isLocalPurchasedTicketPreview(host, env)).toBe(false);
    }
  });
});
