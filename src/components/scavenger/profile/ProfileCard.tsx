"use client";

import { useState } from "react";
import { Pencil, Mail, MessageCircle, Sparkles } from "lucide-react";
import type { Auth0User, DbUser } from "@/lib/interface";
import OnboardingFlow, {
  type OnboardingMode,
} from "../onboarding/OnboardingFlow";
import EditDiscordModal from "../user/EditDiscordModal";

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

  const name = dbUser.name || "Hunter";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
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

      <div className="aero-card">
        {/* Placeholder identity art — swapped for real graphics later. */}
        <div className="aero-card__face">
          <span className="aero-card__avatar">
            <b>{initial}</b>
          </span>

          <div className="aero-card__who">
            <p className="aero-eyebrow">Delegate</p>
            <h1 className="aero-card__name">{name}</h1>
            <p className="aero-card__mail">{dbUser.email}</p>
          </div>

          <div className="aero-card__score">
            <b>{dbUser.points ?? 0}</b>
            <span>points</span>
          </div>
        </div>

        <div className="aero-card__stats">
          <div>
            <b>{claimed}</b>
            <span>items found</span>
          </div>
          <div>
            <b>{collectibles}</b>
            <span>collectibles</span>
          </div>
          <div>
            <b>{prizes}</b>
            <span>prizes</span>
          </div>
        </div>

        <dl className="aero-card__rows">
          <div className="aero-card__row">
            <dt>
              <Mail aria-hidden="true" />
              Ticket email
            </dt>
            <dd>
              {linkedEmail ? (
                <>
                  <span>{linkedEmail}</span>
                  {emailVerified && (
                    <i className="aero-card__ok">
                      <Sparkles aria-hidden="true" />
                      verified
                    </i>
                  )}
                </>
              ) : (
                <span className="aero-card__missing">Not linked yet</span>
              )}
            </dd>
            <button
              type="button"
              className="aero-btn aero-btn--glass aero-card__act"
              onClick={() => setOnboarding(linkedEmail ? "edit" : "link")}
            >
              {linkedEmail ? "Change" : "Link now"}
            </button>
          </div>

          <div className="aero-card__row">
            <dt>
              <MessageCircle aria-hidden="true" />
              Discord
            </dt>
            <dd>
              {discord || <span className="aero-card__missing">Not set</span>}
            </dd>
            <button
              type="button"
              className="aero-btn aero-btn--glass aero-card__act"
              onClick={() => setDiscordOpen(true)}
            >
              <Pencil aria-hidden="true" />
              Edit
            </button>
          </div>
        </dl>

        {!linkedEmail && (
          <p className="aero-card__note">
            Link the email on your ticket to start scanning codes and earning
            points.
          </p>
        )}
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
