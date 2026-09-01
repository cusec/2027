"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Auth0User, DbUser } from "@/lib/interface";
import OnboardingFlow, { OnboardingMode } from "./onboarding/OnboardingFlow";
import NoticeBoard from "./NoticeBoard";
import Leaderboard from "./Leaderboard";
import Shop from "./Shop";
import DashboardFAQ from "./faqs/DashboardFAQ";

interface DashboardProps {
  user: Auth0User;
  dbUser: DbUser | null;
  baseURL: string;
  emailVerified?: boolean;
}

const Dashboard = ({ user, dbUser, emailVerified = false }: DashboardProps) => {
  const [linkedEmail, setLinkedEmail] = useState<string | undefined>(
    dbUser?.linked_email || undefined
  );
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(
    dbUser?.hasSeenIntro ?? false
  );

  const alreadyOnboarded =
    (!!dbUser?.linked_email && emailVerified) || !!dbUser?.hasSeenIntro;

  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode | null>(
    dbUser && !alreadyOnboarded ? "first-login" : null
  );

  const handleOnboardingComplete = (newLinkedEmail?: string) => {
    if (newLinkedEmail) setLinkedEmail(newLinkedEmail);
    setHasSeenIntro(true);
    setOnboardingMode(null);
  };

  return (
    <div className="aero-hunt">
      {dbUser && onboardingMode && (
        <OnboardingFlow
          user={user}
          dbUser={{ ...dbUser, linked_email: linkedEmail, hasSeenIntro }}
          mode={onboardingMode}
          onComplete={handleOnboardingComplete}
        />
      )}

      {dbUser && (
        <header className="aero-hero">
          <div className="aero-hero__text">
            <p className="aero-eyebrow">Welcome back</p>
            <h1 className="aero-hero__name">
              {dbUser.name || "Hunter"}
            </h1>
            {!linkedEmail && (
              <Link href="/scavenger/profile" className="aero-btn aero-hero__cta">
                Link your ticket email
              </Link>
            )}
          </div>

          <Link
            href="/scavenger/profile"
            className="aero-score"
          >
            <b>{dbUser.points ?? 0}</b>
            <span>points</span>
          </Link>
        </header>
      )}

      <NoticeBoard />
      <Leaderboard />
      <Shop user={user} dbUser={dbUser} />
      <DashboardFAQ />
    </div>
  );
};

export default Dashboard;
