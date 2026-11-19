import { NextResponse } from "next/server";
import { isLocalPurchasedTicketPreview } from "@/lib/localTicketPreview";
import { LOCAL_LOGIN_COOKIE, localCredentials, signLocalAccount } from "@/lib/localTestAccounts";
import { seedLocalTestAccount } from "@/lib/localTestAccountSeed";
export async function POST(request: Request) {
  if (!isLocalPurchasedTicketPreview(request.headers.get("host"))) return new NextResponse(null, { status: 404 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const form = await request.formData();
  const account = localCredentials(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
  if (!account) return NextResponse.redirect(new URL("/local-login?error=1", request.url), 303);
  await seedLocalTestAccount(account);
  const response = NextResponse.redirect(new URL("/profile", request.url), 303);
  response.cookies.set(LOCAL_LOGIN_COOKIE, signLocalAccount(account), { httpOnly: true, sameSite: "strict", secure: false, path: "/", maxAge: 8 * 60 * 60 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
