import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User } from "@/lib/models";
import { reconcileVip } from "@/lib/vipService";
import { isValidObjectId } from "mongoose";
/** Read-only, small paginated batches. No production migration runs automatically. */
export async function GET(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.["cusec/roles"]?.includes("Admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const after = new URL(request.url).searchParams.get("after");
  if (after && !isValidObjectId(after)) return NextResponse.json({ error: "invalid-cursor" }, { status: 400 });
  await connectMongoDB();
  const users = await User.find({ linked_email: { $type: "string" }, ...(after ? { _id: { $gt: after } } : {}) }).select("email").sort({ _id: 1 }).limit(5);
  const rows = [];
  for (const user of users) {
    try { rows.push({ userId: String(user._id), ...await reconcileVip(user.email, undefined, true) }); }
    catch { rows.push({ userId: String(user._id), state: "unavailable" }); }
  }
  return NextResponse.json({ dryRun: true, rows, next: users.length === 5 ? String(users[users.length - 1]._id) : null }, { headers: { "Cache-Control": "private, no-store" } });
}
