"use client";

import { useState } from "react";
import { Auth0User, DbUser } from "@/lib/interface";
import OnboardingFlow, {
  OnboardingMode,
} from "./onboarding/OnboardingFlow";
import NoticeBoard from "./NoticeBoard";
import UserHunt from "./UserHunt";
import Leaderboard from "./Leaderboard";
import Shop from "./Shop";
import DashboardFAQ from "./faqs/DashboardFAQ";

interface DashboardProps {
  user: Auth0User;
  dbUser: DbUser | null;
  baseURL: string;
  emailVerified?: boolean;
}

const Dashboard = ({ user, dbUser, baseURL, emailVerified = false }: DashboardProps) => {
  const [linkedEmail, setLinkedEmail] = useState<string | undefined>(
    dbUser?.linked_email || undefined
  );
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(
    dbUser?.hasSeenIntro ?? false
  );

  // Skip onboarding if the user already has a verified linked email,
  // or has explicitly completed/dismissed the intro flow before.
  const alreadyOnboarded =
    (!!dbUser?.linked_email && emailVerified) || !!dbUser?.hasSeenIntro;

  const [onboardingMode, setOnboardingMode] =
    useState<OnboardingMode | null>(
      dbUser && !alreadyOnboarded ? "first-login" : null
    );

  const handleOnboardingComplete = (newLinkedEmail?: string) => {
    if (newLinkedEmail) setLinkedEmail(newLinkedEmail);
    setHasSeenIntro(true);
    setOnboardingMode(null);
  };

  const openOnboarding = (mode: OnboardingMode) => {
    setOnboardingMode(mode);
  };

  return (
    <div className="w-full">
      {/* Full-page onboarding overlay */}
      {dbUser && onboardingMode && (
        <OnboardingFlow
          user={user}
          dbUser={{ ...dbUser, linked_email: linkedEmail, hasSeenIntro }}
          mode={onboardingMode}
          onComplete={handleOnboardingComplete}
        />
      )}

      <NoticeBoard />

      {dbUser && (
        <>
          {/* Email link CTA (shown when intro done but no linked email) */}
          {hasSeenIntro && !linkedEmail && (
            <div className="mx-auto max-w-2xl px-6 py-4">
              <div className="rounded-xl border border-teal-300 bg-teal-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-teal-800 text-sm font-medium">
                  Link your ticket email to scan codes and earn points.
                </p>
                <button
                  onClick={() => openOnboarding("link")}
                  className="shrink-0 px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors cursor-pointer"
                >
                  Link Email
                </button>
              </div>
            </div>
          )}

          {/* Edit profile button (shown whenever email is linked) */}
          {linkedEmail && (
            <div className="relative z-50 mx-auto max-w-2xl px-6 pt-4 flex justify-end">
              <button
                onClick={() => openOnboarding("edit")}
                className="text-xs text-light-mode/50 hover:text-light-mode/80 transition-colors cursor-pointer underline underline-offset-2"
              >
                Edit Profile
              </button>
            </div>
          )}

          <UserHunt
            user={user}
            dbUser={dbUser}
            linkedEmail={linkedEmail}
            baseURL={baseURL}
          />
        </>
      )}

      <Leaderboard />
      <Shop user={user} dbUser={dbUser} />
      <DashboardFAQ />
    </div>
  );
};

export default Dashboard;
