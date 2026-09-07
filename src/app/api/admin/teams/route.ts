import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Team, Submission } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import isVolunteer from "@/lib/isVolunteer";
import { MAX_TEAM_SIZE } from "@/lib/challenges";

// GET - every team with members and how much they've submitted.
// Admin & Volunteer, matching the other read-only admin listings.
export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!((await isAdmin()) || (await isVolunteer()))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    await connectMongoDB();

    const teams = await Team.find({})
      .populate("members", "name email points")
      .populate("challengeId", "title eventName")
      .sort({ createdAt: -1 })
      .lean();

    // One grouped count rather than a query per team.
    const counts = await Submission.aggregate([
      { $match: { teamId: { $ne: null } } },
      { $group: { _id: "$teamId", n: { $sum: 1 } } },
    ]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.n as number]));

    return NextResponse.json({
      success: true,
      maxTeamSize: MAX_TEAM_SIZE,
      teams: teams.map((t) => ({
        _id: String(t._id),
        name: t.name,
        challenge: t.challengeId
          ? {
              _id: String(
                (t.challengeId as unknown as { _id: unknown })._id ??
                  t.challengeId,
              ),
              title:
                (t.challengeId as unknown as { title?: string }).title ??
                "Unknown challenge",
            }
          : null,
        joinCode: t.joinCode,
        createdAt: t.createdAt,
        submissionCount: countBy.get(String(t._id)) ?? 0,
        members: (t.members || []).map(
          (m: {
            _id: unknown;
            name?: string;
            email?: string;
            points?: number;
          }) => ({
            _id: String(m._id),
            name: m.name,
            email: m.email,
            points: m.points ?? 0,
          }),
        ),
      })),
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
