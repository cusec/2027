import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalPurchasedTicketPreview } from "@/lib/localTicketPreview";
export const metadata = { title: "Local test login", robots: { index: false, follow: false } };
export default async function LocalLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isLocalPurchasedTicketPreview((await headers()).get("host"))) notFound();
  const { error } = await searchParams;
  return <main className="v2 v2-profile-signin"><section className="pass-dialog__body" style={{ maxWidth: 420, margin: "auto", background: "#f4fffc", borderRadius: 24 }}>
    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Local test login</h1><p>Choose basic or VIP. Development accounts only.</p>
    <form action="/api/local-login" method="post" className="pass-editor" style={{ marginTop: 24 }}>
      <label>Account name<input name="username" autoComplete="username" placeholder="basic or VIP" required /></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
      {error && <p role="alert">Incorrect account name or password.</p>}
      <button type="submit" className="pass-button pass-button--lime">Log in</button>
    </form></section></main>;
}
