"use client";

import { useState, useEffect, useCallback } from "react";

export interface AdminTeamMember {
  _id: string;
  name?: string;
  email?: string;
  points?: number;
}

export interface AdminTeam {
  _id: string;
  name: string;
  /** Teams belong to one challenge; null only for pre-migration rows. */
  challenge: { _id: string; title: string } | null;
  joinCode: string;
  createdAt?: string;
  submissionCount: number;
  members: AdminTeamMember[];
}

export interface AdminTeamSubmission {
  _id: string;
  url: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  pointsAwarded: number;
  userEmail: string;
  createdAt?: string;
  challengeTitle: string;
  challengeEvent: string;
}

export const useAdminTeams = (isOpen: boolean) => {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/teams");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch teams");
      setTeams(data.teams);
      setMaxTeamSize(data.maxTeamSize ?? 4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teams");
    } finally {
      setLoading(false);
    }
  }, []);

  const renameTeam = async (id: string, name: string) => {
    try {
      setBusyId(id);
      setError(null);
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to rename team");
      await fetchTeams();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename team");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const deleteTeam = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete "${name}"? Its submissions are removed too. Points already granted are NOT reversed.`,
      )
    ) {
      return false;
    }
    try {
      setBusyId(id);
      setError(null);
      const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete team");
      setWarning(data.warning ?? null);
      await fetchTeams();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (
    teamId: string,
    userId: string,
    label: string,
    teamName: string,
  ) => {
    if (!confirm(`Remove ${label} from "${teamName}"?`)) return false;
    try {
      setBusyId(teamId);
      setError(null);
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Failed to remove member");
      if (data.teamDeleted) {
        setWarning(`"${teamName}" had no members left and was removed.`);
      }
      await fetchTeams();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      setError(null);
      setWarning(null);
    }
  }, [isOpen, fetchTeams]);

  return {
    teams,
    maxTeamSize,
    loading,
    error,
    warning,
    busyId,
    setError,
    setWarning,
    renameTeam,
    deleteTeam,
    removeMember,
    fetchTeams,
  };
};

/** One team's submissions, loaded on demand. */
export const useTeamSubmissions = (teamId: string | null) => {
  const [submissions, setSubmissions] = useState<AdminTeamSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setSubmissions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/teams/${teamId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to load");
        if (!cancelled) setSubmissions(data.submissions);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return { submissions, loading, error };
};
