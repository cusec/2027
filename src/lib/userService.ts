import { randomUUID } from "node:crypto";
import connectMongoDB from "./mongodb";
import { User } from "./models";
import { trackServerEvent } from "./analytics/server";

export interface UserData {
  email: string;
  name?: string;
  /**
   * Where the account was created from - a controlled value for the
   * `account_created` event, never free text.
   */
  entryPoint?: "tickets" | "scavenger" | "other";
}

export async function findOrCreateUser(userData: UserData) {
  await connectMongoDB();

  try {
    const user = await User.findOne({ email: userData.email });

    if (!user) {
      const created = new User({
        email: userData.email,
        name: userData.name,
        points: 0,
        claimedItems: [],
        claim_attempts: [],
      });
      await created.save();

      // The account-creation conversion. Emitted only in this branch so
      // returning users can never inflate it.
      void trackServerEvent(
        "account_created",
        {
          entry_point: userData.entryPoint ?? "other",
          method: "auth0",
        },
        await ensureAnalyticsId(created),
      );

      return created;
    }

    // Update name if provided and not already set
    if (userData.name && !user.name) {
      user.name = userData.name;
      await user.save();
    }

    // Initialize claim_attempts if it doesn't exist (for existing users)
    if (!user.claim_attempts) {
      user.claim_attempts = [];
      await user.save();
    }

    return user;
  } catch (error) {
    console.error("Error in findOrCreateUser:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  await connectMongoDB();

  try {
    const user = await User.findOne({ email }).populate("claimedItems");
    return user;
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw error;
  }
}

/**
 * Returns the user's random PostHog distinct id, assigning one on first use.
 * Duck-typed so any hydrated User doc works; the write is a one-time lazy
 * backfill for accounts created before analytics existed.
 */
export async function ensureAnalyticsId(user: {
  analyticsId?: string | null;
  save(): Promise<unknown>;
}): Promise<string> {
  if (user.analyticsId) return user.analyticsId;
  user.analyticsId = randomUUID();
  await user.save();
  return user.analyticsId;
}
