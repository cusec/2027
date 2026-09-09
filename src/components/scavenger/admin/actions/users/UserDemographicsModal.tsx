"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import Modal from "@/components/ui/modal";

interface Demographics {
  attendeeType: string;
  pronoun: string;
  tshirtSize: string;
  dietaryRestrictions: string;
  fieldOfStudy: string;
  schoolHasHeadDelegate: string;
  company: string;
  jobTitle: string;
  resumeUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  travelFrom: string;
  travelMethod: string;
  howDidYouHear: string;
  previouslyAttended: string;
  previouslyAttendedYear: string;
  excitedEvents: string[];
  whyAttendCUSEC: string;
  schoolCommunityInvolvement: string;
  cusecAssociation: string;
  submittedAt: string | null;
  updatedAt: string | null;
}

interface UserDemographicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  userEmail: string;
}

const ATTENDEE_LABELS: Record<string, string> = {
  student: "Student",
  professional: "Professional",
};

const TRAVEL_LABELS: Record<string, string> = {
  plane: "Flying",
  train: "Train",
  bus: "Bus",
  car: "Driving",
  local: "Already in Montréal",
  undecided: "Not sure yet",
};

const HEAD_DELEGATE_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  unsure: "Not sure",
};

/** Read-only: the survey is the delegate's to change, not an admin's. */
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-gray-100 py-2 last:border-b-0">
    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </span>
    <span className="text-sm text-dark-mode">
      {value.trim() ? (
        value
      ) : (
        <span className="text-gray-400">Not answered</span>
      )}
    </span>
  </div>
);

const LinkRow = ({ label, url }: { label: string; url: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-gray-100 py-2 last:border-b-0">
    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </span>
    {url.trim() ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 break-all text-sm text-blue-700 hover:underline"
      >
        {url}
        <ExternalLink size={12} className="shrink-0" />
      </a>
    ) : (
      <span className="text-sm text-gray-400">Not answered</span>
    )}
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <h4 className="mb-1 font-semibold text-dark-mode">{title}</h4>
    {children}
  </div>
);

const UserDemographicsModal = ({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
}: UserDemographicsModalProps) => {
  const [data, setData] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;

    const fetchDemographics = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        const response = await fetch(`/api/admin/users/${userId}/demographics`);
        const body = await response.json();

        if (cancelled) return;

        if (body.success) {
          setData(body.demographics);
          setNotFound(body.demographics === null);
        } else {
          setError(body.error || "Failed to fetch demographics");
        }
      } catch {
        // Deliberately nothing logged here: a failed response can carry the
        // survey answers themselves, and those must not reach the console.
        if (!cancelled) setError("Failed to fetch demographics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDemographics();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  const handleClose = () => {
    // Cleared on close so the answers don't sit behind a closed modal, and so
    // reopening on another user can't flash the previous one's record.
    setData(null);
    setError(null);
    setNotFound(false);
    onClose();
  };

  const isStudent = data?.attendeeType === "student";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      simple={true}
      title={`Demographics: ${userName || userEmail}`}
      className="max-w-3xl max-h-[75vh] text-dark-mode"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>Confidential.</strong> The survey promises these answers
            stay private. They are read-only here, opening this view is recorded
            in the audit log, and the answers must not be exported or shared
            outside the organizing team.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading…</p>
        ) : notFound ? (
          <p className="py-8 text-center text-gray-500">
            This user has not filled in the survey yet.
          </p>
        ) : data ? (
          <div className="space-y-4 overflow-y-auto">
            <Section title="About them">
              <Row
                label="Attending as"
                value={ATTENDEE_LABELS[data.attendeeType] || data.attendeeType}
              />
              <Row label="Pronouns" value={data.pronoun} />
              <Row label="T-shirt size" value={data.tshirtSize} />
              <Row
                label="Dietary restrictions"
                value={data.dietaryRestrictions}
              />
            </Section>

            {isStudent ? (
              <Section title="Education">
                <Row label="Field of study" value={data.fieldOfStudy} />
                <Row
                  label="School has a head delegate"
                  value={
                    HEAD_DELEGATE_LABELS[data.schoolHasHeadDelegate] ||
                    data.schoolHasHeadDelegate
                  }
                />
              </Section>
            ) : (
              <Section title="Work">
                <Row label="Company" value={data.company} />
                <Row label="Job title" value={data.jobTitle} />
              </Section>
            )}

            <Section title="Getting to CUSEC">
              <Row label="Travelling from" value={data.travelFrom} />
              <Row
                label="How"
                value={TRAVEL_LABELS[data.travelMethod] || data.travelMethod}
              />
            </Section>

            <Section title="Conference">
              <Row label="How they heard about us" value={data.howDidYouHear} />
              <Row
                label="Attended before"
                value={
                  data.previouslyAttended === "yes"
                    ? `Yes${
                        data.previouslyAttendedYear
                          ? ` (${data.previouslyAttendedYear})`
                          : ""
                      }`
                    : "No"
                }
              />
              <Row
                label="Most excited for"
                value={data.excitedEvents.join(", ")}
              />
              <Row label="Why CUSEC" value={data.whyAttendCUSEC} />
              <Row
                label="Community involvement"
                value={data.schoolCommunityInvolvement}
              />
              <Row label="Association with CUSEC" value={data.cusecAssociation} />
            </Section>

            <Section title="Links">
              <LinkRow label="Resume" url={data.resumeUrl} />
              <LinkRow label="GitHub" url={data.githubUrl} />
              <LinkRow label="LinkedIn" url={data.linkedinUrl} />
            </Section>

            {data.submittedAt && (
              <p className="text-xs text-gray-500">
                Submitted {new Date(data.submittedAt).toLocaleString()}
                {data.updatedAt && data.updatedAt !== data.submittedAt
                  ? ` · updated ${new Date(data.updatedAt).toLocaleString()}`
                  : ""}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default UserDemographicsModal;
