import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Team, User } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction } from "@/lib/adminAuditLogger";

// DELETE - pull one member out of a team (Admin only).
// Deliberately does not delete the team's submissions: the entry belongs to
// the team, and the remaining members still need it.
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

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    await connectMongoDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some(
      (m: { toString: () => string }) => m.toString() === userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "That user isn't on this team" },
        { status: 404 }
      );
    }

    const member = await User.findById(userId);

    await Team.updateOne({ _id: id }, { $pull: { members: userId } });

    // Removing the last member leaves an empty team; delete it rather than
    // leaving a shell in the browse list.
    const updated = await Team.findById(id);
    let teamDeleted = false;
    if (updated && updated.members.length === 0) {
      await Team.findByIdAndDelete(id);
      teamDeleted = true;
    }

    if (session.user.email) {
      await logAdminAction({
        adminEmail: session.user.email,
        action: "REMOVE_TEAM_MEMBER",
        resourceType: "team",
        resourceId: id,
        targetUserEmail: member?.email,
        details: { teamName: team.name, teamDeleted },
        request,
      });
    }

    return NextResponse.json({ success: true, teamDeleted });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
