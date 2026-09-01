import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Team, Submission } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import isVolunteer from "@/lib/isVolunteer";
import { logAdminAction, sanitizeDataForLogging } from "@/lib/adminAuditLogger";
import { validateTeamName } from "@/lib/challenges";

// GET - one team's submissions (Admin & Volunteer)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!((await isAdmin()) || (await isVolunteer()))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectMongoDB();

    const submissions = await Submission.find({ teamId: id })
      .populate("challengeId", "title eventName points mode")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      submissions: submissions.map((s) => {
        const c = s.challengeId as unknown as {
          _id?: unknown;
          title?: string;
          eventName?: string;
          points?: number;
        } | null;
        return {
          _id: String(s._id),
          url: s.url,
          notes: s.notes,
          status: s.status,
          pointsAwarded: s.pointsAwarded ?? 0,
          userEmail: s.userEmail,
          createdAt: s.createdAt,
          challengeTitle: c?.title || "Deleted challenge",
          challengeEvent: c?.eventName || "",
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching team submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - rename a team (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { name } = await request.json();
    const nameError = validateTeamName(name);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }
    const next = String(name).trim();

    const { id } = await params;
    await connectMongoDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const clash = await Team.findOne({ name: next }).collation({
      locale: "en",
      strength: 2,
    });
    if (clash && String(clash._id) !== id) {
      return NextResponse.json(
        { error: "That team name is taken" },
        { status: 400 }
      );
    }

    const previousName = team.name;
    team.name = next;
    await team.save();

    if (session.user.email) {
      await logAdminAction({
        adminEmail: session.user.email,
        action: "RENAME_TEAM",
        resourceType: "team",
        resourceId: id,
        details: { from: previousName, to: next },
        previousData: sanitizeDataForLogging({ name: previousName }),
        newData: sanitizeDataForLogging({ name: next }),
        request,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error renaming team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - remove a team and its submissions (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    await connectMongoDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Points already granted for this team's entries are NOT reversed — same
    // policy as everywhere else in the platform.
    const granted = await Submission.aggregate([
      { $match: { teamId: team._id } },
      { $group: { _id: null, total: { $sum: "$pointsAwarded" } } },
    ]);
    const totalGranted = granted[0]?.total ?? 0;

    const { deletedCount } = await Submission.deleteMany({ teamId: team._id });
    await Team.findByIdAndDelete(id);

    if (session.user.email) {
      await logAdminAction({
        adminEmail: session.user.email,
        action: "DELETE_TEAM",
        resourceType: "team",
        resourceId: id,
        details: {
          name: team.name,
          deletedSubmissions: deletedCount ?? 0,
          manualDeductionRequired: totalGranted,
        },
        previousData: sanitizeDataForLogging({
          name: team.name,
          memberCount: team.members.length,
        }),
        request,
      });
    }

    return NextResponse.json({
      success: true,
      deletedSubmissions: deletedCount ?? 0,
      warning:
        totalGranted > 0
          ? `This team's entries had granted ${totalGranted} point${
              totalGranted === 1 ? "" : "s"
            } in total. Those points have NOT been removed — adjust the members individually in Manage Users.`
          : null,
    });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
