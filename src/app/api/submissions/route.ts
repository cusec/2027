import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Challenge, Submission, Team } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { findOrCreateUser } from "@/lib/userService";
import { isChallengeOpen, isValidSubmissionUrl } from "@/lib/challenges";

const MAX_NOTES = 2000;

// GET - The signed-in delegate's own submissions.
export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const user = await findOrCreateUser({
      email: session.user.email,
      name: session.user.name || "Delegate",
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // A group entry is the whole team's, so every member must see it — not
    // only whoever happened to post it.
    const team = await Team.findOne({ members: user._id });
    const submissions = await Submission.find({
      $or: [{ userId: user._id }, ...(team ? [{ teamId: team._id }] : [])],
    })
      .populate("challengeId")
      .populate("teamId", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Submit a link to a challenge.
// Re-submitting to the same challenge replaces the previous entry rather than
// creating a duplicate (enforced by the unique {challengeId, userId} index).
export async function POST(request: Request) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (process.env.SUBMISSIONS_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Submissions are not open yet" },
        { status: 403 },
      );
    }

    const { challengeId, url, notes } = await request.json();

    if (!challengeId) {
      return NextResponse.json(
        { error: "A challenge must be selected" },
        { status: 400 },
      );
    }

    if (!isValidSubmissionUrl(url)) {
      return NextResponse.json(
        { error: "Enter a valid http(s) link to your video" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    const user = await findOrCreateUser({
      email: session.user.email,
      name: session.user.name || "Delegate",
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Group challenges are answered once per team; individual ones once per
    // delegate. Everything after this point is identical.
    const isGroup = challenge.mode === "group";
    let team = null;

    if (isGroup) {
      team = await Team.findOne({ challengeId, members: user._id });
      if (!team) {
        return NextResponse.json(
          {
            error:
              "This is a group challenge — create or join a team before submitting.",
          },
          { status: 400 },
        );
      }
    }

    const existing = await Submission.findOne(
      isGroup
        ? { challengeId, teamId: team!._id }
        : { challengeId, userId: user._id },
    );

    // The submission cap only guards *new* entries — a delegate editing their
    // own existing submission must not be blocked by a full challenge.
    if (!existing && !isChallengeOpen(challenge)) {
      return NextResponse.json(
        { error: "This challenge is not currently accepting submissions" },
        { status: 400 },
      );
    }

    // Replacing an approved entry would reset it to pending while the points
    // it already earned stay on the account — so it is locked once approved.
    if (existing && existing.status === "approved") {
      return NextResponse.json(
        {
          error:
            "This submission has already been approved and can no longer be changed. Contact an organizer if it needs updating.",
        },
        { status: 400 },
      );
    }

    if (existing) {
      existing.url = url.trim();
      existing.notes = String(notes || "").slice(0, MAX_NOTES);
      // Whoever last edited it becomes the visible submitter.
      existing.userId = user._id;
      existing.userEmail = session.user.email;
      // A replaced entry goes back into the review queue.
      existing.status = "pending";
      await existing.save();

      return NextResponse.json({
        success: true,
        submission: existing,
        replaced: true,
      });
    }

    const submission = new Submission({
      challengeId,
      userId: user._id,
      userEmail: session.user.email,
      teamId: isGroup ? team!._id : null,
      url: url.trim(),
      notes: String(notes || "").slice(0, MAX_NOTES),
    });

    await submission.save();

    await Challenge.findByIdAndUpdate(challengeId, {
      $inc: { submissionCount: 1 },
    });

    return NextResponse.json({
      success: true,
      submission,
      replaced: false,
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
