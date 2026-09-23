import { NextRequest, NextResponse } from "next/server";
import {
  extractPurchaser,
  extractPurchasedTicket,
  verifyTicketTailorWebhook,
} from "@/lib/ticketTailor";
import { linkTicketPurchase } from "@/lib/ticketLinking";
import { Campaign, CampaignPurchase, User } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";

// Seeds the RegisteredUser allowlist that /api/users/link-email checks
// against, and auto-links the buyer's account when their purchase email
// matches their CUSEC account email. All of that lives in
// linkTicketPurchase(), shared with the API reconciliation path so the two
// can't diverge.
export async function POST(request: NextRequest) {
  const secret = process.env.TICKET_TAILOR_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "Ticket Tailor webhook received but TICKET_TAILOR_WEBHOOK_SECRET is unset",
    );
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

  if (envelope.event === "order.updated" && envelope.payload?.status === "cancelled") {
    const orderId = envelope.payload.id;
    if (typeof orderId === "string") {
      await connectMongoDB();
      await CampaignPurchase.deleteOne({ orderId });
    }
    return NextResponse.json({ ok: true });
  }

  if (envelope.event !== "order.created") {
    return NextResponse.json({
      ok: true,
      skipped: envelope.event ?? "unknown-event",
    });
  }

  const purchaser = extractPurchaser(envelope.payload ?? {});
  if (!purchaser) {
    console.error(
      "Ticket Tailor order.created webhook had no parseable buyer email:",
      JSON.stringify(envelope.payload),
    );
    return NextResponse.json({ ok: true, skipped: "no-email" });
  }

  await linkTicketPurchase(
    purchaser.email,
    purchaser.name,
    extractPurchasedTicket(envelope.payload ?? {}),
    purchaser.email,
    "webhook",
  );

  const orderId = envelope.payload?.id;
  if (envelope.payload?.status === "completed" && typeof orderId === "string") {
    await connectMongoDB();
    const buyer = await User.findOne({ email: purchaser.email })
      .select("attribution.latestTouch.campaign")
      .lean<{ attribution?: { latestTouch?: { campaign?: string } } }>();
    const campaignId = buyer?.attribution?.latestTouch?.campaign;
    if (campaignId && await Campaign.exists({ id: campaignId })) {
      await CampaignPurchase.updateOne(
        { orderId },
        { $setOnInsert: { orderId, campaignId, purchasedAt: new Date() } },
        { upsert: true },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
