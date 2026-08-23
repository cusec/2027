"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle, ExternalLink, Trash2 } from "lucide-react";
import type { Challenge, Submission } from "@/lib/interface";
import { isChallengeOpen } from "@/lib/challenges";

interface ChallengeCardProps {
  challenge: Challenge;
  submission?: Submission;
  isSubmitting: boolean;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit(challenge._id, url, notes);
    if (ok) setExpanded(false);
  };

  return (
    <div className="rounded-2xl border-2 border-light-mode/30 bg-dark-mode/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {challenge.eventName && (
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
              {challenge.eventName}
            </p>
          )}
          <h3 className="text-lg font-bold">{challenge.title}</h3>
          {challenge.points > 0 && (
            <p className="mt-0.5 text-sm font-semibold opacity-80">
              {challenge.points} point{challenge.points === 1 ? "" : "s"} once
              approved
            </p>
          )}
        </div>

        {status && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-light-mode/30 px-3 py-1 text-xs font-semibold">
            <status.Icon className="h-4 w-4" />
            {status.label}
          </span>
        )}
      </div>

      {challenge.description && (
        <p className="mt-2 text-sm opacity-80">{challenge.description}</p>
      )}

      {window && <p className="mt-2 text-xs opacity-60">Open {window}</p>}

      {submission && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <a
            href={submission.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 underline underline-offset-2 break-all"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Your submission
          </a>
          {submission.status !== "approved" && (
            <button
              type="button"
              onClick={() => onWithdraw(submission._id)}
              className="inline-flex items-center gap-1.5 opacity-70 hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
              Withdraw
            </button>
          )}
        </div>
      )}

      {submission?.status === "approved" ? (
        <p className="mt-4 text-sm opacity-70">
          Approved
          {submission.pointsAwarded > 0
            ? ` — ${submission.pointsAwarded} point${
                submission.pointsAwarded === 1 ? "" : "s"
              } added to your total.`
            : "."}{" "}
          This entry is locked; ask an organizer if it needs changing.
        </p>
      ) : !open && !submission ? (
        <p className="mt-4 text-sm opacity-60">
          {challenge.active
            ? "This challenge is closed to new submissions."
            : "Not open yet."}
        </p>
      ) : !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="register-hover mt-4 rounded-2xl border-2 border-light-mode/50 px-4 py-2 text-sm font-semibold"
        >
          {submission ? "Edit submission" : "Submit a link"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={`url-${challenge._id}`}
              className="mb-1 block text-sm font-semibold"
            >
              Video link
            </label>
            <input
              id={`url-${challenge._id}`}
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/... or https://tiktok.com/..."
              className="w-full rounded-xl border-2 border-light-mode/30 bg-dark-mode/60 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor={`notes-${challenge._id}`}
              className="mb-1 block text-sm font-semibold"
            >
              Notes <span className="font-normal opacity-60">(optional)</span>
            </label>
            <textarea
              id={`notes-${challenge._id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border-2 border-light-mode/30 bg-dark-mode/60 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="register-hover rounded-2xl border-2 border-light-mode/50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : submission ? "Replace" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-2xl px-4 py-2 text-sm font-semibold opacity-70 hover:opacity-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChallengeCard;
