import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getWizardStatus } from "@/lib/ticketWizard";
import { reconcileTicketPurchase } from "@/lib/ticketLinking";

// GET - the caller's own wizard progress. Used by the /tickets/purchase
// client component to poll for purchase completion after checkout.
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  let status = await getWizardStatus(email);

  // Not linked yet? Ask Ticket Tailor directly whether this email has a
  // completed order. This is what lets a purchase be picked up when the
  // webhook isn't registered/reachable - including a checkout finished in a
  // new tab, which is the only path available until the custom domain is
  // connected (see docs/ticket-tailor/REQUIRED.md).
  if (!status.purchaseComplete) {
    const result = await reconcileTicketPurchase(email, session.user.name || "Attendee");
    if (result.linked) status = await getWizardStatus(email);
  }

  return NextResponse.json(status);
}
