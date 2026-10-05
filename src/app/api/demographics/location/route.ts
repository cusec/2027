import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User, DemographicInfo } from "@/lib/models";
import { parseTravelLocation } from "@/lib/travelLocation";

// PUT { travelCountry, travelRegion, travelCity, postalCode }
//
// The follow-up for anyone already past the profile step - including current
// ticket holders - to add where they're travelling from and their postal
// code, for the MTL Business Events participant report (see AGENTS.md).
//
// Deliberately narrow so it can never disturb an existing account: it writes
// only these four fields, never the `sections` timestamps that wizard
// progress is derived from, never the ticket link, and never anything else on
// the profile. A delegate who has never saved a profile gets a document with
// just these fields, which still reads as "profile not started" to the wizard.
export async function PUT(request: Request) {
	const session = await auth0.getSession();
	const email = session?.user?.email;
	if (!email) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const answers = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

	const parsed = parseTravelLocation(answers);
	if (!parsed.ok) {
		return NextResponse.json({ error: "invalid", field: parsed.field }, { status: 400 });
	}

	await connectMongoDB();
	const user = await User.findOne({ email }).select("_id").lean<{ _id: unknown }>();
	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	await DemographicInfo.updateOne(
		{ user: user._id },
		{ $set: parsed.location },
		{ upsert: true },
	);

	return NextResponse.json({ ok: true, location: parsed.location });
}
