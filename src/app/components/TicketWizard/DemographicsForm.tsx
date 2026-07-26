"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { DemographicInfo } from "@/lib/interface";
import {
  TSHIRT_SIZE_OPTIONS,
  DEGREE_LEVEL_OPTIONS,
  HEAD_DELEGATE_OPTIONS,
  PREVIOUSLY_ATTENDED_OPTIONS,
  EXCITED_EVENT_OPTIONS,
} from "@/lib/ticketWizardOptions";

type FormState = Omit<DemographicInfo, "_id" | "user" | "createdAt" | "updatedAt">;

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  pronoun: "",
  tshirtSize: "",
  dietaryRestrictions: "",
  studentEmail: "",
  personalEmail: "",
  university: "",
  fieldOfStudy: "",
  degreeCurrentlyPursuing: "",
  highestDegree: "",
  expectedGraduation: "",
  schoolHasHeadDelegate: "unsure",
  currentAffiliation: "",
  resumeUrl: "",
  githubUrl: "",
  linkedinUrl: "",
  howDidYouHear: "",
  previouslyAttendedCUSEC: [],
  excitedEvents: [],
  wantsHotelBooking: false,
  whyAttendCUSEC: "",
  schoolCommunityInvolvement: "",
  cusecAssociation: "",
};

// The survey is long, so it's broken into sub-steps. Each renders a subset
// of the fieldsets below; required-field validation is handled natively by
// the browser, which only ever sees the fields currently in the DOM - so
// pressing Continue validates exactly the current sub-step.
const SECTIONS = ["about", "education", "professional", "conference", "optional"] as const;
type SectionId = (typeof SECTIONS)[number];

interface DemographicsFormProps {
  initialData: DemographicInfo | null;
}

