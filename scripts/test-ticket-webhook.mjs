#!/usr/bin/env node
// Simulates a Ticket Tailor "order.created" webhook delivery against a local
// dev server, so the signature verification + RegisteredUser upsert in
// src/app/api/ticket-tailor/webhook/route.ts can be tested end-to-end without
// a live Ticket Tailor account or a public URL.
//
// Usage (bash):
//   TICKET_TAILOR_WEBHOOK_SECRET=devsecret node scripts/test-ticket-webhook.mjs test@example.com "Test User"
//
// Usage (PowerShell):
//   $env:TICKET_TAILOR_WEBHOOK_SECRET="devsecret"; node scripts/test-ticket-webhook.mjs test@example.com "Test User"
//
// The secret just has to match whatever TICKET_TAILOR_WEBHOOK_SECRET is set
// to in .env.local for your running dev server — it does not need to be a
// real Ticket Tailor secret for this local test.

import crypto from "node:crypto";

const [, , email = "test@example.com", name = "Test Attendee"] = process.argv;
const secret = process.env.TICKET_TAILOR_WEBHOOK_SECRET;
const url = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/ticket-tailor/webhook";

if (!secret) {
  console.error(
    "Set TICKET_TAILOR_WEBHOOK_SECRET before running this script — it must match the value in .env.local."
  );
  process.exit(1);
}

const [firstName, ...rest] = name.split(" ");

const body = JSON.stringify({
  id: `evt_test_${Date.now()}`,
  created_at: new Date().toISOString(),
  event: "order.created",
  resource_url: "https://api.tickettailor.com/v1/orders/test",
  payload: {
    id: `order_test_${Date.now()}`,
    buyer_details: {
      email,
      first_name: firstName,
      last_name: rest.join(" "),
    },
  },
});

const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = crypto.createHmac("sha256", secret).update(timestamp + body).digest("hex");

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Tickettailor-Webhook-Signature": `t=${timestamp},v1=${signature}`,
  },
  body,
});

const text = await res.text();
console.log(`${res.status} ${res.statusText}`);
console.log(text);
