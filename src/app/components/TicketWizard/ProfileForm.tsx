"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { ProfileAnswers } from "@/lib/interface";
import { INSTITUTIONS, findInstitution } from "@/lib/institutions";
import {
  ATTENDEE_TYPE_OPTIONS,
  CREDENTIAL_OPTIONS,
  CURRENT_ROLE_OPTIONS,
  EXPERIENCE_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
  GRADUATION_OPTIONS,
  INTERNSHIP_COUNT_OPTIONS,
  OTHER,
  PRONOUN_OPTIONS,
  SCHOOL_TYPES,
  STUDIES_TYPES,
  STUDY_LEVEL_OPTIONS,
  WORK_TYPES,
  type SectionId,
} from "@/lib/ticketWizardOptions";
import {
  ChoiceChips,
  Combobox,
  OriginFields,
  OtherInput,
  Question,
  SelectField,
  WizardCard,
} from "./WizardFields";
import { StepActions, StepHeader } from "./WizardSection";
import { focusField, saveSection } from "./profileAnswers";

const STEPS: SectionId[] = ["basics", "background"];

interface ProfileFormProps {
  initial: ProfileAnswers;
  /** Opens on the first section that hasn't been saved yet. */
  startIndex: number;
}

/**
 * The Profile step: Basics, then Education or Professional background with
 * where the delegate travels from. Both sections are required before the
 * ticket step, and each saves on its own Continue, so leaving after the first
 * keeps it.
 */
