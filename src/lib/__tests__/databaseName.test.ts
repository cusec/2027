import { describe, expect, it } from "vitest";
import { databaseName } from "../databaseName";

describe("conference database selection", () => {
  it("ignores test database overrides in production", () => {
    expect(databaseName({ VERCEL_ENV: "production", MONGODB_DB_NAME: "CUSEC2027_dev" })).toBe("CUSEC2027");
  });
  it("ignores test database overrides on the deployed staging branch", () => {
    expect(databaseName({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging", MONGODB_DB_NAME: "CUSEC2027_dev" })).toBe("CUSEC2027");
  });
  it("preserves isolation for feature previews and local development", () => {
    expect(databaseName({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "khush/speakers", MONGODB_DB_NAME: "CUSEC2027_dev" })).toBe("CUSEC2027_dev");
    expect(databaseName({ MONGODB_DB_NAME: "CUSEC2027_dev" })).toBe("CUSEC2027_dev");
  });
  it("defaults to the established database", () => {
    expect(databaseName({})).toBe("CUSEC2027");
  });
});
