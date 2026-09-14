import { NextResponse } from "next/server";
import { Country, State } from "country-state-city";
import { auth0 } from "@/lib/auth0";
import { User, DemographicInfo } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction } from "@/lib/adminAuditLogger";

/**
 * GET - one user's attendee profile.
 *
 * Admin only, deliberately narrower than the sibling routes here, which also
 * admit Volunteers: this is the confidential profile, and the wizard tells
 * delegates so. The read is audit-logged for the same reason.
 *
 * The log records only who looked at whose record. Never put answers in it:
 * audit rows are read back in the Audit Logs modal, which would turn one
 * confidential record into a second, wider copy of it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { userId } = await params;
    await connectMongoDB();

    const user = await User.findById(userId).select("email name").lean<{
      _id: unknown;
      email: string;
      name?: string;
    }>();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const doc = await DemographicInfo.findOne({ user: userId })
      .select("-_id -user -__v -resumePublicId")
      .lean<Record<string, unknown>>();

    await logAdminAction({
      adminEmail: session.user.email as string,
      action: "viewed demographics",
      resourceType: "demographics",
      targetUserEmail: user.email,
      resourceId: String(userId),
      request,
    });

    if (!doc) {
      return NextResponse.json({ success: true, demographics: null });
    }

    // Country and region names are resolved here so the admin panel never has
    // to ship the location dataset to the browser.
    const country = typeof doc.travelCountry === "string" ? doc.travelCountry : "";
    const region = typeof doc.travelRegion === "string" ? doc.travelRegion : "";

    return NextResponse.json({
      success: true,
      demographics: {
        ...doc,
        travelCountryName: country ? (Country.getCountryByCode(country)?.name ?? country) : "",
        travelRegionName:
          country && region
            ? (State.getStateByCodeAndCountry(region, country)?.name ?? region)
            : "",
      },
    });
  } catch (error) {
    // The message only: a failed read can carry the answers themselves.
    console.error(
      "Error fetching demographics:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
