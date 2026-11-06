// Sets up a local test of /admin/ticket-assignments without touching live data.
//
//   1. In .env.local add:  MONGODB_DB_NAME=CUSEC2027_dev
//      (TICKET_TAILOR_EVENT_ID must point at the TEST 2027 event, as it does
//      locally.)
//   2. node scripts/ticket-assignment-test.mjs          creates test accounts
//                                                       and prints a list
//   3. npm run dev, sign in with your Admin account, open
//      /admin/ticket-assignments and paste the list.
//   4. node scripts/ticket-assignment-test.mjs --reset  removes them again.
//
// It refuses to run against CUSEC2027 or against an event without "TEST" in
// its name, so it can't create fake accounts in the live database or point at
// real tickets.

import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");

const env = { ...process.env };
if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

const dbName = env.MONGODB_DB_NAME;
if (!dbName || dbName === "CUSEC2027") {
  fail("Set MONGODB_DB_NAME to a test database (e.g. CUSEC2027_dev) in .env.local first. This script never writes to CUSEC2027.");
}
if (!env.MONGODB_URI || !env.TICKET_TAILOR_API_KEY || !env.TICKET_TAILOR_EVENT_ID) {
  fail("MONGODB_URI, TICKET_TAILOR_API_KEY and TICKET_TAILOR_EVENT_ID must be set.");
}

const TEST_EMAIL = /^assign-test\+[a-z]+@example\.com$/;
const email = (tag) => `assign-test+${tag}@example.com`;

const conn = await mongoose.createConnection(env.MONGODB_URI, { dbName }).asPromise();
const users = conn.db.collection("users");
const registered = conn.db.collection("registeredusers");

if (process.argv.includes("--reset")) {
  const u = await users.deleteMany({ email: TEST_EMAIL });
  const r = await registered.deleteMany({ linkedEmail: TEST_EMAIL });
  console.log(`Removed ${u.deletedCount} test accounts and ${r.deletedCount} ticket rows from ${dbName}.`);
  await conn.close();
  process.exit(0);
}

const auth = `Basic ${Buffer.from(`${env.TICKET_TAILOR_API_KEY}:`).toString("base64")}`;
const series = `es_${env.TICKET_TAILOR_EVENT_ID}`;
const api = async (path) => {
  const res = await fetch(`https://api.tickettailor.com/v1/${path}`, { headers: { Authorization: auth } });
  if (!res.ok) fail(`Ticket Tailor ${path} returned ${res.status}.`);
  return res.json();
};

const event = await api(`event_series/${series}`);
if (!/test/i.test(event.name ?? "")) {
  fail(`The configured event is "${event.name}". Point TICKET_TAILOR_EVENT_ID at the TEST event before testing.`);
}

const tickets = [];
let after = null;
for (let page = 0; page < 20; page++) {
  const qs = new URLSearchParams({ event_series_id: series, limit: "100", ...(after ? { starting_after: after } : {}) });
  const body = await api(`issued_tickets?${qs}`);
  tickets.push(...body.data.filter((t) => t.status === "valid" && !t.add_on_id && t.barcode));
  if (!body.links?.next || body.data.length === 0) break;
  after = body.data.at(-1).id;
}
if (tickets.length < 4) fail(`"${event.name}" needs at least 4 valid tickets; it has ${tickets.length}.`);

// Start clean so re-running gives the same picture.
await users.deleteMany({ email: TEST_EMAIL });
await registered.deleteMany({ linkedEmail: TEST_EMAIL });

const [ready, waiting, typo, taken] = tickets;
const account = (tag, ticketWizard = {}) => ({
  email: email(tag),
  name: `Test ${tag}`,
  points: 0,
  claimedItems: [],
  claim_attempts: [],
  hasSeenIntro: true,
  ticketWizard: {
    currentStep: "purchase",
    purchasedTicketTypeId: null,
    purchasedTicketName: null,
    purchasedOrderId: null,
    purchasedTicketId: null,
    ...ticketWizard,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

await users.insertMany([
  account("ready"),
  // already holds `taken`, so a second person listed with that code is refused
  account("holder", { purchasedTicketId: taken.id, purchasedOrderId: taken.order_id, currentStep: "completed" }),
  account("other"),
]);
await users.updateOne({ email: email("holder") }, { $set: { linked_email: email("holder") } });
await registered.insertOne({ name: "Test holder", linkedEmail: email("holder"), isLinked: true });

// One character off a real code, the way I/1 typos happen.
const swap = (c) => (c === "1" ? "I" : c === "I" ? "1" : c === "0" ? "O" : "0");
const typoCode = `${typo.barcode.slice(0, 2)}${swap(typo.barcode[2])}${typo.barcode.slice(3)}`;

console.log(`\nTest accounts created in ${dbName} against "${event.name}".`);
console.log("Paste this into /admin/ticket-assignments:\n");
console.log(`Ready Person - ${email("ready")} - ${ready.barcode}`);
console.log(`Not Signed Up - ${email("waiting")} - ${waiting.barcode}`);
console.log(`Typo Person - ${email("other")} - ${typoCode}`);
console.log(`Wrong Person - ${email("thief")} - ${taken.barcode}`);
console.log(`\nExpected preview: Will link / Waiting / Code not found (suggests ${typo.barcode}) / Ticket already linked to someone else.`);
console.log("After Apply, only the first line is linked. Preview again and it shows Already linked.\n");

await conn.close();
