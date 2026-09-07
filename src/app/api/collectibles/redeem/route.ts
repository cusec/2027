import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { User, Collectible } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";

// POST - Redeem a collectible for the current user
export async function POST(request: Request) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectibleId } = await request.json();

    if (!collectibleId) {
      return NextResponse.json(
        { error: "Collectible ID is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    // Find the collectible
    const collectible = await Collectible.findById(collectibleId);
    if (!collectible) {
      return NextResponse.json(
        { error: "Collectible not found" },
        { status: 404 },
      );
    }

    // Check if collectible is purchasable
    if (!collectible.purchasable) {
      return NextResponse.json(
        { error: "This collectible is not available for purchase" },
        { status: 400 },
      );
    }

    // Check if collectible is active
    if (!collectible.active) {
      return NextResponse.json(
        { error: "This collectible is currently not available" },
        { status: 400 },
      );
    }

    // Check if collectible is within activation period
    if (collectible.activationStart && collectible.activationEnd) {
      const now = new Date();
      const startDate = new Date(collectible.activationStart);
      const endDate = new Date(collectible.activationEnd);
      if (now < startDate || now > endDate) {
        return NextResponse.json(
          { error: "This collectible is outside its availability period" },
          { status: 400 },
        );
      }
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const price = collectible.discountedCost ?? collectible.cost;

    // Stock and points both move through conditional updates rather than a
    // read-then-write: two requests firing together used to be able to buy the
    // same last item, or spend the same points twice.
    const reserved = await Collectible.findOneAndUpdate(
      collectible.limited
        ? { _id: collectible._id, remaining: { $gt: 0 } }
        : { _id: collectible._id },
      {
        $inc: collectible.limited
          ? { remaining: -1, claimCount: 1 }
          : { claimCount: 1 },
      },
      { new: true },
    );

    if (!reserved) {
      return NextResponse.json(
        { error: "This collectible is sold out" },
        { status: 400 },
      );
    }

    const charged = await User.findOneAndUpdate(
      { _id: user._id, points: { $gte: price } },
      {
        $inc: { points: -price },
        $push: {
          collectibles: {
            collectibleId: collectible._id,
            used: false,
            addedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!charged) {
      // Give the reserved unit back rather than leaving it stranded.
      await Collectible.updateOne(
        { _id: collectible._id },
        {
          $inc: collectible.limited
            ? { remaining: 1, claimCount: -1 }
            : { claimCount: -1 },
        },
      );

      return NextResponse.json(
        {
          error: "You do not have enough points",
          required: price,
          available: user.points,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${collectible.name}`,
      redemption: {
        collectible: {
          _id: collectible._id,
          name: collectible.name,
          cost: collectible.cost,
          discountedCost: collectible.discountedCost,
        },
        user: {
          newPoints: charged.points,
        },
      },
    });
  } catch (error) {
    console.error("Error redeeming collectible:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
