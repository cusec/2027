"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import ChallengeCard from "./ChallengeCard";
import { useSubmissions, findSubmissionFor } from "./submissionsDAO";
import type { Challenge } from "@/lib/interface";

interface SubmissionsPageProps {
  /** Shown so delegates know which account their entries are filed under. */
  userEmail: string;
}

/**
 * The single central submission page (TECHxEVENTS.txt): every open challenge
 * in one list, each with its own inline submit form. Events host the
 * challenges themselves — all this does is collect the links.
 */
const SubmissionsPage = ({ userEmail }: SubmissionsPageProps) => {
  const {
    challenges,
    submissions,
    loading,
    error,
    isSubmitting,
    submit,
    withdraw,
  } = useSubmissions();

  // Group by event so a delegate scanning the page can find their event's
  // challenges without reading every card.
  const grouped = useMemo(() => {
    const groups = new Map<string, Challenge[]>();
    challenges.forEach((challenge) => {
      const key = challenge.eventName || "General";
      const list = groups.get(key) ?? [];
      list.push(challenge);
      groups.set(key, list);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [challenges]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide">SUBMISSIONS</h1>
        <p className="mt-2 opacity-80">
          Pick a challenge and share the link to your video.
        </p>
        <p className="mt-1 text-sm opacity-60">Submitting as {userEmail}</p>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border-2 border-light-mode/30 bg-dark-mode/50 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="opacity-70">Loading challenges…</p>
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border-2 border-light-mode/30 bg-dark-mode/50 p-6">
          <p className="font-semibold">No challenges yet.</p>
          <p className="mt-1 text-sm opacity-70">
            Challenges appear here once the events team publishes them. Check
            back closer to your event.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([eventName, eventChallenges]) => (
            <section key={eventName}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">
                {eventName}
              </h2>
              <div className="space-y-4">
                {eventChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge._id}
                    challenge={challenge}
                    submission={findSubmissionFor(submissions, challenge._id)}
                    isSubmitting={isSubmitting}
                    onSubmit={submit}
                    onWithdraw={withdraw}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionsPage;
