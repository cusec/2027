import { NextResponse } from "next/server";
import { EventSignup } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { EVENT_ID_PATTERN } from "@/lib/eventLinks";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const form = await request.formData();
  const event = String(form.get("event") ?? "").trim().toLowerCase();
  const locale = form.get("locale") === "fr-CA" ? "fr-CA" : "en-CA";
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const consent = form.get("consent") === "yes";

  const back = new URL(locale === "fr-CA" ? "/fr-CA/meet" : "/meet", request.url);
  if (EVENT_ID_PATTERN.test(event)) back.searchParams.set("event", event);

  if (!EVENT_ID_PATTERN.test(event) || !emailPattern.test(email) || email.length > 254 || name.length > 120 || !consent) {
    back.searchParams.set("status", "invalid");
    return NextResponse.redirect(back, 303);
  }

  try {
    await connectMongoDB();
    await EventSignup.updateOne(
      { event, email },
      { $setOnInsert: { event, email, name, consentedAt: new Date() } },
      { upsert: true },
    );
    back.searchParams.set("status", "saved");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      back.searchParams.set("status", "saved");
    } else {
      console.error("Event signup failed:", error);
      back.searchParams.set("status", "error");
    }
  }

  return NextResponse.redirect(back, 303);
}
