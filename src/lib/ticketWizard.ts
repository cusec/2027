import connectMongoDB from "./mongodb";
import { User, RegisteredUser, DemographicInfo } from "./models";
import {
  INTEREST_SECTIONS,
  REQUIRED_SECTIONS,
  type SectionId,
} from "./ticketWizardOptions";

export type WizardStep = "profile" | "interests" | "purchase" | "completed";

export interface WizardStatus {
  /** Basics and background saved: the only sections required before buying. */
  profileComplete: boolean;
  /** Both interest sections saved, even with every optional answer left blank. */
  interestsComplete: boolean;
  purchaseComplete: boolean;
  linkedEmail: string | null;
  purchasedTicketName: string | null;
}

interface LeanWizardUser {
  _id: unknown;
  linked_email?: string;
  ticketWizard?: {
    purchasedTicketName?: string | null;
  };
}

type SavedSections = Partial<Record<SectionId, Date | string | null>>;

// Every gate re-derives its prerequisite from real data: which profile
// sections carry a saved timestamp, and whether the linked email is verified
// against RegisteredUser. ticketWizard.currentStep is only a cache for
// UI/analytics and is never trusted here.
export async function getWizardStatus(email: string): Promise<WizardStatus> {
  await connectMongoDB();

  const user = await User.findOne({ email }).lean<LeanWizardUser>();
  if (!user) {
    return {
      profileComplete: false,
      interestsComplete: false,
      purchaseComplete: false,
      linkedEmail: null,
      purchasedTicketName: null,
    };
  }

  const profile = await DemographicInfo.findOne({ user: user._id })
    .select("sections")
    .lean<{ sections?: SavedSections }>();
  const saved = (id: SectionId) => Boolean(profile?.sections?.[id]);

  let purchaseComplete = false;
  if (user.linked_email) {
    const registeredUser = await RegisteredUser.findOne({
      linkedEmail: user.linked_email,
      isLinked: true,
    }).lean();
    purchaseComplete = !!registeredUser;
  }

  return {
    profileComplete: REQUIRED_SECTIONS.every(saved),
    interestsComplete: INTEREST_SECTIONS.every(saved),
    purchaseComplete,
    linkedEmail: user.linked_email ?? null,
    // Only reported alongside a linked ticket. The stored name outlives an
    // unlinked or refunded order, and the ticket cards mark themselves
    // "Purchased" from it, which blocked buying again.
    purchasedTicketName: purchaseComplete
      ? (user.ticketWizard?.purchasedTicketName ?? null)
      : null,
  };
}
