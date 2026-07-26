import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import { RegisteredUser, User, DemographicInfo } from "@/lib/models";
import { extractPurchaser, verifyTicketTailorWebhook } from "@/lib/ticketTailor";

// Pre-seeds the RegisteredUser allowlist that /api/users/link-email checks
// against, so a ticket buyer can immediately link their email when they log
// into /scavenger. This never touches `isLinked` on an existing record —
// linking itself still only happens through the onboarding flow.
export async function POST(request: NextRequest) {
  const secret = process.env.TICKET_TAILOR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Ticket Tailor webhook received but TICKET_TAILOR_WEBHOOK_SECRET is unset");
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("tickettailor-webhook-signature");

  if (!verifyTicketTailorWebhook(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "invalid-signature" }, { status: 401 });
  }

  let envelope: { event?: string; payload?: Record<string, unknown> };
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (envelope.event !== "order.created") {
    return NextResponse.json({ ok: true, skipped: envelope.event ?? "unknown-event" });
  }

  const purchaser = extractPurchaser(envelope.payload ?? {});
  if (!purchaser) {
    console.error(
      "Ticket Tailor order.created webhook had no parseable buyer email:",
      JSON.stringify(envelope.payload)
    );
    return NextResponse.json({ ok: true, skipped: "no-email" });
  }

  await connectMongoDB();

  let registeredUser = await RegisteredUser.findOne({ linkedEmail: purchaser.email });
  if (registeredUser) {
    if (!registeredUser.name && purchaser.name) {
      registeredUser.name = purchaser.name;
      await registeredUser.save();
    }
  } else {
    try {
      registeredUser = await RegisteredUser.create({
        linkedEmail: purchaser.email,
        name: purchaser.name,
        isLinked: false,
      });
    } catch (err: unknown) {
      // Duplicate key from a concurrent/retried delivery for the same email
      // is not an error here — the record already exists, which is the goal.
      const isDuplicateKey =
        typeof err === "object" && err !== null && "code" in err && err.code === 11000;
      if (!isDuplicateKey) throw err;
      registeredUser = await RegisteredUser.findOne({ linkedEmail: purchaser.email });
    }
  }

  // Ticket-wizard auto-link: if the buyer's Ticket Tailor email matches an
  // authenticated wizard User's Auth0 account email exactly, link them
  // automatically instead of requiring the manual /api/users/link-email
  // step. Same safety checks as that route (no cross-linking); if nothing
  // matches, RegisteredUser is still upserted above and the manual flow
  // remains available as the fallback.
  if (registeredUser && !registeredUser.isLinked) {
    const matchedUser = await User.findOne({ email: purchaser.email });
    if (matchedUser && !matchedUser.linked_email) {
      const alreadyLinkedElsewhere = await User.findOne({
        linked_email: purchaser.email,
      });
      if (!alreadyLinkedElsewhere) {
        matchedUser.linked_email = purchaser.email;
        matchedUser.ticketWizard.currentStep = "completed";
        await matchedUser.save();

        registeredUser.isLinked = true;

        const demographics = await DemographicInfo.findOne({
          user: matchedUser._id,
        }).lean<{ studentEmail?: string; personalEmail?: string }>();
        if (demographics) {
          if (!registeredUser.studentEmail) {
            registeredUser.studentEmail = demographics.studentEmail;
          }
          if (!registeredUser.personalEmail) {
            registeredUser.personalEmail = demographics.personalEmail;
          }
        }

        await registeredUser.save();
      }
    }
  }

  return NextResponse.json({ ok: true });
}
