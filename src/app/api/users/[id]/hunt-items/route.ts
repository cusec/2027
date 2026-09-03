import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { HuntItem, User, Collectible } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import isVolunteer from "@/lib/isVolunteer";

// Rate limiting configuration
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 15;

interface ClaimAttempt {
  identifier: string;
  success: boolean;
  timestamp: Date;
  item_id?: string;
}

// Check if user has exceeded failed claim attempts rate limit
function checkRateLimit(claimAttempts: ClaimAttempt[]) {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  );

  const recentFailedAttempts = claimAttempts.filter(
    (attempt) => !attempt.success && new Date(attempt.timestamp) >= windowStart,
  );

  const isRateLimited = recentFailedAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS;
  const remainingAttempts = Math.max(
    0,
    RATE_LIMIT_MAX_ATTEMPTS - recentFailedAttempts.length,
  );

  let resetTime = null;
  if (recentFailedAttempts.length > 0) {
    // Find the oldest failed attempt in the window
    const oldestAttempt = recentFailedAttempts.reduce((oldest, current) =>
      new Date(current.timestamp) < new Date(oldest.timestamp)
        ? current
        : oldest,
    );
    resetTime = new Date(
      new Date(oldestAttempt.timestamp).getTime() +
        RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );
  }

  return {
    isRateLimited,
    remainingAttempts,
    resetTime,
    recentFailedAttempts: recentFailedAttempts.length,
  };
}

