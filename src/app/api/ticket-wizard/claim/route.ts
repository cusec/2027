import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import { linkTicketPurchase } from "@/lib/ticketLinking";
import { findCompletedOrderByEmail } from "@/lib/ticketTailor";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

// POST { email } - the manual escape hatch for a delegate who checked out
// with an address other than their CUSEC account's. Everything else links
// automatically by matching those two addresses; this is the one path where
// they are allowed to differ.
//
// It is no weaker than the pre-existing /api/users/link-email flow: the
// caller must be signed in and unlinked, the address must have a *completed*
// order against the configured event (asked of Ticket Tailor directly, not
// taken on trust), and linkTicketPurchase still refuses an address another
// account already owns.
export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const purchaseEmail = String(body.email ?? "").trim().toLowerCase().slice(0, 320);
  if (!EMAIL_RE.test(purchaseEmail)) {
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });
  }

  const accountEmail = session.user.email;
  await connectMongoDB();

  const user = await User.findOne({ email: accountEmail });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.linked_email) {
    return NextResponse.json({ error: "already-linked" }, { status: 409 });
  }

  const ticket = await findCompletedOrderByEmail(purchaseEmail);
  if (!ticket) {
    return NextResponse.json({ error: "no-order" }, { status: 404 });
  }

  const result = await linkTicketPurchase(
    purchaseEmail,
    session.user.name || user.name || "Attendee",
    ticket,
    accountEmail
  );

  if (!result.linked) {
    return NextResponse.json({ error: "ticket-taken" }, { status: 409 });
  }

  return NextResponse.json(await getWizardStatus(accountEmail));
}
