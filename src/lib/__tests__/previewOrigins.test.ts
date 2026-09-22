import { describe, expect, it } from "vitest";
import { previewAuth0Credentials, previewOrigins } from "../previewOrigins";

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

describe("previewAuth0Credentials", () => {
  it("selects separate credentials only on Vercel previews", () => {
    const env = {
      AUTH0_PREVIEW_CLIENT_ID: "preview-client",
      AUTH0_PREVIEW_CLIENT_SECRET: "preview-secret",
    };

    expect(previewAuth0Credentials({ ...env, VERCEL_ENV: "preview" })).toEqual({
      clientId: "preview-client",
      clientSecret: "preview-secret",
    });
    expect(previewAuth0Credentials({ ...env, VERCEL_ENV: "production" })).toBeNull();
  });

  it("rejects an incomplete preview credential pair", () => {
    expect(() => previewAuth0Credentials({
      VERCEL_ENV: "preview",
      AUTH0_PREVIEW_CLIENT_ID: "preview-client",
    })).toThrow("Both preview Auth0 credentials must be configured together");
  });
});
