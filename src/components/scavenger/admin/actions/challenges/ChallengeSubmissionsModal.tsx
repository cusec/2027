"use client";

import { ExternalLink, AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Challenge } from "@/lib/interface";
import { useChallengeSubmissions } from "./challengesDAO";

interface ChallengeSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const ChallengeSubmissionsModal = ({
  isOpen,
  onClose,
  challenge,
}: ChallengeSubmissionsModalProps) => {
  const { submissions, loading, error, setError, warning, setWarning, setStatus } =
    useChallengeSubmissions(challenge?._id ?? null, isOpen);

  return (
    <Modal
      simple={true}
      isOpen={isOpen}
      onClose={onClose}
      title={challenge ? `Submissions: ${challenge.title}` : "Submissions"}
      className="max-w-3xl max-h-[70vh] text-dark-mode"
    >
      <div className="space-y-4">
        {/*
          Reverting an approval never deducts points automatically (see the
          PUT handler) — the admin is told the amount and does it by hand.
        */}
        {warning && (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">
                  Manual points adjustment required
                </p>
                <p className="mt-1 text-sm text-amber-900">{warning}</p>
              </div>
            </div>
            <button
              onClick={() => setWarning(null)}
              className="mt-2 text-sm text-amber-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {challenge && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Approving</strong> grants {challenge.points} point
            {challenge.points === 1 ? "" : "s"} to the delegate immediately.{" "}
            <strong>Rejecting or resetting an approved submission does not
            remove those points</strong> &mdash; you will be told how many to
            deduct in Manage Users.
          </p>
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

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading submissions...
          </p>
        ) : submissions.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            No submissions for this challenge yet.
          </p>
        ) : (
          <div className="space-y-3 overflow-y-auto">
            {submissions.map((submission) => (
              <div
                key={submission._id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-dark-mode break-all">
                      {submission.userEmail}
                    </p>
                    <a
                      href={submission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-600 underline underline-offset-2 break-all"
                    >
                      <ExternalLink size={14} className="shrink-0" />
                      {submission.url}
                    </a>
                    {submission.notes && (
                      <p className="mt-1 text-sm text-gray-600">
                        {submission.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[submission.status]
                      }`}
                    >
                      {submission.status}
                    </span>
                    {submission.pointsAwarded > 0 && (
                      <span className="text-xs text-gray-500">
                        granted {submission.pointsAwarded} pt
                        {submission.pointsAwarded === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setStatus(submission._id, "approved")}
                    disabled={submission.status === "approved"}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatus(submission._id, "rejected")}
                    disabled={submission.status === "rejected"}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setStatus(submission._id, "pending")}
                    disabled={submission.status === "pending"}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-dark-mode hover:bg-gray-100 disabled:opacity-40"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ChallengeSubmissionsModal;
