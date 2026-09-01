"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Users,
  Trash2,
  Pencil,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  useAdminTeams,
  useTeamSubmissions,
  type AdminTeam,
} from "./teamsDAO";

interface TeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const TeamsModal = ({ isOpen, onClose, isAdmin }: TeamsModalProps) => {
  const {
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
  } = useAdminTeams(isOpen);

  const [query, setQuery] = useState("");
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const { submissions, loading: subsLoading } = useTeamSubmissions(openTeam);

  const filtered = useMemo(() => {
    if (!query.trim()) return teams;
    const q = query.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.joinCode.toLowerCase().includes(q) ||
        t.members.some(
          (m) =>
            (m.name || "").toLowerCase().includes(q) ||
            (m.email || "").toLowerCase().includes(q)
        )
    );
  }, [teams, query]);

  const startRename = (team: AdminTeam) => {
    setEditingId(team._id);
    setDraftName(team.name);
  };

  return (
    <Modal
      simple={true}
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Teams"
      className="max-w-4xl max-h-[70vh] text-dark-mode"
    >
      <div className="space-y-5">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Deleting a team also deletes its submissions. Points already granted
          for those entries are <strong>not</strong> reversed — adjust members
          individually in Manage Users.
        </p>

        {warning && (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p className="text-sm text-amber-900">{warning}</p>
            </div>
            <button
              onClick={() => setWarning(null)}
              className="mt-2 text-sm text-amber-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-dark-mode">
            Teams ({filtered.length}
            {query && ` of ${teams.length}`})
          </h3>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by team, join code or member…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading teams…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {teams.length === 0
              ? "No teams yet. Delegates create them from the submissions page."
              : "No teams match that search."}
          </p>
        ) : (
          <div className="space-y-3 overflow-y-auto">
            {filtered.map((team) => {
              const isEditing = editingId === team._id;
              const isBusy = busyId === team._id;
              const expanded = openTeam === team._id;

              return (
                <div
                  key={team._id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Team name"
                          />
                          <button
                            onClick={async () => {
                              if (await renameTeam(team._id, draftName)) {
                                setEditingId(null);
                              }
                            }}
                            disabled={isBusy}
                            className="rounded-lg p-2 text-green-700 hover:bg-green-50"
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-dark-mode">
                            {team.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            <Users size={12} />
                            {team.members.length}/{maxTeamSize}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                            <KeyRound size={12} />
                            {team.joinCode}
                          </span>
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            {team.submissionCount} submission
                            {team.submissionCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      )}

                      <ul className="mt-3 flex flex-wrap gap-2">
                        {team.members.map((m) => (
                          <li
                            key={m._id}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1 text-sm"
                          >
                            <span className="text-gray-800">
                              {m.name || m.email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {m.points ?? 0} pts
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() =>
                                  removeMember(
                                    team._id,
                                    m._id,
                                    m.name || m.email || "this member",
                                    team.name
                                  )
                                }
                                disabled={isBusy}
                                className="rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                                title="Remove from team"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() =>
                          setOpenTeam(expanded ? null : team._id)
                        }
                        className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                      >
                        {expanded ? "Hide" : "Submissions"}
                      </button>
                      {isAdmin && !isEditing && (
                        <>
                          <button
                            onClick={() => startRename(team)}
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                            title="Rename"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => deleteTeam(team._id, team.name)}
                            disabled={isBusy}
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                            title="Delete team"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      {subsLoading ? (
                        <p className="text-sm text-gray-500">Loading…</p>
                      ) : submissions.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          This team hasn&apos;t submitted anything yet.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {submissions.map((s) => (
                            <li
                              key={s._id}
                              className="rounded-lg border border-gray-200 p-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-dark-mode">
                                    {s.challengeTitle}
                                  </p>
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1.5 break-all text-sm text-blue-600 underline underline-offset-2"
                                  >
                                    <ExternalLink size={14} className="shrink-0" />
                                    {s.url}
                                  </a>
                                  <p className="mt-1 text-xs text-gray-500">
                                    submitted by {s.userEmail}
                                    {s.pointsAwarded > 0 &&
                                      ` · granted ${s.pointsAwarded} pt${
                                        s.pointsAwarded === 1 ? "" : "s"
                                      }`}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                    STATUS_STYLES[s.status]
                                  }`}
                                >
                                  {s.status}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TeamsModal;
