"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle, ExternalLink, Trash2 } from "lucide-react";
import type { Challenge, Submission } from "@/lib/interface";
import { isChallengeOpen } from "@/lib/challenges";

interface ChallengeCardProps {
  challenge: Challenge;
  submission?: Submission;
  isSubmitting: boolean;
  /** The delegate's team name, or null when they aren't on one. */
  teamName?: string | null;
  onSubmit: (challengeId: string, url: string, notes: string) => Promise<boolean>;
  onWithdraw: (submissionId: string) => Promise<boolean>;
}

const STATUS_META = {
  approved: { Icon: CheckCircle2, label: "Approved" },
  rejected: { Icon: XCircle, label: "Not accepted" },
  pending: { Icon: Clock, label: "Awaiting review" },
} as const;

function formatWindow(challenge: Challenge): string | null {
  if (!challenge.activationStart || !challenge.activationEnd) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  return `${fmt(challenge.activationStart)} — ${fmt(challenge.activationEnd)}`;
}

const ChallengeCard = ({
  challenge,
  submission,
  isSubmitting,
  teamName = null,
  onSubmit,
  onWithdraw,
}: ChallengeCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(submission?.url ?? "");
  const [notes, setNotes] = useState(submission?.notes ?? "");

  // An existing submission can always be edited, even once the challenge is
  // full — the cap only gates brand-new entries.
  const open = isChallengeOpen(challenge) || Boolean(submission);
  const status = submission ? STATUS_META[submission.status] : null;
  const window = formatWindow(challenge);
  const isApproved = submission?.status === "approved";
  // A group challenge can't be answered until the delegate is on a team; the
  // API enforces the same rule, this just explains it before they try.
  const isGroup = challenge.mode === "group";
  const needsTeam = isGroup && !teamName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit(challenge._id, url, notes);
    if (ok) setExpanded(false);
  };

  return (
    <article className="v2-chal">
      <div className="v2-chal__head">
        <div>
          <h3 className="v2-chal__title">{challenge.title}</h3>
          {isGroup && (
            <p className="v2-chal__mode">
              Group challenge
              {teamName ? ` · submitting as ${teamName}` : ""}
            </p>
          )}
          {challenge.points > 0 && (
            <p className="v2-chal__points">
              {challenge.points} point{challenge.points === 1 ? "" : "s"} once
              approved
            </p>
          )}
        </div>

        {status && submission && (
          <span
            className={`v2-chal__status v2-chal__status--${submission.status}`}
          >
            <status.Icon aria-hidden="true" />
            {status.label}
          </span>
        )}
      </div>

      {challenge.description && (
        <p className="v2-chal__desc">{challenge.description}</p>
      )}

      {window && <p className="v2-chal__window">Open {window}</p>}

      {submission && (
        <div className="v2-chal__mine">
          <a
            href={submission.url}
            target="_blank"
            rel="noopener noreferrer"
            className="v2-chal__link"
          >
            <ExternalLink aria-hidden="true" />
            Your submission
          </a>

          {/* Approved entries are locked: points are never clawed back
              automatically, so withdrawing one would bank the points and
              remove the evidence. The API rejects it too. */}
          {!isApproved && (
            <button
              type="button"
              className="v2-chal__withdraw"
              onClick={() => onWithdraw(submission._id)}
            >
              <Trash2 aria-hidden="true" />
              Withdraw
            </button>
          )}
        </div>
      )}

      {isApproved && submission ? (
        <p className="v2-chal__note">
          Approved
          {submission.pointsAwarded > 0
            ? ` — ${submission.pointsAwarded} point${
                submission.pointsAwarded === 1 ? "" : "s"
              } added to your total.`
            : "."}{" "}
          This entry is locked; ask an organizer if it needs changing.
        </p>
      ) : needsTeam ? (
        <p className="v2-chal__note">
          Create or join a team above before submitting to this one.
        </p>
      ) : !open && !submission ? (
        <p className="v2-chal__note">
          {challenge.active
            ? "This challenge is closed to new submissions."
            : "Not open yet."}
        </p>
      ) : !expanded ? (
        <p className="v2-chal__open">
          <button
            type="button"
            className="v2-btn v2-btn--primary"
            onClick={() => setExpanded(true)}
          >
            {submission ? "Edit submission" : "Submit a link"}
          </button>
        </p>
      ) : (
        <form className="v2-chal__form" onSubmit={handleSubmit}>
          <label className="v2-chal__field" htmlFor={`url-${challenge._id}`}>
            <span>Video link</span>
            <input
              id={`url-${challenge._id}`}
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/... or https://tiktok.com/..."
            />
          </label>

          <label className="v2-chal__field" htmlFor={`notes-${challenge._id}`}>
            <span>
              Notes <i>(optional)</i>
            </span>
            <textarea
              id={`notes-${challenge._id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </label>

          <div className="v2-chal__actions">
            <button
              type="submit"
              className="v2-btn v2-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : submission ? "Replace" : "Submit"}
            </button>
            <button
              type="button"
              className="v2-chal__cancel"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
};

export default ChallengeCard;
