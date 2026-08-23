import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Challenge, Submission } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction, sanitizeDataForLogging } from "@/lib/adminAuditLogger";
import { validateActivationWindow } from "@/lib/challenges";

// GET - Fetch a single challenge (any signed-in user)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectMongoDB();

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Inactive challenges are admin-only.
    if (!challenge.active && !(await isAdmin())) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, challenge });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update a challenge (Admin only)
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

    const {
      title,
      description,
      eventName,
      points,
      active,
      activationStart,
      activationEnd,
      maxSubmissions,
    } = await request.json();
    const { id } = await params;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const windowError = validateActivationWindow(activationStart, activationEnd);
    if (windowError) {
      return NextResponse.json({ error: windowError }, { status: 400 });
    }

    await connectMongoDB();

    const existing = await Challenge.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const previousData = sanitizeDataForLogging({
      title: existing.title,
      description: existing.description,
      eventName: existing.eventName,
      points: existing.points,
      active: existing.active,
      activationStart: existing.activationStart,
      activationEnd: existing.activationEnd,
      maxSubmissions: existing.maxSubmissions,
    });

    const challenge = await Challenge.findByIdAndUpdate(
      id,
      {
        title,
        description: description || "",
        eventName: eventName || "",
        points: points || 0,
        active: active !== undefined ? active : true,
        activationStart: activationStart ? new Date(activationStart) : null,
        activationEnd: activationEnd ? new Date(activationEnd) : null,
        maxSubmissions: maxSubmissions !== undefined ? maxSubmissions : null,
      },
      { new: true }
    );

    const adminEmail = session.user.email;
    if (adminEmail && challenge) {
      await logAdminAction({
        adminEmail,
        action: "UPDATE_CHALLENGE",
        resourceType: "challenge",
        resourceId: challenge._id.toString(),
        details: { title: challenge.title },
        previousData,
        newData: sanitizeDataForLogging({
          title: challenge.title,
          description: challenge.description,
          eventName: challenge.eventName,
          points: challenge.points,
          active: challenge.active,
          activationStart: challenge.activationStart,
          activationEnd: challenge.activationEnd,
          maxSubmissions: challenge.maxSubmissions,
        }),
        request,
      });
    }

    return NextResponse.json({ success: true, challenge });
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a challenge and every submission made to it (Admin only)
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

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Submissions are meaningless without their challenge — clear them out so
    // they don't linger as orphans in the admin review list.
    const { deletedCount } = await Submission.deleteMany({ challengeId: id });
    await Challenge.findByIdAndDelete(id);

    const adminEmail = session.user.email;
    if (adminEmail) {
      await logAdminAction({
        adminEmail,
        action: "DELETE_CHALLENGE",
        resourceType: "challenge",
        resourceId: id,
        details: {
          title: challenge.title,
          deletedSubmissions: deletedCount ?? 0,
        },
        previousData: sanitizeDataForLogging({
          title: challenge.title,
          description: challenge.description,
          eventName: challenge.eventName,
          points: challenge.points,
          active: challenge.active,
          submissionCount: challenge.submissionCount,
        }),
        request,
      });
    }

    return NextResponse.json({
      success: true,
      deletedSubmissions: deletedCount ?? 0,
    });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
