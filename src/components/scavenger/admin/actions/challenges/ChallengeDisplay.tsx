"use client";

import { Pencil, Trash2, Inbox } from "lucide-react";
import { Challenge } from "@/lib/interface";

interface ChallengeDisplayProps {
  challenge: Challenge;
  onEdit: (challenge: Challenge) => void;
  onDelete: (id: string) => void;
  onShowSubmissions: (challenge: Challenge) => void;
}

function formatWindow(challenge: Challenge): string {
  if (!challenge.activationStart || !challenge.activationEnd) {
    return "Always open while active";
  }
  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  return `${fmt(challenge.activationStart)} - ${fmt(challenge.activationEnd)}`;
}

const ChallengeDisplay = ({
  challenge,
  onEdit,
  onDelete,
  onShowSubmissions,
}: ChallengeDisplayProps) => {
  const cap =
    challenge.maxSubmissions === null || challenge.maxSubmissions === undefined
      ? "unlimited"
      : challenge.maxSubmissions;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-dark-mode">{challenge.title}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              challenge.active
                ? "bg-green-100 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {challenge.active ? "Active" : "Inactive"}
          </span>
          {challenge.eventName && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {challenge.eventName}
            </span>
          )}
          {challenge.mode === "group" && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
              Group
            </span>
          )}
        </div>

        {challenge.description && (
          <p className="mt-1 text-sm text-gray-600">{challenge.description}</p>
        )}

        <p className="mt-1 text-xs text-gray-500">
          {formatWindow(challenge)} &middot; {challenge.submissionCount}/{cap}{" "}
          submissions &middot; {challenge.points} pt
          {challenge.points === 1 ? "" : "s"} on approval
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => onShowSubmissions(challenge)}
          title="View submissions"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
        >
          <Inbox size={18} />
        </button>
        <button
          onClick={() => onEdit(challenge)}
          title="Edit"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => onDelete(challenge._id)}
          title="Delete"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-red-600"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChallengeDisplay;
