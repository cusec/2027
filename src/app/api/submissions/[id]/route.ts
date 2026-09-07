import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Challenge, Submission, Team, User } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction, sanitizeDataForLogging } from "@/lib/adminAuditLogger";
import { isValidSubmissionUrl } from "@/lib/challenges";

const STATUSES = ["pending", "approved", "rejected"];
const MAX_NOTES = 2000;

/**
 * Who may edit or withdraw an entry. Individual entries belong to whoever
 * posted them; a group entry belongs to the whole team, so any current member
 * counts — otherwise a team would be stuck whenever the poster went offline.
 */
async function callerOwns(
  submission: { userEmail: string; teamId?: unknown },
  email: string,
): Promise<boolean> {
  if (submission.userEmail === email) return true;
  if (!submission.teamId) return false;

  const user = await User.findOne({ email });
  if (!user) return false;

  const team = await Team.findOne({
    _id: submission.teamId,
    members: user._id,
  });
  return !!team;
}

// PUT - Owners edit their own link/notes; admins set the review status.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, notes, status } = await request.json();
    const { id } = await params;

    await connectMongoDB();

    const submission = await Submission.findById(id);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    const admin = await isAdmin();
    const isOwner = await callerOwns(submission, session.user.email);

    if (!admin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Approved entries are frozen for delegates here exactly as they are on
    // create and withdraw: the points are already banked, so letting the link
    // change afterwards would let a delegate swap what was judged.
    if (!admin && submission.status === "approved") {
      return NextResponse.json(
        {
          error:
            "This submission has already been approved and can no longer be changed. Contact an organizer if it needs updating.",
        },
        { status: 400 },
      );
    }

    // Status is a review decision — admins only, whoever owns the entry.
    if (status !== undefined) {
      if (!admin) {
        return NextResponse.json(
          { error: "Forbidden: Admin access required to set status" },
          { status: 403 },
        );
      }
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    const previousData = sanitizeDataForLogging({
      url: submission.url,
      notes: submission.notes,
      status: submission.status,
      pointsAwarded: submission.pointsAwarded,
    });

    if (url !== undefined) {
      if (!isValidSubmissionUrl(url)) {
        return NextResponse.json(
          { error: "Enter a valid http(s) link to your video" },
          { status: 400 },
        );
      }
      submission.url = url.trim();
    }

    if (notes !== undefined)
      submission.notes = String(notes).slice(0, MAX_NOTES);

    // --- Points -------------------------------------------------------------
    // Approving a submission credits the challenge's points to the delegate.
    // Reverting an approval deliberately does NOT claw them back: an automatic
    // deduction can drive a delegate negative or silently undo points they have
    // already spent in the shop. Instead we hand the admin a warning naming the
    // exact amount, and they adjust it themselves via Manage Users.
    let warning: string | null = null;
    let pointsDelta = 0;

    if (status !== undefined) {
      const previousStatus = submission.status;
      const becomingApproved =
        status === "approved" && previousStatus !== "approved";
      const losingApproval =
        previousStatus === "approved" && status !== "approved";

      if (becomingApproved) {
        const challenge = await Challenge.findById(submission.challengeId);
        const award = challenge?.points || 0;

        if (award > 0) {
          const delegate = await User.findById(submission.userId);
          if (delegate) {
            delegate.points = (delegate.points || 0) + award;
            await delegate.save();
            pointsDelta = award;
          }
        }

        submission.pointsAwarded = award;
      }

      if (losingApproval) {
        const granted = submission.pointsAwarded || 0;
        if (granted > 0) {
          warning =
            `This submission was already approved and granted ${granted} ` +
            `point${granted === 1 ? "" : "s"} to ${submission.userEmail}. ` +
            `Those points have NOT been removed automatically — deduct ` +
            `${granted} from this delegate in Manage Users to keep their ` +
            `total accurate.`;
        }
      }

      submission.status = status;
    }

    await submission.save();

    if (admin && status !== undefined) {
      await logAdminAction({
        adminEmail: session.user.email,
        action: "REVIEW_SUBMISSION",
        resourceType: "submission",
        resourceId: submission._id.toString(),
        targetUserEmail: submission.userEmail,
        details: {
          status,
          pointsAwarded: pointsDelta,
          manualDeductionRequired: warning ? submission.pointsAwarded : 0,
        },
        previousData,
        newData: sanitizeDataForLogging({
          url: submission.url,
          notes: submission.notes,
          status: submission.status,
          pointsAwarded: submission.pointsAwarded,
        }),
        request,
      });
    }

    return NextResponse.json({ success: true, submission, warning });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Owners withdraw their own submission; admins can remove any.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectMongoDB();

    const submission = await Submission.findById(id);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    const admin = await isAdmin();
    const isOwner = await callerOwns(submission, session.user.email);

    if (!admin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Points are never deducted automatically, so letting a delegate withdraw
    // an approved submission would let them bank the points and remove the
    // evidence. Admins can still delete it (and get told what to claw back).
    if (!admin && submission.status === "approved") {
      return NextResponse.json(
        {
          error:
            "This submission has already been approved and cannot be withdrawn. Contact an organizer if it needs to be removed.",
        },
        { status: 400 },
      );
    }

    const { challengeId } = submission;

    // Same policy as reverting an approval: points already granted are never
    // clawed back automatically, so name the amount for the admin.
    const granted = submission.pointsAwarded || 0;
    const deleteWarning =
      granted > 0
        ? `This submission had been approved and granted ${granted} ` +
          `point${granted === 1 ? "" : "s"} to ${submission.userEmail}. ` +
          `Deleting it does NOT remove those points — deduct ${granted} from ` +
          `this delegate in Manage Users to keep their total accurate.`
        : null;

    await Submission.findByIdAndDelete(id);

    // Keep the denormalised counter honest so the cap stays accurate.
    await Challenge.findByIdAndUpdate(challengeId, {
      $inc: { submissionCount: -1 },
    });

    if (admin && !isOwner) {
      await logAdminAction({
        adminEmail: session.user.email,
        action: "DELETE_SUBMISSION",
        resourceType: "submission",
        resourceId: id,
        targetUserEmail: submission.userEmail,
        details: { manualDeductionRequired: granted },
        previousData: sanitizeDataForLogging({
          url: submission.url,
          notes: submission.notes,
          status: submission.status,
          pointsAwarded: granted,
        }),
        request,
      });
    }

    return NextResponse.json({ success: true, warning: deleteWarning });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
