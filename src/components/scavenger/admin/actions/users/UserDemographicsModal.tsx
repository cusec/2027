"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { DemographicInfo } from "@/lib/interface";
import { findInstitution } from "@/lib/institutions";
import {
  ATTEND_REASON_OPTIONS,
  ATTENDED_OPTIONS,
  ATTENDEE_TYPE_OPTIONS,
  COMMUNITY_OPTIONS,
  CONNECT_SCHOOL_OPTIONS,
  CONVINCED_BY_OPTIONS,
  CREDENTIAL_OPTIONS,
  CURRENT_ROLE_OPTIONS,
  EXPERIENCE_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
  GRADUATION_OPTIONS,
  HEARD_FROM_OPTIONS,
  INDEPENDENT_DELEGATION,
  INTERNSHIP_COUNT_OPTIONS,
  OPPORTUNITY_OPTIONS,
  OTHER,
  PRONOUN_OPTIONS,
  SESSION_FORMAT_OPTIONS,
  STUDY_LEVEL_OPTIONS,
  SUCCESS_OPTIONS,
  TECH_AREA_OPTIONS,
  TRANSPORT_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  WORK_LOCATION_OPTIONS,
  YES_NO_UNSURE_OPTIONS,
  type Option,
} from "@/lib/ticketWizardOptions";

type Profile = Partial<DemographicInfo> & {
  travelCountryName?: string;
  travelRegionName?: string;
};

interface UserDemographicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  userEmail: string;
}

// Labels in English: the admin panel is English-only.
const one = (options: Option[], value?: string, other?: string) => {
  if (!value) return "";
  if (value === OTHER) return other ? `Other: ${other}` : "Other";
  return options.find((o) => o.value === value)?.en ?? value;
};

const many = (options: Option[], values?: string[], other?: string) =>
  (values ?? []).map((v) => one(options, v, other)).join(", ");

const school = (value?: string, other?: string) => {
  if (!value) return "";
  if (value === OTHER) return other ? `Other: ${other}` : "Other";
  if (value === INDEPENDENT_DELEGATION) return "Registering independently";
  return findInstitution(value)?.name ?? value;
};

const when = (value?: string | null) => (value ? new Date(value).toLocaleString() : "");

/** Read-only: the profile is the delegate's to change, not an admin's. */
const Row = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-gray-100 py-2 last:border-b-0">
    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </span>
    <span className="text-sm text-dark-mode">
      {value?.trim() ? value : <span className="text-gray-400">Not answered</span>}
    </span>
  </div>
);