export default function DemographicsForm({ initialData }: DemographicsFormProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const section: SectionId = SECTIONS[stepIndex];
  const isLastSection = stepIndex === SECTIONS.length - 1;
  const progressPct = useMemo(
    () => Math.round(((stepIndex + 1) / SECTIONS.length) * 100),
    [stepIndex]
  );

  const goToStep = (index: number) => {
    setError(null);
    setStepIndex(index);
    // Long sections leave the viewport mid-form; start each one at the top.
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleExcitedEvent = (event: string) => {
    setForm((prev) => {
      const has = prev.excitedEvents.includes(event);
      if (has) {
        return { ...prev, excitedEvents: prev.excitedEvents.filter((e) => e !== event) };
      }
      if (prev.excitedEvents.length >= 3) return prev;
      return { ...prev, excitedEvents: [...prev.excitedEvents, event] };
    });
  };

  const toggleAttended = (year: string) => {
    setForm((prev) => {
      const has = prev.previouslyAttendedCUSEC.includes(year);
      return {
        ...prev,
        previouslyAttendedCUSEC: has
          ? prev.previouslyAttendedCUSEC.filter((y) => y !== year)
          : [...prev.previouslyAttendedCUSEC, year],
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // "Pick exactly 3" can't be expressed with native validation, so it's
    // enforced here on the sub-step that owns those checkboxes.
    if (section === "conference" && form.excitedEvents.length !== 3) {
      setError(t("error-pick-three-events"));
      return;
    }

    // Not the last sub-step: this submit is just "Continue". Native
    // validation already passed for the visible fields at this point.
    if (!isLastSection) {
      goToStep(stepIndex + 1);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/demographics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("error-generic"));
        return;
      }
      router.push("/tickets/avatar");
    } catch {
      setError(t("error-generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="wizard-form" onSubmit={handleSubmit}>
      <div className="wizard-substep-progress">
        <div className="wizard-substep-labels">
          {SECTIONS.map((id, index) => {
            const state =
              index < stepIndex ? "done" : index === stepIndex ? "active" : "upcoming";
            return (
              <button
                key={id}
                type="button"
                // Only completed sections are clickable - jumping ahead would
                // skip the native validation gate on the sections between.
                disabled={index > stepIndex}
                onClick={() => goToStep(index)}
                className={`wizard-substep-label wizard-substep-label--${state}`}
              >
                {t(`substep-${id}`)}
              </button>
            );
          })}
        </div>
        <div
          className="wizard-substep-bar"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={SECTIONS.length}
        >
          <div className="wizard-substep-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="wizard-substep-count">
          {t("substep-progress", { current: stepIndex + 1, total: SECTIONS.length })}
        </p>
      </div>

      {section === "about" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-personal")}</legend>

        <label className="wizard-field">
          {t("field-first-name")}
          <input
            type="text"
            required
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-last-name")}
          <input
            type="text"
            required
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-pronoun")}
          <input
            type="text"
            required
            placeholder={t("field-pronoun-placeholder")}
            value={form.pronoun}
            onChange={(e) => set("pronoun", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-tshirt-size")}
          <select
            required
            value={form.tshirtSize}
            onChange={(e) => set("tshirtSize", e.target.value)}
          >
            <option value="" disabled>
              {t("select-placeholder")}
            </option>
            {TSHIRT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <label className="wizard-field wizard-field--wide">
          {t("field-dietary-restrictions")}
          <textarea
            value={form.dietaryRestrictions}
            onChange={(e) => set("dietaryRestrictions", e.target.value)}
          />
        </label>
      </fieldset>
      )}

      {section === "about" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-contact")}</legend>

        <label className="wizard-field">
          {t("field-student-email")}
          <input
            type="email"
            required
            value={form.studentEmail}
            onChange={(e) => set("studentEmail", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-personal-email")}
          <input
            type="email"
            required
            value={form.personalEmail}
            onChange={(e) => set("personalEmail", e.target.value)}
          />
        </label>
      </fieldset>
      )}

      {section === "education" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-education")}</legend>

        <label className="wizard-field">
          {t("field-university")}
          <input
            type="text"
            required
            value={form.university}
            onChange={(e) => set("university", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-field-of-study")}
          <input
            type="text"
            required
            value={form.fieldOfStudy}
            onChange={(e) => set("fieldOfStudy", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-degree-pursuing")}
          <select
            required
            value={form.degreeCurrentlyPursuing}
            onChange={(e) => set("degreeCurrentlyPursuing", e.target.value)}
          >
            <option value="" disabled>
              {t("select-placeholder")}
            </option>
            {DEGREE_LEVEL_OPTIONS.map((degree) => (
              <option key={degree} value={degree}>
                {degree}
              </option>
            ))}
          </select>
        </label>

        <label className="wizard-field">
          {t("field-highest-degree")}
          <select
            required
            value={form.highestDegree}
            onChange={(e) => set("highestDegree", e.target.value)}
          >
            <option value="" disabled>
              {t("select-placeholder")}
            </option>
            {DEGREE_LEVEL_OPTIONS.map((degree) => (
              <option key={degree} value={degree}>
                {degree}
              </option>
            ))}
          </select>
        </label>

        <label className="wizard-field">
          {t("field-expected-graduation")}
          <input
            type="month"
            required
            value={form.expectedGraduation}
            onChange={(e) => set("expectedGraduation", e.target.value)}
          />
        </label>
      </fieldset>
      )}

      {section === "education" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-school-community")}</legend>

        <label className="wizard-field">
          {t("field-head-delegate")}
          <select
            required
            value={form.schoolHasHeadDelegate}
            onChange={(e) =>
              set("schoolHasHeadDelegate", e.target.value as FormState["schoolHasHeadDelegate"])
            }
          >
            {HEAD_DELEGATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      )}

      {section === "professional" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-professional")}</legend>

        <label className="wizard-field wizard-field--wide">
          {t("field-current-affiliation")}
          <input
            type="text"
            required
            placeholder={t("field-current-affiliation-placeholder")}
            value={form.currentAffiliation}
            onChange={(e) => set("currentAffiliation", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-resume-url")}
          <input
            type="url"
            value={form.resumeUrl}
            onChange={(e) => set("resumeUrl", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-github-url")}
          <input
            type="url"
            value={form.githubUrl}
            onChange={(e) => set("githubUrl", e.target.value)}
          />
        </label>

        <label className="wizard-field">
          {t("field-linkedin-url")}
          <input
            type="url"
            value={form.linkedinUrl}
            onChange={(e) => set("linkedinUrl", e.target.value)}
          />
        </label>
      </fieldset>
      )}

      {section === "conference" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-conference")}</legend>

        <label className="wizard-field wizard-field--wide">
          {t("field-how-did-you-hear")}
          <input
            type="text"
            value={form.howDidYouHear}
            onChange={(e) => set("howDidYouHear", e.target.value)}
          />
        </label>

        <div className="wizard-field wizard-field--wide">
          <span>{t("field-previously-attended")}</span>
          <div className="wizard-checkbox-group">
            {PREVIOUSLY_ATTENDED_OPTIONS.map((year) => (
              <label className="wizard-checkbox" key={year}>
                <input
                  type="checkbox"
                  checked={form.previouslyAttendedCUSEC.includes(year)}
                  onChange={() => toggleAttended(year)}
                />
                {year === "none" ? t("no-first-time") : year}
              </label>
            ))}
          </div>
        </div>

        <div className="wizard-field wizard-field--wide">
          <span>{t("field-excited-events")}</span>
          <div className="wizard-checkbox-group">
            {EXCITED_EVENT_OPTIONS.map((event) => (
              <label className="wizard-checkbox" key={event}>
                <input
                  type="checkbox"
                  checked={form.excitedEvents.includes(event)}
                  disabled={!form.excitedEvents.includes(event) && form.excitedEvents.length >= 3}
                  onChange={() => toggleExcitedEvent(event)}
                />
                {event}
              </label>
            ))}
          </div>
          <p className="wizard-field-hint">
            {t("field-excited-events-hint", { count: form.excitedEvents.length })}
          </p>
        </div>
      </fieldset>
      )}

      {section === "conference" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-accommodation")}</legend>

        <div className="wizard-field">
          <span>{t("field-hotel-booking")}</span>
          <label className="wizard-checkbox">
            <input
              type="checkbox"
              checked={form.wantsHotelBooking}
              onChange={(e) => set("wantsHotelBooking", e.target.checked)}
            />
            {t("yes")}
          </label>
        </div>
      </fieldset>
      )}

      {section === "optional" && (
      <fieldset className="wizard-fieldset">
        <legend>{t("section-optional")}</legend>

        <label className="wizard-field wizard-field--wide">
          {t("field-why-attend")}
          <textarea
            value={form.whyAttendCUSEC}
            onChange={(e) => set("whyAttendCUSEC", e.target.value)}
          />
        </label>

        <label className="wizard-field wizard-field--wide">
          {t("field-school-involvement")}
          <textarea
            value={form.schoolCommunityInvolvement}
            onChange={(e) => set("schoolCommunityInvolvement", e.target.value)}
          />
        </label>

        <label className="wizard-field wizard-field--wide">
          {t("field-cusec-association")}
          <textarea
            value={form.cusecAssociation}
            onChange={(e) => set("cusecAssociation", e.target.value)}
          />
        </label>
      </fieldset>
      )}

      {error && <p className="wizard-form-error">{error}</p>}

      <div className="wizard-form-actions">
        {stepIndex > 0 && (
          <button
            type="button"
            className="cta-btn wizard-form-back"
            onClick={() => goToStep(stepIndex - 1)}
          >
            {t("back-button")}
          </button>
        )}
        <button type="submit" className="cta-btn wizard-form-submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("submitting")
            : isLastSection
              ? t("save-continue-button")
              : t("continue-button")}
        </button>
      </div>
    </form>
  );
}
