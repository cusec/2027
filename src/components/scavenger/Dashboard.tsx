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
    // `.v2-hunt-page` is the hook the v2 stylesheet uses to lift these
    // Tailwind-built sections onto the main site's type and card language —
    // see src/app/styles/v2/scavenger.css.
    <div className="w-full v2-section v2-hunt-page">
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
              <div className="rounded-xl border border-light-mode/15 bg-dark-mode/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-light-mode/85 text-sm font-medium">
                  Link your ticket email to scan codes and earn points.
                </p>
                <button
                  onClick={() => openOnboarding("link")}
                  className="shrink-0 px-4 py-2 rounded-full bg-accent text-primary text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
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
