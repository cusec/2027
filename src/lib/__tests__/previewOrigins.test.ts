import { describe, expect, it } from "vitest";
import { previewOrigins } from "../previewOrigins";

describe("previewOrigins", () => {
  it("allows the branch and deployment hosts on Vercel previews", () => {
    expect(previewOrigins({
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "site-git-feature.vercel.app",
      VERCEL_URL: "site-abc123.vercel.app",
    })).toEqual([
      "https://site-git-feature.vercel.app",
      "https://site-abc123.vercel.app",
    ]);
  });

  it("leaves production on its configured origin", () => {
    expect(previewOrigins({ VERCEL_ENV: "production", VERCEL_BRANCH_URL: "site-git-feature.vercel.app" })).toEqual([]);
  });
});
