"use client";

import { useState } from "react";
import { Auth0User, DbUser } from "@/lib/interface";
import EmailLinkScreen from "./EmailLinkScreen";
import PersonalityQuiz from "./PersonalityQuiz";
import AvatarCustomize from "./AvatarCustomize";

type Step = "email" | "personality" | "avatar";

export type OnboardingMode = "first-login" | "link" | "edit";

interface OnboardingFlowProps {
  user: Auth0User;
  dbUser: DbUser;
  mode: OnboardingMode;
  onComplete: (linkedEmail?: string) => void;
}

const markIntroSeen = () =>
  fetch("/api/users/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hasSeenIntro: true }),
  });

const savePersonality = (personalityType: string) =>
  fetch("/api/users/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personalityType }),
  });

const OnboardingFlow = ({
  user,
  dbUser,
  mode,
  onComplete,
}: OnboardingFlowProps) => {
  const initialStep: Step =
    mode === "edit" ? "personality" : "email";

  const [step, setStep] = useState<Step>(initialStep);
  const [linkedEmail, setLinkedEmail] = useState<string | undefined>(
    dbUser.linked_email
  );

  // ── Screen 1: email linking ──────────────────────────────────────────────
  const handleEmailLinked = (email: string) => {
    setLinkedEmail(email);
    setStep("personality");
  };

  const handleEmailSkipped = async () => {
    await markIntroSeen();
    onComplete();
  };

  // ── Screen 2: personality quiz ───────────────────────────────────────────
  const handlePersonalityComplete = async (personalityType: string | null) => {
    if (personalityType) await savePersonality(personalityType);
    setStep("avatar");
  };

  const handlePersonalitySkipped = () => {
    setStep("avatar");
  };

  // ── Screen 3: avatar ─────────────────────────────────────────────────────
  const handleAvatarComplete = async () => {
    await markIntroSeen();
    onComplete(linkedEmail);
  };

  if (step === "email") {
    return (
      <EmailLinkScreen
        user={user}
        dbUser={dbUser}
        onEmailLinked={handleEmailLinked}
        onSkip={handleEmailSkipped}
      />
    );
  }

  if (step === "personality") {
    return (
      <PersonalityQuiz
        onComplete={handlePersonalityComplete}
        onSkip={handlePersonalitySkipped}
      />
    );
  }

  return <AvatarCustomize onComplete={handleAvatarComplete} />;
};

export default OnboardingFlow;
