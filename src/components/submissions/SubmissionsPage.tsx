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
 *
 * Styled with the main site's v2 design system (see styles/v2/submissions.css)
 * rather than the grayscale scavenger theme, so it matches 2027.cusec.net.
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
    <section className="v2-section v2-sub">
      <div className="v2-container v2-sub__inner">
        <header className="v2-sub__head">
          <h1 className="v2-sub__title">Submissions</h1>
          <p className="v2-sub__sub">
            Pick a challenge and share the link to your video.
          </p>
          <p className="v2-sub__who">
            Submitting as <b>{userEmail}</b>
          </p>
        </header>

        {error && (
          <div className="v2-sub__error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <p className="v2-sub__loading">Loading challenges…</p>
        ) : challenges.length === 0 ? (
          <div className="v2-sub__empty">
            <b>No challenges yet.</b>
            Challenges appear here once the events team publishes them. Check
            back closer to your event.
          </div>
        ) : (
          <div className="v2-sub__groups">
            {grouped.map(([eventName, eventChallenges]) => (
              <section key={eventName}>
                <h2 className="v2-sub__group-title">{eventName}</h2>
                <div className="v2-sub__list">
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
    </section>
  );
};

export default SubmissionsPage;
