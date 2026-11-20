import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), intl: vi.fn() }));
vi.mock("../auth0", () => ({ auth0: { middleware: m.auth } }));
vi.mock("next-intl/middleware", () => ({ default: () => m.intl }));
vi.mock("../../i18n/routing", () => ({ routing: {} }));
import { proxy } from "../../proxy";

const request = (path: string, cookie?: string) => new NextRequest(`http://localhost:3000${path}`, {
  headers: cookie ? { cookie: `cusec-local-test-session=${cookie}` } : {},
});
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockImplementation(async () => {
    const response = NextResponse.next();
    response.cookies.set("__session", "refreshed-auth-session", { httpOnly: true });
    return response;
  });
  m.intl.mockImplementation(() => NextResponse.next());
});

describe("Auth0 proxy session handling", () => {
  it.each([undefined, "basic:legacy-test-cookie", "vip:legacy-test-cookie"])("uses Auth0 regardless of obsolete test cookies: %s", async cookie => {
    const response = await proxy(request("/tickets/profile", cookie));
    expect(m.auth).toHaveBeenCalledOnce();
    expect(m.intl).toHaveBeenCalledOnce();
    expect(response.cookies.get("__session")?.value).toBe("refreshed-auth-session");
  });
  it.each(["/auth/logout", "/auth/callback"])("always sends %s through Auth0", async path => {
    await proxy(request(path, "basic:legacy-test-cookie"));
    expect(m.auth).toHaveBeenCalledOnce();
    expect(m.intl).not.toHaveBeenCalled();
  });
  it("preserves an Auth0 redirect without passing it through locale handling", async () => {
    m.auth.mockResolvedValue(NextResponse.redirect("http://localhost:3000/auth/login"));
    const response = await proxy(request("/profile"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login");
    expect(m.intl).not.toHaveBeenCalled();
  });
});
