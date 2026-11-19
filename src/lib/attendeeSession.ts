import "server-only";
import { cache } from "react";
import { headers, cookies } from "next/headers";
import { auth0 } from "./auth0";
import { isLocalPurchasedTicketPreview } from "./localTicketPreview";
import { LOCAL_LOGIN_COOKIE, LOCAL_ACCOUNTS, readLocalAccount } from "./localTestAccounts";
export const LOCAL_PURCHASED_EMAIL = "local-purchased-preview@cusec.dev";
/** Local identities require a signed session and the existing localhost/dev guards. */
export const getAttendeeSession = cache(async () => {
  const host = (await headers()).get("host");
  if (!isLocalPurchasedTicketPreview(host)) return auth0.getSession();
  const account = readLocalAccount((await cookies()).get(LOCAL_LOGIN_COOKIE)?.value);
  if (!account) return null;
  const { seedLocalTestAccount } = await import("./localTestAccountSeed");
  await seedLocalTestAccount(account);
  const fixture = LOCAL_ACCOUNTS[account];
  return { user: { sub: `local|${account}`, email: fixture.email, name: fixture.name, email_verified: true, "cusec/roles": [] as string[] } };
});
