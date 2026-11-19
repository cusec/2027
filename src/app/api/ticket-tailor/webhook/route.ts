import { NextRequest, NextResponse } from "next/server";
import {
  extractPurchaser,
  extractPurchasedTicket,
  verifyTicketTailorWebhook,
} from "@/lib/ticketTailor";
import { belongsToEvent } from "@/lib/vipVerification";
import { reconcileVip } from "@/lib/vipService";
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

  if (!["order.created", "order.updated"].includes(envelope.event ?? "")) return NextResponse.json({ ok: true, skipped: "event" });
  const eventId = process.env.TICKET_TAILOR_EVENT_ID;
  if (!eventId || !belongsToEvent(envelope.payload ?? {}, eventId)) return NextResponse.json({ ok: true, skipped: "event-mismatch" });
  const orderIdForVip = envelope.payload?.id;
  if (typeof orderIdForVip === "string") {
    await connectMongoDB();
    const { VipPurchase } = await import("@/lib/models");
    const owners = await VipPurchase.find({ orderId: orderIdForVip }).select("user").lean();
    for (const owner of owners) {
      const account = await User.findById(owner.user).select("email");
      if (account?.email) await reconcileVip(account.email, orderIdForVip);
    }
    if (envelope.payload?.status === "cancelled") await CampaignPurchase.deleteOne({ orderId: orderIdForVip });
  }
  if (envelope.payload?.status !== "completed") return NextResponse.json({ ok: true, skipped: "not-completed" });
  const purchaser = extractPurchaser(envelope.payload ?? {});
  if (!purchaser) {
    console.error(
      "Ticket Tailor order.created webhook had no parseable buyer email:",
      "[payload omitted]",
    );
    return NextResponse.json({ ok: true, skipped: "no-email" });
  }

  // Upgrade-only orders never create admission allowlist records.
  const ticket = extractPurchasedTicket(envelope.payload ?? {});
  if (ticket.ticketTypeId) await linkTicketPurchase(
    purchaser.email,
    purchaser.name,
    extractPurchasedTicket(envelope.payload ?? {}),
    purchaser.email,
    "webhook",
  );

  await connectMongoDB();
  const account = await User.findOne({ linked_email: purchaser.email }).select("email");
  if (account?.email) await reconcileVip(account.email, typeof envelope.payload?.id === "string" ? envelope.payload.id : undefined);
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
