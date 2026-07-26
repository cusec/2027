import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getWizardStatus } from "@/lib/ticketWizard";

// GET - the caller's own wizard progress. Used by the /tickets/purchase
// client component to poll for the webhook-driven auto-link after checkout.
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getWizardStatus(session.user.email);
  return NextResponse.json(status);
}
