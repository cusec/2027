import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Team, Submission } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { User } from "@/lib/models";

// POST - leave the caller's team. The last member out deletes the team, so
// empty teams don't linger in the browse list.
export async function POST() {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const team = await Team.findOne({ members: user._id });
  if (!team) {
    return NextResponse.json({ error: "You're not in a team" }, { status: 400 });
  }

  // A team's submissions belong to the team, not the leaver — blocking the
  // exit is clearer than silently orphaning work the others still need.
  const entries = await Submission.countDocuments({ teamId: team._id });
  if (entries > 0 && team.members.length > 1) {
    return NextResponse.json(
      {
        error:
          "Your team has already submitted. Ask an organizer if you need to leave.",
      },
      { status: 400 }
    );
  }

  await Team.updateOne({ _id: team._id }, { $pull: { members: user._id } });

  const updated = await Team.findById(team._id);
  if (updated && updated.members.length === 0) {
    await Submission.deleteMany({ teamId: team._id });
    await Team.findByIdAndDelete(team._id);
  }

  return NextResponse.json({ success: true });
}
