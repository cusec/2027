"use client";

import { useState } from "react";
import { IdCard, Trophy } from "lucide-react";
import type { Auth0User, DbUser } from "@/lib/interface";
import OnboardingFlow, {
  type OnboardingMode,
} from "../onboarding/OnboardingFlow";
import EditDiscordModal from "../user/EditDiscordModal";
import Signature from "./Signature";

interface ProfileCardProps {
  user: Auth0User;
  dbUser: DbUser;
  emailVerified: boolean;
}

const ProfileCard = ({ user, dbUser, emailVerified }: ProfileCardProps) => {
  const [linkedEmail, setLinkedEmail] = useState(dbUser.linked_email);
  const [discord, setDiscord] = useState(dbUser.discord_handle ?? null);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingMode | null>(null);

  const roles = user?.["cusec/roles"] ?? [];
  const role = roles.includes("Admin")
    ? "Admin"
    : roles.includes("Volunteer")
      ? "Volunteer"
      : "Delegate";

  const name = dbUser.name || "Hunter";
  const points = dbUser.points ?? 0;
  const claimed = dbUser.claimedItems?.length ?? 0;
  const collectibles = dbUser.collectibles?.length ?? 0;
  const prizes = dbUser.shopPrizes?.length ?? 0;

  return (
    <>
      {onboarding && (
        <OnboardingFlow
          user={user}
          dbUser={{ ...dbUser, linked_email: linkedEmail }}
          mode={onboarding}
          onComplete={(next) => {
            if (next) setLinkedEmail(next);
            setOnboarding(null);
          }}
        />
      )}

      <div className="v2-profile">
        <article className="v2-sig">
          {/* Seeded from the record, so renaming yourself does not redraw you. */}
          <Signature seed={dbUser._id || dbUser.email || name} />

          <span className="v2-sig__frame" aria-hidden="true" />
          <span className="v2-sig__edition" aria-hidden="true">
            XXVI
          </span>

          <p className="v2-sig__eyebrow">{role}</p>
          <h1 className="v2-sig__name">{name}</h1>

          <p className="v2-sig__hero">
            <b>{points.toLocaleString("en-CA")}</b>
            <span>points earned so far</span>
          </p>

          <p className="v2-sig__meta">
            <span>CUSEC 2027</span>
            <span>26th edition</span>
            <span>Montréal, QC</span>
          </p>
        </article>

        <section className="aero-sec">
          <h2 className="aero-sec__title">
            <Trophy aria-hidden="true" />
            Your progress
          </h2>
          <div className="v2-card v2-glass v2-tally">
            <div className="v2-tally__cell">
              <b>{claimed}</b>
              <span>items found</span>
            </div>
            <div className="v2-tally__cell">
              <b>{collectibles}</b>
              <span>collectibles</span>
            </div>
            <div className="v2-tally__cell">
              <b>{prizes}</b>
              <span>prizes</span>
            </div>
          </div>
        </section>

        <section className="aero-sec">
          <h2 className="aero-sec__title">
            <IdCard aria-hidden="true" />
            Account
          </h2>
          <dl className="v2-card v2-glass v2-acct">
            <div className="v2-acct__row">
              <dt>Ticket email</dt>
              <dd>
                {linkedEmail ? (
                  <>
                    <span className="v2-acct__value">{linkedEmail}</span>
                    {emailVerified && <i className="v2-acct__ok">verified</i>}
                  </>
                ) : (
                  <span className="v2-acct__none">Not linked yet</span>
                )}
              </dd>
              <button
                type="button"
                className="aero-btn aero-btn--glass v2-acct__act"
                onClick={() => setOnboarding(linkedEmail ? "edit" : "link")}
              >
                {linkedEmail ? "Change" : "Link now"}
              </button>
            </div>

            <div className="v2-acct__row">
              <dt>Discord</dt>
              <dd>
                {discord ? (
                  <span className="v2-acct__value">{discord}</span>
                ) : (
                  <span className="v2-acct__none">Not set</span>
                )}
              </dd>
              <button
                type="button"
                className="aero-btn aero-btn--glass v2-acct__act"
                onClick={() => setDiscordOpen(true)}
              >
                Edit
              </button>
            </div>

            {!linkedEmail && (
              <p className="v2-acct__note">
                Link the email on your ticket to start scanning codes and
                earning points.
              </p>
            )}
          </dl>
        </section>
      </div>

      <EditDiscordModal
        userId={dbUser._id}
        currentHandle={discord}
        isOpen={discordOpen}
        onClose={() => setDiscordOpen(false)}
        onSave={setDiscord}
      />
    </>
  );
};

export default ProfileCard;
