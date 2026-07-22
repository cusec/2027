import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import { RegisteredUser } from "@/lib/models";
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

  const existing = await RegisteredUser.findOne({ linkedEmail: purchaser.email });
  if (existing) {
    if (!existing.name && purchaser.name) {
      existing.name = purchaser.name;
      await existing.save();
    }
  } else {
    try {
      await RegisteredUser.create({
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
    }
  }

  return NextResponse.json({ ok: true });
}
