"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import ChallengeCard from "./ChallengeCard";
import { useSubmissions, useTeams, findSubmissionFor } from "./submissionsDAO";
import TeamModal from "./TeamModal";
import type { Challenge } from "@/lib/interface";

interface SubmissionsPageProps {
  /** Shown so delegates know which account their entries are filed under. */
  userEmail: string;
}

/** Every open challenge in one list, each with its own inline submit form. */
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

  const teamState = useTeams();
  const hasGroupChallenge = challenges.some((c) => c.mode === "group");
  const [teamOpen, setTeamOpen] = useState(false);

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
          <div className="v2-glass v2-sub__error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <p className="v2-glass v2-sub__loading">Loading challenges…</p>
        ) : challenges.length === 0 ? (
          <div className="v2-glass v2-sub__empty">
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
                      teamName={teamState.myTeam?.name ?? null}
                      maxTeamSize={teamState.maxTeamSize}
                      onOpenTeam={() => setTeamOpen(true)}
                      onSubmit={submit}
                      onWithdraw={withdraw}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {hasGroupChallenge && (
          <TeamModal
            isOpen={teamOpen}
            onClose={() => setTeamOpen(false)}
            teams={teamState}
          />
        )}
      </div>
    </section>
  );
};

export default SubmissionsPage;
