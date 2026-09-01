import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { User, Challenge, Submission } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import isVolunteer from "@/lib/isVolunteer";
import { logAdminAction, sanitizeDataForLogging } from "@/lib/adminAuditLogger";

// GET - Fetch a user's challenge submissions (Admin & Volunteer only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or volunteer
    if (!((await isAdmin()) || (await isVolunteer()))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { userId } = await params;

    await connectMongoDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const submissionDocs = await Submission.find({ userId }).sort({
      createdAt: -1,
    });

    // Pull in the parent challenges so each row can show what it was for and
    // what it was worth, rather than a bare ObjectId.
    const challengeIds = submissionDocs.map((s) => s.challengeId);
    const challengeDocs = await Challenge.find({ _id: { $in: challengeIds } });
    const challengeMap = new Map(
      challengeDocs.map((doc) => [doc._id.toString(), doc])
    );

    const submissions = submissionDocs.map((submission) => {
      const challenge = challengeMap.get(submission.challengeId.toString());
      return {
        _id: submission._id,
        challengeId: submission.challengeId,
        url: submission.url,
        notes: submission.notes,
        status: submission.status,
        pointsAwarded: submission.pointsAwarded || 0,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        // Challenge details
        challengeTitle: challenge?.title || "Deleted challenge",
        challengeEvent: challenge?.eventName || "",
        challengePoints: challenge?.points || 0,
      };
    });

    return NextResponse.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove one of the user's submissions (Admin only)
// NOTE: Points are NOT updated when removing submissions manually
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json(
        { error: "Submission ID is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Scope the lookup to this user so an admin cannot delete someone else's
    // submission by passing a stray id.
    const submission = await Submission.findOne({ _id: submissionId, userId });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found for this user" },
        { status: 404 }
      );
    }

    const challenge = await Challenge.findById(submission.challengeId);

    const previousData = sanitizeDataForLogging({
      url: submission.url,
      notes: submission.notes,
      status: submission.status,
      pointsAwarded: submission.pointsAwarded || 0,
    });

    // Same policy as everywhere else in this feature: points already granted
    // are never clawed back automatically — the admin is told the amount.
    const granted = submission.pointsAwarded || 0;
    const warning =
      granted > 0
        ? `This submission had been approved and granted ${granted} ` +
          `point${granted === 1 ? "" : "s"}. Deleting it does NOT remove ` +
          `those points — deduct ${granted} from this user's total above to ` +
          `keep it accurate.`
        : null;

    await Submission.findByIdAndDelete(submissionId);

    // Keep the denormalised counter honest so the challenge cap stays accurate.
    if (challenge) {
      challenge.submissionCount = Math.max(
        (challenge.submissionCount || 1) - 1,
        0
      );
      await challenge.save();
    }

    const adminEmail = session.user.email;
    if (adminEmail) {
      await logAdminAction({
        adminEmail,
        action: "REMOVE_USER_SUBMISSION",
        resourceType: "submission",
        targetUserEmail: user.email,
        resourceId: submissionId,
        details: {
          challengeTitle: challenge?.title || "Unknown",
          manualDeductionRequired: granted,
          note: "Points were NOT updated",
        },
        previousData,
        request,
      });
    }

    return NextResponse.json({
      success: true,
      warning,
      message: `Removed submission from ${user.email}. Note: Points were not updated.`,
    });
  } catch (error) {
    console.error("Error removing user submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