const LinkRow = ({ label, url }: { label: string; url?: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-gray-100 py-2 last:border-b-0">
    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </span>
    {url?.trim() ? (
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
  saved,
  children,
}: {
  title: string;
  saved?: string | null;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <h4 className="font-semibold text-dark-mode">{title}</h4>
      <span className="text-xs text-gray-500">
        {saved ? `Saved ${when(saved)}` : "Not saved yet"}
      </span>
    </div>
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
  const [data, setData] = useState<Profile | null>(null);
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
        // profile answers themselves, and those must not reach the console.
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

  const s = data?.sections;
  const origin = data
    ? [data.travelCity, data.travelRegionName, data.travelCountryName].filter(Boolean).join(", ")
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      simple={true}
      title={`Profile: ${userName || userEmail}`}
      className="max-w-3xl max-h-[75vh] text-dark-mode"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>Confidential.</strong> The profile promises these answers
            stay private. They are read-only here, opening this view is recorded
            in the audit log, and the answers must not be exported or shared
            outside the organizing team. Sponsors may only see a profile whose
            owner gave consent below.
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
            This user has not started their profile yet.
          </p>
        ) : data ? (
          <div className="space-y-4 overflow-y-auto">
            <Section title="Basics" saved={s?.basics}>
              <Row label="Name" value={`${data.firstName ?? ""} ${data.lastName ?? ""}`} />
              <Row label="Primary email" value={data.primaryEmail} />
              <Row label="Student or work email" value={data.secondaryEmail} />
              <Row label="Pronouns" value={one(PRONOUN_OPTIONS, data.pronoun, data.pronounOther)} />
              <Row
                label="Attending as"
                value={one(ATTENDEE_TYPE_OPTIONS, data.attendeeType, data.attendeeTypeOther)}
              />
            </Section>

            <Section title="Background" saved={s?.background}>
              <Row label="School" value={school(data.school, data.schoolOther)} />
              <Row label="Campus" value={data.campus} />
              <Row
                label="Field of study"
                value={one(FIELD_OF_STUDY_OPTIONS, data.fieldOfStudy, data.fieldOfStudyOther)}
              />
              <Row
                label="Credential"
                value={one(CREDENTIAL_OPTIONS, data.credential, data.credentialOther)}
              />
              <Row
                label="Level of study"
                value={one(STUDY_LEVEL_OPTIONS, data.studyLevel, data.studyLevelOther)}
              />
              <Row label="Expected graduation" value={one(GRADUATION_OPTIONS, data.expectedGraduation)} />
              <Row label="Internships or co-ops" value={one(INTERNSHIP_COUNT_OPTIONS, data.internships)} />
              <Row
                label="Current role"
                value={one(CURRENT_ROLE_OPTIONS, data.currentRole, data.currentRoleOther)}
              />
              <Row label="Career experience" value={one(EXPERIENCE_OPTIONS, data.experience)} />
              <Row label="Travelling from" value={origin} />
            </Section>

            <Section title="Goals and career" saved={s?.goals}>
              <Row
                label="Why attending"
                value={many(ATTEND_REASON_OPTIONS, data.attendReasons, data.attendReasonsOther)}
              />
              <Row
                label="What success looks like"
                value={many(SUCCESS_OPTIONS, data.successMeasures, data.successMeasuresOther)}
              />
              <Row
                label="Opportunities"
                value={many(OPPORTUNITY_OPTIONS, data.opportunities, data.opportunitiesOther)}
              />
              <Row
                label="Technical areas"
                value={many(TECH_AREA_OPTIONS, data.techAreas, data.techAreasOther)}
              />
              <Row label="Open to working in" value={many(WORK_LOCATION_OPTIONS, data.workLocations)} />
              <Row label="Work arrangement" value={one(WORK_ARRANGEMENT_OPTIONS, data.workArrangement)} />
            </Section>

            <Section title="Getting there and community" saved={s?.experience}>
              <Row label="Transport" value={one(TRANSPORT_OPTIONS, data.transport, data.transportOther)} />
              <Row label="With a delegation" value={one(YES_NO_UNSURE_OPTIONS, data.delegation)} />
              <Row label="Delegation" value={school(data.delegationSchool, data.delegationOther)} />
              <Row
                label="Connect with their school"
                value={one(CONNECT_SCHOOL_OPTIONS, data.connectWithSchool)}
              />
              <Row
                label="Travel funding affects attendance"
                value={one(YES_NO_UNSURE_OPTIONS, data.travelFunding)}
              />
              <Row label="Needs accommodation" value={one(YES_NO_UNSURE_OPTIONS, data.accommodation)} />
              <Row
                label="First heard from"
                value={one(HEARD_FROM_OPTIONS, data.heardFrom, data.heardFromOther)}
              />
              <Row
                label="Convinced by"
                value={one(CONVINCED_BY_OPTIONS, data.convincedBy, data.convincedByOther)}
              />
              <Row label="Attended before" value={many(ATTENDED_OPTIONS, data.attended)} />
              <Row
                label="Session formats"
                value={many(SESSION_FORMAT_OPTIONS, data.sessionFormats, data.sessionFormatsOther)}
              />
              <Row
                label="Community involvement"
                value={many(
                  COMMUNITY_OPTIONS,
                  data.communityInvolvement,
                  data.communityInvolvementOther
                )}
              />
              <Row label="Community or project" value={data.communityProject} />
            </Section>

            <Section title="Links and consent" saved={s?.links}>
              <LinkRow label="LinkedIn" url={data.linkedinUrl} />
              <LinkRow label="GitHub" url={data.githubUrl} />
              <LinkRow label="Portfolio" url={data.portfolioUrl} />
              {/* The route checks admin again, logs the download and redirects
                  to a link that expires after a minute. */}
              <LinkRow
                label={
                  data.resumeFileName
                    ? `Résumé (${data.resumeFileName})`
                    : "Résumé"
                }
                url={data.resumeFileName && userId ? `/api/admin/users/${userId}/resume` : ""}
              />
              <Row
                label="Consents to sharing with sponsors"
                value={
                  data.sponsorConsent
                    ? `Yes${data.sponsorConsentAt ? ` (${when(data.sponsorConsentAt)})` : ""}`
                    : "No"
                }
              />
            </Section>

            {data.createdAt && (
              <p className="text-xs text-gray-500">
                Started {when(data.createdAt)}
                {data.updatedAt && data.updatedAt !== data.createdAt
                  ? ` · updated ${when(data.updatedAt)}`
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
