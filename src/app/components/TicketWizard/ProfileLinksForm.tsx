"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, FileText, Link2 } from "lucide-react";
import type { ProfileAnswers } from "@/lib/interface";
import { isValidLink, type LinkField } from "@/lib/ticketWizardOptions";
import { Question, WizardCard } from "./WizardFields";
import { focusField, saveSection } from "./profileAnswers";

const LINKS: { field: LinkField; placeholder: string }[] = [
  { field: "linkedinUrl", placeholder: "https://linkedin.com/in/your-name" },
  { field: "githubUrl", placeholder: "https://github.com/your-name" },
  { field: "portfolioUrl", placeholder: "https://your-site.com" },
];

/** Mirrors RESUME_MAX_BYTES on the server, which is the check that counts. */
const RESUME_MAX_BYTES = 2 * 1024 * 1024;

export interface ResumeMeta {
  fileName: string;
  size: number;
  uploadedAt: string | null;
}

/**
 * Optional profile completion, offered once the ticket is bought: professional
 * links, a résumé, and whether they may be shared with sponsors. Nothing here
 * gates anything, so it lives on the confirmation screen rather than in the
 * flow. The résumé uploads the moment a file is picked; the links and consent
 * save with the button.
 */
export default function ProfileLinksForm({
  initial,
  initialResume,
}: {
  initial: ProfileAnswers;
  initialResume: ResumeMeta | null;
}) {
  const t = useTranslations("TicketWizard");
  const locale = useLocale();
  const [links, setLinks] = useState({
    linkedinUrl: initial.linkedinUrl,
    githubUrl: initial.githubUrl,
    portfolioUrl: initial.portfolioUrl,
  });
  const [consent, setConsent] = useState(initial.sponsorConsent);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resume, setResume] = useState<ResumeMeta | null>(initialResume);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const bad = LINKS.find(({ field }) => !isValidLink(field, links[field]));
    if (bad) {
      setError(t(`error-${bad.field}`));
      focusField(bad.field);
      return;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await saveSection("links", { ...links, sponsorConsent: consent });
    setBusy(false);

    if (!result.ok) {
      setError(result.field ? t(`error-${result.field}`) : t("error-generic"));
      focusField(result.field);
      return;
    }
    setSaved(true);
  };

  const uploadResume = async (file: File) => {
    setResumeError(null);
    if (file.type && file.type !== "application/pdf") {
      setResumeError(t("resume-error-type"));
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setResumeError(t("resume-error-size"));
      return;
    }

    setResumeBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/demographics/resume", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.resume) {
        setResume(data.resume);
      } else {
        setResumeError(
          data?.error === "too-large"
            ? t("resume-error-size")
            : data?.error === "not-pdf"
              ? t("resume-error-type")
              : t("resume-error-generic")
        );
      }
    } catch {
      setResumeError(t("resume-error-generic"));
    } finally {
      setResumeBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeResume = async () => {
    setResumeError(null);
    setResumeBusy(true);
    try {
      const res = await fetch("/api/demographics/resume", { method: "DELETE" });
      if (res.ok) setResume(null);
      else setResumeError(t("resume-error-generic"));
    } catch {
      setResumeError(t("resume-error-generic"));
    } finally {
      setResumeBusy(false);
    }
  };

  const kb = (bytes: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes / 1024);

  return (
    <form className="wizard-form wizard-form--compact" onSubmit={submit}>
      <WizardCard title={t("card-links")} subtitle={t("card-links-note")} icon={<Link2 />}>
        <div className="wizard-grid">
          {LINKS.map(({ field, placeholder }) => (
            <Question key={field} label={t(`q-${field}`)} htmlFor={field}>
              <input
                id={field}
                className="wizard-input"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder={placeholder}
                value={links[field]}
                onChange={(e) => {
                  setSaved(false);
                  setLinks((prev) => ({ ...prev, [field]: e.target.value }));
                }}
              />
            </Question>
          ))}

          <Question label={t("q-resume")} htmlFor="resume" hint={t("resume-hint")}>
            {resume ? (
              <div className="wizard-file">
                <FileText aria-hidden="true" />
                <span className="wizard-file__name">
                  {resume.fileName}
                  <small>{t("resume-size", { size: kb(resume.size) })}</small>
                </span>
                <button
                  type="button"
                  className="wizard-file__action"
                  disabled={resumeBusy}
                  onClick={() => fileInput.current?.click()}
                >
                  {t("resume-replace")}
                </button>
                <button
                  type="button"
                  className="wizard-file__action"
                  disabled={resumeBusy}
                  onClick={removeResume}
                >
                  {t("resume-remove")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="wizard-input wizard-file__pick"
                disabled={resumeBusy}
                onClick={() => fileInput.current?.click()}
              >
                <FileText aria-hidden="true" />
                {resumeBusy ? t("resume-uploading") : t("resume-choose")}
              </button>
            )}
            <input
              ref={fileInput}
              id="resume"
              className="wizard-file__input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadResume(file);
              }}
            />
            {resumeBusy && resume && <p className="wizard-q__hint">{t("resume-uploading")}</p>}
            {resumeError && (
              <p className="wizard-form-error" role="alert">
                {resumeError}
              </p>
            )}
          </Question>
        </div>

        <label className={`wizard-chip wizard-consent${consent ? " is-on" : ""}`}>
          <input
            className="wizard-chip__input"
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setSaved(false);
              setConsent(e.target.checked);
            }}
          />
          <span className="wizard-chip__mark" aria-hidden="true">
            {consent && <Check strokeWidth={3} />}
          </span>
          <span className="wizard-chip__text">{t("q-sponsor-consent")}</span>
        </label>

        {error && (
          <p className="wizard-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="wizard-form-actions">
          <button type="submit" className="cta-btn wizard-form-submit" disabled={busy}>
            {busy ? t("submitting") : t("save-profile")}
          </button>
          {saved && (
            <p className="wizard-saved" role="status">
              <Check aria-hidden="true" />
              {t("profile-saved")}
            </p>
          )}
        </div>
      </WizardCard>
    </form>
  );
}