export default function ProfileForm({ initial, startIndex }: ProfileFormProps) {
  const t = useTranslations("TicketWizard");
  const locale = useLocale();
  const router = useRouter();
  const [answers, setAnswers] = useState<ProfileAnswers>(initial);
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileAnswers>(key: K, value: ProfileAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const type = answers.attendeeType;
  const asksSchool = SCHOOL_TYPES.includes(type);
  const asksStudies = STUDIES_TYPES.includes(type);
  const asksWork = WORK_TYPES.includes(type);
  const institution = findInstitution(answers.school);
  const section = STEPS[index];

  const go = (next: number) => {
    setError(null);
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await saveSection(section, answers);
    setBusy(false);

    if (!result.ok) {
      setError(result.field ? t("error-field") : t("error-generic"));
      focusField(result.field);
      return;
    }
    if (index < STEPS.length - 1) {
      go(index + 1);
    } else {
      router.push("/tickets/interests");
    }
  };

  const schoolOptions = INSTITUTIONS.map((i) => ({ value: i.value, label: i.name }));

  return (
    <form className="wizard-form" onSubmit={submit}>
      <StepHeader
        title={t("profile-heading")}
        note={t("profile-note")}
        current={index + 1}
        total={STEPS.length}
      />

      {section === "basics" && (
        <WizardCard title={t("card-basics")}>
          <div className="wizard-grid">
            <Question label={t("q-first-name")} htmlFor="firstName">
              <input
                id="firstName"
                className="wizard-input"
                type="text"
                autoComplete="given-name"
                required
                maxLength={200}
                value={answers.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </Question>
            <Question label={t("q-last-name")} htmlFor="lastName">
              <input
                id="lastName"
                className="wizard-input"
                type="text"
                autoComplete="family-name"
                required
                maxLength={200}
                value={answers.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </Question>
            <Question label={t("q-primary-email")} htmlFor="primaryEmail" hint={t("q-primary-email-hint")}>
              <input
                id="primaryEmail"
                className="wizard-input"
                type="email"
                autoComplete="email"
                required
                value={answers.primaryEmail}
                onChange={(e) => set("primaryEmail", e.target.value)}
              />
            </Question>
            <Question
              label={t("q-secondary-email")}
              htmlFor="secondaryEmail"
              hint={t("q-secondary-email-hint")}
            >
              <input
                id="secondaryEmail"
                className="wizard-input"
                type="email"
                value={answers.secondaryEmail}
                onChange={(e) => set("secondaryEmail", e.target.value)}
              />
            </Question>
          </div>

          <Question label={t("q-pronoun")} labelId="pronoun-label" wide>
            <ChoiceChips
              name="pronoun"
              labelId="pronoun-label"
              options={PRONOUN_OPTIONS}
              value={answers.pronoun}
              required
              onChange={(v) => set("pronoun", v)}
            />
            <OtherInput
              show={answers.pronoun === OTHER}
              required
              label={t("q-pronoun")}
              value={answers.pronounOther}
              onChange={(v) => set("pronounOther", v)}
            />
          </Question>

          <Question label={t("q-attendee-type")} labelId="attendee-type-label" wide>
            <ChoiceChips
              name="attendeeType"
              labelId="attendee-type-label"
              options={ATTENDEE_TYPE_OPTIONS}
              value={answers.attendeeType}
              required
              onChange={(v) => set("attendeeType", v)}
            />
            <OtherInput
              show={answers.attendeeType === OTHER}
              required
              label={t("q-attendee-type")}
              value={answers.attendeeTypeOther}
              onChange={(v) => set("attendeeTypeOther", v)}
            />
          </Question>
        </WizardCard>
      )}

      {section === "background" && (
        <WizardCard
          title={asksStudies ? t("card-education") : t("card-professional")}
          subtitle={t(`attending-as`, {
            type:
              ATTENDEE_TYPE_OPTIONS.find((o) => o.value === type)?.[
                locale === "fr-CA" ? "fr" : "en"
              ] ?? "",
          })}
        >
          <div className="wizard-grid">
            {asksSchool && (
              <Question label={t("q-school")} htmlFor="school">
                <Combobox
                  id="school"
                  options={schoolOptions}
                  value={answers.school}
                  otherLabel={t("q-school-other")}
                  required
                  onChange={(v) =>
                    setAnswers((prev) => ({ ...prev, school: v, campus: "" }))
                  }
                />
                <OtherInput
                  show={answers.school === OTHER}
                  required
                  label={t("q-school")}
                  value={answers.schoolOther}
                  onChange={(v) => set("schoolOther", v)}
                />
              </Question>
            )}

            {asksSchool && institution?.campuses && (
              <Question label={t("q-campus")} htmlFor="campus" hint={t("optional")}>
                <select
                  id="campus"
                  className="wizard-input"
                  value={answers.campus}
                  onChange={(e) => set("campus", e.target.value)}
                >
                  <option value="">{t("select-placeholder")}</option>
                  {institution.campuses.map((campus) => (
                    <option key={campus} value={campus}>
                      {campus}
                    </option>
                  ))}
                </select>
              </Question>
            )}

            {asksStudies && (
              <>
                <Question label={t("q-field-of-study")} htmlFor="fieldOfStudy">
                  <SelectField
                    id="fieldOfStudy"
                    options={FIELD_OF_STUDY_OPTIONS}
                    value={answers.fieldOfStudy}
                    required
                    onChange={(v) => set("fieldOfStudy", v)}
                  />
                  <OtherInput
                    show={answers.fieldOfStudy === OTHER}
                    required
                    label={t("q-field-of-study")}
                    value={answers.fieldOfStudyOther}
                    onChange={(v) => set("fieldOfStudyOther", v)}
                  />
                </Question>

                <Question label={t("q-credential")} htmlFor="credential">
                  <SelectField
                    id="credential"
                    options={CREDENTIAL_OPTIONS}
                    value={answers.credential}
                    required
                    onChange={(v) => set("credential", v)}
                  />
                  <OtherInput
                    show={answers.credential === OTHER}
                    required
                    label={t("q-credential")}
                    value={answers.credentialOther}
                    onChange={(v) => set("credentialOther", v)}
                  />
                </Question>

                <Question label={t("q-study-level")} htmlFor="studyLevel">
                  <SelectField
                    id="studyLevel"
                    options={STUDY_LEVEL_OPTIONS}
                    value={answers.studyLevel}
                    required
                    onChange={(v) => set("studyLevel", v)}
                  />
                  <OtherInput
                    show={answers.studyLevel === OTHER}
                    required
                    label={t("q-study-level")}
                    value={answers.studyLevelOther}
                    onChange={(v) => set("studyLevelOther", v)}
                  />
                </Question>

                <Question label={t("q-graduation")} htmlFor="expectedGraduation">
                  <SelectField
                    id="expectedGraduation"
                    options={GRADUATION_OPTIONS}
                    value={answers.expectedGraduation}
                    required
                    onChange={(v) => set("expectedGraduation", v)}
                  />
                </Question>

                <Question label={t("q-internships")} htmlFor="internships">
                  <SelectField
                    id="internships"
                    options={INTERNSHIP_COUNT_OPTIONS}
                    value={answers.internships}
                    required
                    onChange={(v) => set("internships", v)}
                  />
                </Question>
              </>
            )}

            {asksWork && (
              <>
                <Question label={t("q-current-role")} htmlFor="currentRole">
                  <SelectField
                    id="currentRole"
                    options={CURRENT_ROLE_OPTIONS}
                    value={answers.currentRole}
                    required
                    onChange={(v) => set("currentRole", v)}
                  />
                  <OtherInput
                    show={answers.currentRole === OTHER}
                    required
                    label={t("q-current-role")}
                    value={answers.currentRoleOther}
                    onChange={(v) => set("currentRoleOther", v)}
                  />
                </Question>

                <Question label={t("q-experience")} htmlFor="experience">
                  <SelectField
                    id="experience"
                    options={EXPERIENCE_OPTIONS}
                    value={answers.experience}
                    required
                    onChange={(v) => set("experience", v)}
                  />
                </Question>
              </>
            )}
          </div>

          <Question label={t("q-travel-from")} labelId="travel-from-label" wide>
            <OriginFields
              value={answers}
              onChange={(next) => setAnswers((prev) => ({ ...prev, ...next }))}
            />
          </Question>

          <p className="wizard-card__foot">
            <Info aria-hidden="true" />
            {t("aggregate-note")}
          </p>
        </WizardCard>
      )}

      <StepActions
        submitLabel={t("continue-button")}
        busy={busy}
        error={error}
        onBack={index > 0 ? () => go(index - 1) : undefined}
      />
    </form>
  );
}
