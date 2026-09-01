"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import Modal from "@/components/ui/modal";

interface UserSubmission {
  _id: string;
  challengeId: string;
  url: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  pointsAwarded: number;
  createdAt: string;
  challengeTitle: string;
  challengeEvent: string;
  challengePoints: number;
}

interface UserSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  userId: string | null;
  userName: string;
  userEmail: string;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const UserSubmissionsModal = ({
  isOpen,
  onClose,
  isAdmin,
  userId,
  userName,
  userEmail,
}: UserSubmissionsModalProps) => {
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Set when a deleted submission had already granted points.
  const [warning, setWarning] = useState<string | null>(null);

  const fetchUserSubmissions = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${userId}/submissions`);
      const data = await response.json();

      if (data.success) {
        setSubmissions(data.submissions || []);
      } else {
        setError(data.error || "Failed to fetch user submissions");
      }
    } catch (err) {
      setError("Failed to fetch user submissions");
      console.error("Error fetching user submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const removeSubmission = async (
    submissionId: string,
    challengeTitle: string,
    pointsAwarded: number
  ) => {
    if (!userId) return;

    const pointsNote =
      pointsAwarded > 0
        ? `\n\n⚠️ This submission granted ${pointsAwarded} point${
            pointsAwarded === 1 ? "" : "s"
          }. Deleting it will NOT remove them — you must deduct them manually.`
        : `\n\n⚠️ Note: This will NOT change the user's points. To adjust points, manually edit them in the user settings.`;

    const confirmed = window.confirm(
      `Remove the submission for "${challengeTitle}" from ${
        userName || userEmail
      }?${pointsNote}`
    );
    if (!confirmed) return;

    try {
      setRemovingId(submissionId);

      const response = await fetch(`/api/admin/users/${userId}/submissions`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submissionId }),
      });

      const data = await response.json();

      if (data.success) {
        setWarning(data.warning ?? null);
        await fetchUserSubmissions();
      } else {
        setError(data.error || "Failed to remove submission");
      }
    } catch (err) {
      setError("Failed to remove submission");
      console.error("Error removing submission:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleClose = () => {
    setSubmissions([]);
    setError(null);
    setWarning(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      simple={true}
      title={`Submissions: ${userName || userEmail}`}
      className="max-w-3xl text-dark-mode"
    >
      <div className="space-y-6">
        {/* Warning about points */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Important:</strong> Removing a submission here will{" "}
              <strong>NOT</strong> change the user&apos;s points. If it had been
              approved, deduct the points it granted by editing them in the user
              settings.
            </div>
          </div>
        </div>

        {warning && (
          <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>Manual points adjustment required</strong>
                <p className="mt-1">{warning}</p>
              </div>
            </div>
            <button
              onClick={() => setWarning(null)}
              className="mt-1 text-xs text-amber-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-1 text-xs text-red-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Challenge Submissions ({submissions.length})
              </h3>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Send className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-600">No submissions yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  This user has not submitted a link to any challenge.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {submission.challengeTitle}
                        </h4>
                        {submission.challengeEvent && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {submission.challengeEvent}
                          </span>
                        )}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            STATUS_STYLES[submission.status]
                          }`}
                        >
                          {submission.status}
                        </span>
                      </div>

                      <a
                        href={submission.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-600 underline underline-offset-2 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        {submission.url}
                      </a>

                      {submission.notes && (
                        <p className="mt-1 text-sm text-gray-600">
                          {submission.notes}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        Submitted:{" "}
                        {new Date(submission.createdAt).toLocaleDateString()}
                        {submission.pointsAwarded > 0 &&
                          ` · granted ${submission.pointsAwarded} pt${
                            submission.pointsAwarded === 1 ? "" : "s"
                          }`}
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() =>
                          removeSubmission(
                            submission._id,
                            submission.challengeTitle,
                            submission.pointsAwarded
                          )
                        }
                        disabled={removingId === submission._id}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        title="Remove this submission"
                      >
                        {removingId === submission._id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default UserSubmissionsModal;
