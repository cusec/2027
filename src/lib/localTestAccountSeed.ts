import "server-only";
import { randomUUID } from "node:crypto";
import { LOCAL_ACCOUNTS, type LocalAccount } from "./localTestAccounts";
import connectMongoDB, { DB_NAME } from "./mongodb";
import { User, RegisteredUser, DemographicInfo } from "./models";
export async function seedLocalTestAccount(account: LocalAccount) {
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL_ENV || DB_NAME !== "CUSEC2027_dev") throw new Error("Local fixtures require the development database");
  await connectMongoDB();
  const fixture = LOCAL_ACCOUNTS[account];
  const user = await User.findOneAndUpdate({ email: fixture.email }, { $setOnInsert: {
    name: fixture.name, email: fixture.email, analyticsId: randomUUID(), linked_email: fixture.email, active: true, hasSeenIntro: true,
    ticketWizard: { currentStep: "completed", purchasedTicketName: "Student Admission (Local Test)", purchasedTicketTypeId: "local-test-student", purchasedOrderId: `local-test-${account}-order` },
    vip: { status: fixture.isVip ? "active" : "none", purchaseSource: null, purchasedAt: null, verifiedAt: null, orderId: null, addOnId: null },
  } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await RegisteredUser.updateOne({ linkedEmail: fixture.email }, { $setOnInsert: { name: fixture.name, linkedEmail: fixture.email, isLinked: true } }, { upsert: true });
  const now = new Date();
  await DemographicInfo.updateOne({ user: user._id }, { $setOnInsert: { user: user._id, firstName: "test", lastName: account === "vip" ? "- VIP" : "- basic", primaryEmail: fixture.email,
    travelCountry: "CA", travelRegion: "QC", travelCity: "Montréal", postalCode: "H3A 0G4", sections: { basics: now, background: now, goals: now, travel: now, experience: now, links: now } } }, { upsert: true });
}
