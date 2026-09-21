"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { ProfileAnswers } from "@/lib/interface";
import { INSTITUTIONS, findInstitution, institutionCity } from "@/lib/institutions";
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
  BrandSelect,
  ChoiceChips,
  Combobox,
  OtherInput,
  Question,
  SelectField,
  WizardCard,
} from "./WizardFields";
import CityPicker from "./CityPicker";
import { StepActions, StepHeader } from "./WizardSection";
import { focusField, saveSection } from "./profileAnswers";

const STEPS: SectionId[] = ["basics", "background"];

interface ProfileFormProps {
  initial: ProfileAnswers;
  startIndex: number;
}

export default function ProfileForm({ initial, startIndex }: ProfileFormProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();
  const [answers, setAnswers] = useState<ProfileAnswers>(initial);
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  const update = (patch: Partial<ProfileAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
    if (errorField && errorField in patch) {
      const value = patch[errorField as keyof ProfileAnswers];
      if (typeof value !== "string" || value.trim()) {
        setError(null);
        setErrorField(null);
      }
    }
  };

  const set = <K extends keyof ProfileAnswers>(key: K, value: ProfileAnswers[K]) =>
    update({ [key]: value } as Partial<ProfileAnswers>);

  const type = answers.attendeeType;
  const asksSchool = SCHOOL_TYPES.includes(type);
  const asksStudies = STUDIES_TYPES.includes(type);
  const asksWork = WORK_TYPES.includes(type);
  const institution = findInstitution(answers.school);

  // Choosing a school pre-fills "travelling from" with that school's city. A
  // city the delegate chose themselves is never overwritten: only an empty
  // field, or one still holding the previous school's city, is replaced.
  const cityFromSchool = (school: string): Partial<ProfileAnswers> => {
    const next = institutionCity(school);
    if (!next) return {};
    const previous = institutionCity(answers.school);
    const untouched =
      !answers.travelCity ||
      (previous !== null &&
        answers.travelCity === previous.city &&
        answers.travelRegion === previous.region &&
        answers.travelCountry === previous.country);
    if (!untouched) return {};
    return { travelCity: next.city, travelRegion: next.region, travelCountry: next.country };
  };
  const section = STEPS[index];

  const go = (next: number) => {
    setError(null);
    setErrorField(null);
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrorField(null);
    const result = await saveSection(section, answers);
    setBusy(false);

    if (!result.ok) {
      setError(result.field ? t("error-field") : t("error-generic"));
      setErrorField(result.field ?? null);
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
      <StepHeader title={t("profile-heading")} current={index + 1} total={STEPS.length} />

      {section === "basics" && (
        <WizardCard title={t("card-basics")}>
          <div className="wizard-grid">
            <Question label={t("q-first-name")} htmlFor="firstName" required>
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
            <Question label={t("q-last-name")} htmlFor="lastName" required>
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
            <Question label={t("q-primary-email")} htmlFor="primaryEmail" required>
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
            <Question label={t("q-secondary-email")} htmlFor="secondaryEmail">
              <input
                id="secondaryEmail"
                className="wizard-input"
                type="email"
                value={answers.secondaryEmail}
                onChange={(e) => set("secondaryEmail", e.target.value)}
              />
            </Question>
          </div>

          <Question label={t("q-pronoun")} labelId="pronoun-label" anchor="pronoun" required wide>
            <ChoiceChips
              name="pronoun"
              labelId="pronoun-label"
              options={PRONOUN_OPTIONS}
              value={answers.pronoun}
              required
              onChange={(v) => set("pronoun", v)}
            />
            <OtherInput
              id="pronounOther"
              show={answers.pronoun === OTHER}
              required
              label={t("q-pronoun")}
              value={answers.pronounOther}
              onChange={(v) => set("pronounOther", v)}
            />
          </Question>

          <Question
            label={t("q-attendee-type")}
            labelId="attendee-type-label"
            anchor="attendeeType"
            required
            wide
          >
            <ChoiceChips
              name="attendeeType"
              labelId="attendee-type-label"
              options={ATTENDEE_TYPE_OPTIONS}
              value={answers.attendeeType}
              required
              onChange={(v) => set("attendeeType", v)}
            />
            <OtherInput
              id="attendeeTypeOther"
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
        <WizardCard title={asksStudies ? t("card-education") : t("card-professional")}>
          <div className="wizard-grid">
            {asksSchool && (
              <Question label={t("q-school")} htmlFor="school" required>
                <Combobox
                  id="school"
                  options={schoolOptions}
                  value={answers.school}
                  otherLabel={t("q-school-other")}
                  required
                  onChange={(v) => update({ school: v, campus: "", ...cityFromSchool(v) })}
                />
                <OtherInput
                  id="schoolOther"
                  show={answers.school === OTHER}
                  required
                  label={t("q-school")}
                  value={answers.schoolOther}
                  onChange={(v) => set("schoolOther", v)}
                />
              </Question>
            )}

            {asksSchool && institution?.campuses && (
              <Question label={t("q-campus")} labelId="campus-label">
                <BrandSelect
                  id="campus"
                  labelId="campus-label"
                  options={institution.campuses.map((campus) => ({ value: campus, label: campus }))}
                  value={answers.campus}
                  onChange={(v) => set("campus", v)}
                />
              </Question>
            )}

            {asksStudies && (
              <>
                <Question label={t("q-field-of-study")} labelId="field-of-study-label" required>
                  <SelectField
                    id="fieldOfStudy"
                    labelId="field-of-study-label"
                    options={FIELD_OF_STUDY_OPTIONS}
                    value={answers.fieldOfStudy}
                    required
                    onChange={(v) => set("fieldOfStudy", v)}
                  />
                  <OtherInput
                    id="fieldOfStudyOther"
                    show={answers.fieldOfStudy === OTHER}
                    required
                    label={t("q-field-of-study")}
                    value={answers.fieldOfStudyOther}
                    onChange={(v) => set("fieldOfStudyOther", v)}
                  />
                </Question>

                <Question label={t("q-credential")} labelId="credential-label" required>
                  <SelectField
                    id="credential"
                    labelId="credential-label"
                    options={CREDENTIAL_OPTIONS}
                    value={answers.credential}
                    required
                    onChange={(v) => set("credential", v)}
                  />
                  <OtherInput
                    id="credentialOther"
                    show={answers.credential === OTHER}
                    required
                    label={t("q-credential")}
                    value={answers.credentialOther}
                    onChange={(v) => set("credentialOther", v)}
                  />
                </Question>

                <Question label={t("q-study-level")} labelId="study-level-label" required>
                  <SelectField
                    id="studyLevel"
                    labelId="study-level-label"
                    options={STUDY_LEVEL_OPTIONS}
                    value={answers.studyLevel}
                    required
                    onChange={(v) => set("studyLevel", v)}
                  />
                  <OtherInput
                    id="studyLevelOther"
                    show={answers.studyLevel === OTHER}
                    required
                    label={t("q-study-level")}
                    value={answers.studyLevelOther}
                    onChange={(v) => set("studyLevelOther", v)}
                  />
                </Question>

                <Question label={t("q-graduation")} labelId="graduation-label" required>
                  <SelectField
                    id="expectedGraduation"
                    labelId="graduation-label"
                    options={GRADUATION_OPTIONS}
                    value={answers.expectedGraduation}
                    required
                    onChange={(v) => set("expectedGraduation", v)}
                  />
                </Question>

                <Question label={t("q-internships")} labelId="internships-label" required>
                  <SelectField
                    id="internships"
                    labelId="internships-label"
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
                <Question label={t("q-current-role")} labelId="current-role-label" required>
                  <SelectField
                    id="currentRole"
                    labelId="current-role-label"
                    options={CURRENT_ROLE_OPTIONS}
                    value={answers.currentRole}
                    required
                    onChange={(v) => set("currentRole", v)}
                  />
                  <OtherInput
                    id="currentRoleOther"
                    show={answers.currentRole === OTHER}
                    required
                    label={t("q-current-role")}
                    value={answers.currentRoleOther}
                    onChange={(v) => set("currentRoleOther", v)}
                  />
                </Question>

                <Question label={t("q-experience")} labelId="experience-label" required>
                  <SelectField
                    id="experience"
                    labelId="experience-label"
                    options={EXPERIENCE_OPTIONS}
                    value={answers.experience}
                    required
                    onChange={(v) => set("experience", v)}
                  />
                </Question>
              </>
            )}
          </div>

          <Question label={t("q-travel-from")} htmlFor="travel-city" required wide>
            <CityPicker
              id="travel-city"
              value={answers}
              suggested={asksSchool ? institutionCity(answers.school) : null}
              onChange={(next) => update(next)}
            />
          </Question>
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
