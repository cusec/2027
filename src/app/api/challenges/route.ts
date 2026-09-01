import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Challenge } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction, sanitizeDataForLogging } from "@/lib/adminAuditLogger";
import { validateActivationWindow } from "@/lib/challenges";

// GET - List challenges.
// Admins get everything (so they can manage drafts); delegates only ever see
// active challenges.
export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const admin = await isAdmin();
    const filter = admin ? {} : { active: true };
    const challenges = await Challenge.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      challenges,
    });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a challenge (Admin only)
export async function POST(request: Request) {
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

    const {
      title,
      description,
      eventName,
      mode,
      points,
      active,
      activationStart,
      activationEnd,
      maxSubmissions,
    } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const windowError = validateActivationWindow(activationStart, activationEnd);
    if (windowError) {
      return NextResponse.json({ error: windowError }, { status: 400 });
    }

    await connectMongoDB();

    const challenge = new Challenge({
      title,
      description: description || "",
      eventName: eventName || "",
      mode: mode === "group" ? "group" : "individual",
      points: points || 0,
      active: active !== undefined ? active : true,
      activationStart: activationStart ? new Date(activationStart) : null,
      activationEnd: activationEnd ? new Date(activationEnd) : null,
      maxSubmissions: maxSubmissions !== undefined ? maxSubmissions : null,
      submissionCount: 0,
    });

    await challenge.save();

    const adminEmail = session.user.email;
    if (adminEmail) {
      await logAdminAction({
        adminEmail,
        action: "CREATE_CHALLENGE",
        resourceType: "challenge",
        resourceId: challenge._id.toString(),
        details: { title: challenge.title, eventName: challenge.eventName },
        newData: sanitizeDataForLogging({
          title: challenge.title,
          description: challenge.description,
          eventName: challenge.eventName,
          mode: challenge.mode,
          points: challenge.points,
          active: challenge.active,
          activationStart: challenge.activationStart,
          activationEnd: challenge.activationEnd,
          maxSubmissions: challenge.maxSubmissions,
        }),
        request,
      });
    }

    return NextResponse.json({
      success: true,
      challenge,
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
