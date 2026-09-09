import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { User, DemographicInfo } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction } from "@/lib/adminAuditLogger";

/**
 * GET - one user's demographic survey answers.
 *
 * Admin only, deliberately narrower than the sibling routes here, which also
 * admit Volunteers: this is the confidential survey, and the wizard tells
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

    const doc = await DemographicInfo.findOne({ user: userId }).lean<
      Record<string, unknown>
    >();

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

    return NextResponse.json({
      success: true,
      demographics: {
        attendeeType: doc.attendeeType ?? "",
        pronoun: doc.pronoun ?? "",
        tshirtSize: doc.tshirtSize ?? "",
        dietaryRestrictions: doc.dietaryRestrictions ?? "",
        fieldOfStudy: doc.fieldOfStudy ?? "",
        schoolHasHeadDelegate: doc.schoolHasHeadDelegate ?? "",
        company: doc.company ?? "",
        jobTitle: doc.jobTitle ?? "",
        resumeUrl: doc.resumeUrl ?? "",
        githubUrl: doc.githubUrl ?? "",
        linkedinUrl: doc.linkedinUrl ?? "",
        travelFrom: doc.travelFrom ?? "",
        travelMethod: doc.travelMethod ?? "",
        howDidYouHear: doc.howDidYouHear ?? "",
        previouslyAttended: doc.previouslyAttended ?? "",
        previouslyAttendedYear: doc.previouslyAttendedYear ?? "",
        excitedEvents: Array.isArray(doc.excitedEvents) ? doc.excitedEvents : [],
        whyAttendCUSEC: doc.whyAttendCUSEC ?? "",
        schoolCommunityInvolvement: doc.schoolCommunityInvolvement ?? "",
        cusecAssociation: doc.cusecAssociation ?? "",
        submittedAt: doc.createdAt ?? null,
        updatedAt: doc.updatedAt ?? null,
      },
    });
  } catch (error) {
    // The message only, never the record: an error object here can carry the
    // document that failed validation.
    console.error(
      "Error fetching user demographics:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
