import connectMongoDB from "./mongodb";
import { User, RegisteredUser, DemographicInfo } from "./models";
import {
  INTEREST_SECTIONS,
  REQUIRED_SECTIONS,
  type SectionId,
} from "./ticketWizardOptions";

export type WizardStep = "profile" | "interests" | "purchase" | "completed";

export interface WizardStatus {
  profileComplete: boolean;
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
    purchasedTicketName: purchaseComplete
      ? (user.ticketWizard?.purchasedTicketName ?? null)
      : null,
  };
}
