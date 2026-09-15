import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { Notice } from "@/lib/models";

// GET - Fetch all notices
export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectMongoDB();

    const notices = await Notice.find({}).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      notices: notices.map((notice) => ({
        _id: notice._id,
        title: notice.title,
        description: notice.description,
        createdAt: notice.createdAt,
        updatedAt: notice.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching notices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
