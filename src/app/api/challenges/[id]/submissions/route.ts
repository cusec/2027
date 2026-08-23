import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Submission } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";

// GET - Every submission made to one challenge (Admin only).
// Backs the admin review modal.
export async function GET(
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

    const submissions = await Submission.find({ challengeId: id }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching challenge submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
