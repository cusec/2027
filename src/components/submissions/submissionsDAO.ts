"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Challenge,
  Submission,
  SubmissionTeam,
  TeamSummary,
} from "@/lib/interface";

/**
 * Data access for the delegate-facing submission page.
 *
 * Same shape as the admin DAOs (state + loading + error + actions), so the
 * page components stay declarative. All fetches are relative `/api/...` and
 * therefore same-origin, which is what lets the Auth0 session cookie ride
 * along without any token plumbing.
 */
export const useSubmissions = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [challengeRes, submissionRes] = await Promise.all([
        fetch("/api/challenges"),
        fetch("/api/submissions"),
      ]);

      const challengeData = await challengeRes.json();
      const submissionData = await submissionRes.json();

      if (!challengeData.success) {
        throw new Error(challengeData.error || "Failed to load challenges");
      }
      if (!submissionData.success) {
        throw new Error(submissionData.error || "Failed to load submissions");
      }

      setChallenges(challengeData.challenges);
      setSubmissions(submissionData.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Error loading submission data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Create or replace this delegate's submission for a challenge. */
  const submit = async (challengeId: string, url: string, notes: string) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, url, notes }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to submit");
      }

      // Refetch rather than patching locally: a new entry also moves the
      // challenge's submissionCount, which drives the "full" state.
      await fetchAll();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      console.error("Error submitting:", err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const withdraw = async (submissionId: string) => {
    if (!confirm("Withdraw this submission?")) return false;

    try {
      setError(null);

      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to withdraw submission");
      }

      await fetchAll();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw");
      console.error("Error withdrawing submission:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    challenges,
    submissions,
    loading,
    error,
    isSubmitting,
    setError,
    submit,
    withdraw,
    refetch: fetchAll,
  };
};

/** The delegate's existing submission for a challenge, if any. */
export function findSubmissionFor(
  submissions: Submission[],
  challengeId: string,
): Submission | undefined {
  return submissions.find((s) => {
    const id =
      typeof s.challengeId === "string" ? s.challengeId : s.challengeId?._id;
    return id === challengeId;
  });
}

/** Team membership for group challenges (Dev's Den). */
export const useTeams = () => {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [myTeams, setMyTeams] = useState<Record<string, SubmissionTeam>>({});
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load teams");
      setTeams(data.teams);
      setMyTeams(data.myTeams ?? {});
      setMaxTeamSize(data.maxTeamSize ?? 4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  const act = async (path: string, body?: Record<string, unknown>) => {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Something went wrong");
      await fetchTeams();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    myTeams,
    maxTeamSize,
    loading,
    error,
    busy,
    setError,
    /** The caller's team for one challenge, or null. */
    teamFor: (challengeId: string) => myTeams[challengeId] ?? null,
    /** Every team on one challenge, for the browse list. */
    teamsFor: (challengeId: string) =>
      teams.filter((t) => t.challengeId === challengeId),
    createTeam: (challengeId: string, name: string) =>
      act("/api/teams", { challengeId, name }),
    joinTeam: (teamId: string) => act("/api/teams/join", { teamId }),
    joinByCode: (joinCode: string) => act("/api/teams/join", { joinCode }),
    leaveTeam: (challengeId: string) =>
      act("/api/teams/leave", { challengeId }),
    refetch: fetchTeams,
  };
};
