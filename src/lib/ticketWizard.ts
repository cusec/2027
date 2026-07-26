import connectMongoDB from "./mongodb";
import { User, RegisteredUser, DemographicInfo } from "./models";

export type WizardStep = "demographics" | "avatar" | "purchase" | "completed";

export interface WizardStatus {
  demographicsComplete: boolean;
  avatarComplete: boolean;
  purchaseComplete: boolean;
  linkedEmail: string | null;
  purchasedTicketName: string | null;
}

interface LeanWizardUser {
  _id: unknown;
  linked_email?: string;
  ticketWizard?: {
    avatarCompletedAt?: Date | string | null;
    purchasedTicketName?: string | null;
  };
}

// Every gate re-derives its own prerequisite from the real underlying data
// (a DemographicInfo doc exists, ticketWizard.avatarCompletedAt is set, the
// linked email is verified against RegisteredUser) rather than trusting
// ticketWizard.currentStep, which is only a cache for UI/analytics.
export async function getWizardStatus(email: string): Promise<WizardStatus> {
  await connectMongoDB();

  const user = await User.findOne({ email }).lean<LeanWizardUser>();
  if (!user) {
    return {
      demographicsComplete: false,
      avatarComplete: false,
      purchaseComplete: false,
      linkedEmail: null,
      purchasedTicketName: null,
    };
  }

  const demographicsExist = await DemographicInfo.exists({ user: user._id });

  let purchaseComplete = false;
  if (user.linked_email) {
    const registeredUser = await RegisteredUser.findOne({
      linkedEmail: user.linked_email,
      isLinked: true,
    }).lean();
    purchaseComplete = !!registeredUser;
  }

  return {
    demographicsComplete: !!demographicsExist,
    avatarComplete: !!user.ticketWizard?.avatarCompletedAt,
    purchaseComplete,
    linkedEmail: user.linked_email ?? null,
    purchasedTicketName: user.ticketWizard?.purchasedTicketName ?? null,
  };
}
