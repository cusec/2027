import { NextRequest, NextResponse } from "next/server";
import { extractPurchaser, extractPurchasedTicket, verifyTicketTailorWebhook } from "@/lib/ticketTailor";
import { linkTicketPurchase } from "@/lib/ticketLinking";

// Seeds the RegisteredUser allowlist that /api/users/link-email checks
// against, and auto-links the buyer's account when their purchase email
// matches their CUSEC account email. All of that lives in
// linkTicketPurchase(), shared with the API reconciliation path so the two
// can't diverge.
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

  await linkTicketPurchase(
    purchaser.email,
    purchaser.name,
    extractPurchasedTicket(envelope.payload ?? {})
  );

  return NextResponse.json({ ok: true });
}
