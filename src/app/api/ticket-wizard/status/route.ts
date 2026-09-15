import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getWizardStatus } from "@/lib/ticketWizard";
import { reconcileTicketPurchase } from "@/lib/ticketLinking";

// GET - the caller's own wizard progress. Used by the /tickets/purchase
// client component to poll for purchase completion after checkout.
//
// `?reconcile=1` additionally asks Ticket Tailor whether this email has a
// completed order and links it on the spot. That covers a checkout finished
// without a webhook (unregistered, unreachable, or delayed) and one finished
// in a new tab. It costs an external API call, so the page only asks for it
// once checkout has actually been opened - an idle poll stays a DB read.
export async function GET(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  const reconcile = new URL(request.url).searchParams.get("reconcile") === "1";
  let status = await getWizardStatus(email);

  if (reconcile && !status.purchaseComplete) {
    const result = await reconcileTicketPurchase(email, session.user.name || "Attendee");
    if (result.linked) status = await getWizardStatus(email);
  }

  return NextResponse.json(status);
}
