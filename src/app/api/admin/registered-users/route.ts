import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { RegisteredUser, User } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction, sanitizeDataForLogging } from "@/lib/adminAuditLogger";

// GET - Fetch registered users with optional search (Admin only)
export async function GET(request: Request) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "200");
    const offset = parseInt(searchParams.get("offset") || "0");

    await connectMongoDB();

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { linkedEmail: { $regex: search, $options: "i" } },
          { studentEmail: { $regex: search, $options: "i" } },
          { personalEmail: { $regex: search, $options: "i" } },
        ],
      };
    }

    const registeredUsers = await RegisteredUser.find(query)
      .sort({ name: 1 })
      .skip(offset)
      .limit(limit);

    const totalRegisteredUsers = await RegisteredUser.countDocuments(query);

    return NextResponse.json({
      success: true,
      registeredUsers: registeredUsers.map((user) => {
        return {
          _id: user._id,
          name: user.name,
          linkedEmail: user.linkedEmail,
          studentEmail: user.studentEmail || null,
          personalEmail: user.personalEmail || null,
          isLinked: user.isLinked,
        };
      }),
      pagination: {
        total: totalRegisteredUsers,
        offset,
        limit,
        hasMore: offset + limit < totalRegisteredUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching registered users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update registered user data (Admin only - only isLinked field)
export async function PUT(request: Request) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { userId, isLinked } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (typeof isLinked !== "boolean") {
      return NextResponse.json(
        { error: "isLinked must be a boolean value" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const registeredUser = await RegisteredUser.findById(userId);
    if (!registeredUser) {
      return NextResponse.json(
        { error: "Registered user not found" },
        { status: 404 }
      );
    }

    // Store previous data for audit logging
    const previousData = sanitizeDataForLogging({
      name: registeredUser.name,
      linkedEmail: registeredUser.linkedEmail,
      isLinked: registeredUser.isLinked,
    });

    registeredUser.isLinked = isLinked;
    await registeredUser.save();

    // Unlinking has to detach the account too. Flipping only this flag left
    // the account holding linked_email and the ticket name: the purchase page
    // then offered Buy again, while relinking refused because the account
    // still looked linked, so a new purchase could never attach.
    //
    // The account may have linked through this row's own address, or through
    // its personal or student address (the manual link-email flow matches
    // those). A secondary address is only followed when no other ticket row
    // owns it, so another delegate's link is never touched.
    let unlinkedAccount: string | null = null;
    if (!isLinked) {
      const candidates = [registeredUser.linkedEmail];
      for (const address of [registeredUser.personalEmail, registeredUser.studentEmail]) {
        if (!address || candidates.includes(address)) continue;
        const ownedElsewhere = await RegisteredUser.exists({
          _id: { $ne: registeredUser._id },
          linkedEmail: address,
        });
        if (!ownedElsewhere) candidates.push(address);
      }

      const account = await User.findOneAndUpdate(
        { linked_email: { $in: candidates } },
        {
          $unset: { linked_email: "" },
          $set: {
            "ticketWizard.purchasedTicketName": null,
            "ticketWizard.purchasedTicketTypeId": null,
            "ticketWizard.currentStep": "purchase",
          },
        }
      ).select("email");
      unlinkedAccount = account?.email ?? null;
    }

    // Store new data for audit logging
    const newData = sanitizeDataForLogging({
      name: registeredUser.name,
      linkedEmail: registeredUser.linkedEmail,
      isLinked: registeredUser.isLinked,
    });

    // Log the admin action
    const adminEmail = session.user.email;
    if (adminEmail) {
      await logAdminAction({
        adminEmail,
        action: "UPDATE_REGISTERED_USER_LINKED_STATUS",
        resourceType: "user",
        targetUserEmail: registeredUser.linkedEmail,
        resourceId: userId,
        details: { isLinked, unlinkedAccount },
        previousData,
        newData,
        request,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Registered user updated successfully",
      registeredUser: {
        _id: registeredUser._id,
        name: registeredUser.name,
        linkedEmail: registeredUser.linkedEmail,
        studentEmail: registeredUser.studentEmail || null,
        personalEmail: registeredUser.personalEmail || null,
        isLinked: registeredUser.isLinked,
      },
    });
  } catch (error) {
    console.error("Error updating registered user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