// POST - Claim a hunt item by identifier
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { identifier } = await request.json();
    identifier = identifier.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    const { id: userId } = await params;

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier is required or invalid" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    // Find the user first - ensure the ID matches the authenticated user
    const user = await User.findOne({
      $and: [{ email: session.user.email }, { _id: userId }],
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found or unauthorized",
        },
        { status: 404 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "User account is inactive. Please contact support." },
        { status: 403 },
      );
    }

    // The page is flag-gated; so is the endpoint behind it, or the hunt can be
    // played through the API before it opens.
    if (
      process.env.SCAVENGER_HUNT_ENABLED !== "true" &&
      !(await isAdmin()) &&
      !(await isVolunteer())
    ) {
      return NextResponse.json(
        { error: "The hunt is not open yet." },
        { status: 403 },
      );
    }

    if (!user.linked_email) {
      return NextResponse.json(
        {
          error:
            "Ticket Email not linked. Please link your email before claiming items.",
        },
        { status: 403 },
      );
    }

    // Ensure claim_attempts array exists (for existing users who might not have this field)
    if (!user.claim_attempts) {
      user.claim_attempts = [];
    }

    // Check rate limiting for failed attempts
    const rateLimitCheck = checkRateLimit(user.claim_attempts);
    if (rateLimitCheck.isRateLimited) {
      const minutesUntilReset = rateLimitCheck.resetTime
        ? Math.ceil(
            (rateLimitCheck.resetTime.getTime() - new Date().getTime()) /
              (1000 * 60),
          )
        : RATE_LIMIT_WINDOW_MINUTES;

      return NextResponse.json(
        {
          error: `Rate limit exceeded. You have made too many failed claim attempts. Please wait ${minutesUntilReset} minutes before trying again.`,
          rateLimitExceeded: true,
          resetTime: rateLimitCheck.resetTime,
          remainingAttempts: 0,
        },
        { status: 429 },
      );
    }

    // Find the hunt item by identifier
    const huntItem = await HuntItem.findOne({ identifier });

    // Create claim attempt record
    const claimAttempt = {
      identifier,
      success: false,
      timestamp: new Date(),
      item_id: huntItem?._id || null,
    };

    if (!huntItem) {
      // Log failed attempt
      user.claim_attempts.push(claimAttempt);
      await user.save();

      // Check how many attempts remaining after this failed attempt
      const updatedRateLimitCheck = checkRateLimit(user.claim_attempts);
      const remainingAttempts = updatedRateLimitCheck.remainingAttempts;

      const errorMessage =
        remainingAttempts > 0
          ? `Hunt item not found. You have ${remainingAttempts} more attempts remaining in the next ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
          : `Hunt item not found. Note: You can make up to ${RATE_LIMIT_MAX_ATTEMPTS} failed attempts every ${RATE_LIMIT_WINDOW_MINUTES} minutes.`;

      return NextResponse.json(
        {
          error: errorMessage,
          remainingAttempts,
          rateLimitInfo: {
            maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
            windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
          },
        },
        { status: 404 },
      );
    }

    // Check if hunt item is active and within activation window
    const isItemActive = huntItem.active == true; // Default to false if not set
    let isWithinActivationWindow = true;

    if (huntItem.activationStart && huntItem.activationEnd) {
      const now = new Date();
      const startDate = new Date(huntItem.activationStart);
      const endDate = new Date(huntItem.activationEnd);
      isWithinActivationWindow = now >= startDate && now <= endDate;
    }

    if (!isItemActive || !isWithinActivationWindow) {
      // Log failed attempt (item not active)
      user.claim_attempts.push(claimAttempt);
      await user.save();

      // Check how many attempts remaining after this failed attempt
      const updatedRateLimitCheck = checkRateLimit(user.claim_attempts);
      const remainingAttempts = updatedRateLimitCheck.remainingAttempts;

      let reason = "This hunt item is currently not available.";
      if (!isItemActive) {
        reason = "This hunt item is currently disabled.";
      } else if (!isWithinActivationWindow) {
        const now = new Date();
        const startDate = new Date(huntItem.activationStart);
        const endDate = new Date(huntItem.activationEnd);
        if (now < startDate) {
          reason = "This hunt item is not yet available.";
        } else if (now > endDate) {
          reason = "This hunt item is no longer available.";
        }
      }

      const errorMessage =
        remainingAttempts > 0
          ? `${reason} You have ${remainingAttempts} more attempts remaining in the next ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
          : `${reason} Note: You can make up to ${RATE_LIMIT_MAX_ATTEMPTS} failed attempts every ${RATE_LIMIT_WINDOW_MINUTES} minutes.`;

      return NextResponse.json(
        {
          error: errorMessage,
          remainingAttempts,
          rateLimitInfo: {
            maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
            windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
          },
        },
        { status: 403 },
      );
    }

    // Check if user has already claimed this item
    if (user.claimedItems.includes(huntItem._id)) {
      // Log failed attempt (duplicate claim)
      user.claim_attempts.push(claimAttempt);
      await user.save();

      // Check how many attempts remaining after this failed attempt
      const updatedRateLimitCheck = checkRateLimit(user.claim_attempts);
      const remainingAttempts = updatedRateLimitCheck.remainingAttempts;

      const errorMessage =
        remainingAttempts > 0
          ? `You have already claimed this hunt item. You have ${remainingAttempts} more attempts remaining in the next ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
          : `You have already claimed this hunt item. Note: You can make up to ${RATE_LIMIT_MAX_ATTEMPTS} failed attempts every ${RATE_LIMIT_WINDOW_MINUTES} minutes.`;

      return NextResponse.json(
        {
          error: errorMessage,
          remainingAttempts,
          rateLimitInfo: {
            maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
            windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
          },
        },
        { status: 400 },
      );
    }

    // Check if hunt item has reached max claims limit
    if (
      huntItem.maxClaims !== null &&
      huntItem.maxClaims !== undefined &&
      huntItem.claimCount >= huntItem.maxClaims
    ) {
      // Log failed attempt (max claims reached)
      user.claim_attempts.push(claimAttempt);
      await user.save();

      // Check how many attempts remaining after this failed attempt
      const updatedRateLimitCheck = checkRateLimit(user.claim_attempts);
      const remainingAttempts = updatedRateLimitCheck.remainingAttempts;

      const errorMessage =
        remainingAttempts > 0
          ? `This hunt item has reached its maximum number of claims. You have ${remainingAttempts} more attempts remaining in the next ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
          : `This hunt item has reached its maximum number of claims. Note: You can make up to ${RATE_LIMIT_MAX_ATTEMPTS} failed attempts every ${RATE_LIMIT_WINDOW_MINUTES} minutes.`;

      return NextResponse.json(
        {
          error: errorMessage,
          remainingAttempts,
          rateLimitInfo: {
            maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
            windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
          },
        },
        { status: 400 },
      );
    }

    // The claim itself is one conditional update: the filter refuses a second
    // concurrent request for the same item, so two taps cannot both be paid.
    const claimed = await User.findOneAndUpdate(
      { _id: user._id, claimedItems: { $ne: huntItem._id } },
      {
        $push: { claimedItems: huntItem._id },
        $inc: { points: huntItem.points || 0 },
      },
      { new: true },
    );

    if (!claimed) {
      return NextResponse.json(
        { error: "You have already claimed this hunt item." },
        { status: 400 },
      );
    }

    claimAttempt.success = true;
    claimed.claim_attempts.push(claimAttempt);

    // Award collectibles linked to this hunt item
    const awardedCollectibles: { _id: string; name: string }[] = [];
    const skippedCollectibles: { _id: string; name: string; reason: string }[] =
      [];

    if (huntItem.collectibles && huntItem.collectibles.length > 0) {
      // Fetch the collectible details
      const collectibleDocs = await Collectible.find({
        _id: { $in: huntItem.collectibles },
      });

      // Add collectibles to user's collection (only if active and within activation period)
      for (const collectible of collectibleDocs) {
        // Check if collectible is active
        if (!collectible.active) {
          skippedCollectibles.push({
            _id: collectible._id.toString(),
            name: collectible.name,
            reason: "Collectible is not active",
          });
          continue;
        }

        // Check if collectible is within activation period
        if (collectible.activationStart && collectible.activationEnd) {
          const now = new Date();
          const startDate = new Date(collectible.activationStart);
          const endDate = new Date(collectible.activationEnd);
          if (now < startDate || now > endDate) {
            skippedCollectibles.push({
              _id: collectible._id.toString(),
              name: collectible.name,
              reason: "Collectible is outside activation period",
            });
            continue;
          }
        }

        // Check if collectible is limited and has remaining stock
        if (collectible.limited && collectible.remaining <= 0) {
          skippedCollectibles.push({
            _id: collectible._id.toString(),
            name: collectible.name,
            reason: "Collectible is sold out",
          });
          continue;
        }

        // Same conditional-update reservation as the shop, so a limited
        // collectible cannot be handed out past its last unit.
        const reserved = await Collectible.findOneAndUpdate(
          collectible.limited
            ? { _id: collectible._id, remaining: { $gt: 0 } }
            : { _id: collectible._id },
          {
            $inc: collectible.limited
              ? { remaining: -1, claimCount: 1 }
              : { claimCount: 1 },
          },
        );

        if (!reserved) {
          skippedCollectibles.push({
            _id: collectible._id.toString(),
            name: collectible.name,
            reason: "Collectible is sold out",
          });
          continue;
        }

        if (!claimed.collectibles) {
          claimed.collectibles = [];
        }
        claimed.collectibles.push({
          collectibleId: collectible._id,
          used: false,
          addedAt: new Date(),
        });
        awardedCollectibles.push({
          _id: collectible._id.toString(),
          name: collectible.name,
        });
      }
    }

    await claimed.save();

    await HuntItem.updateOne(
      { _id: huntItem._id },
      { $inc: { claimCount: 1 } },
    );

    return NextResponse.json({
      success: true,
      message: `Successfully claimed "${huntItem.name}"!`,
      item: {
        name: huntItem.name,
        description: huntItem.description,
        points: huntItem.points,
      },
      collectibles: awardedCollectibles,
      skippedCollectibles:
        skippedCollectibles.length > 0 ? skippedCollectibles : undefined,
      newPoints: claimed.points,
      totalItemsClaimed: claimed.claimedItems.length,
    });
  } catch (error) {
    console.error("Error claiming hunt item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
