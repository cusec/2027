import { NextResponse } from "next/server";
import { getAttendeeSession } from "@/lib/attendeeSession";
import { reconcileVip, vipCheckoutConfigured } from "@/lib/vipService";
import { getWizardStatus } from "@/lib/ticketWizard";
import { getTicketWidgetConfig } from "@/lib/ticketTailor";
import { User } from "@/lib/models";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await getAttendeeSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  const status = await getWizardStatus(session.user.email);
  if (!status.purchaseComplete) return NextResponse.json({ error: "ticket-required" }, { status: 403, headers });
  const user = await User.findOne({ email: session.user.email }).select("vip linked_email");
  const configured = vipCheckoutConfigured();
  const widget = configured ? await getTicketWidgetConfig() : null;
  const embed = widget?.checkoutEmbedUrl ? new URL(widget.checkoutEmbedUrl) : null;
  if (embed) embed.searchParams.set("a", "VIPAddOn");
  // The provider's event-specific widget keeps checkout in our modal.

  return NextResponse.json({ isVip: user?.vip?.status === "active", state: user?.vip ? "verified" : "unknown",
    configured, checkoutEmbedUrl: embed?.toString() ?? null, checkoutUrl: "https://tickets.cusec.net/events/cusec/2415502?a=VIPAddOn#ticket_selection",
    checkoutEmail: user?.linked_email || status.linkedEmail }, { headers });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  const session = await getAttendeeSession();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  try { return NextResponse.json(await reconcileVip(session.user.email), { headers }); }
  catch { return NextResponse.json({ state: "unavailable", isVip: null }, { status: 503, headers }); }
}
