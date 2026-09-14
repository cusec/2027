"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2, Sparkles, TrainFront } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { ProfileAnswers } from "@/lib/interface";
import { INSTITUTIONS } from "@/lib/institutions";
import {
  ATTEND_REASON_OPTIONS,
  ATTENDED_OPTIONS,
  COMMUNITY_OPTIONS,
  CONNECT_SCHOOL_OPTIONS,
  CONVINCED_BY_OPTIONS,
  FIRST_TIME,
  HEARD_FROM_OPTIONS,
  INDEPENDENT_DELEGATION,
  INTEREST_SECTIONS,
  LIMITS,
  NOT_LOOKING,
  OPPORTUNITY_OPTIONS,
  OTHER,
  SESSION_FORMAT_OPTIONS,
  SUCCESS_OPTIONS,
  TECH_AREA_OPTIONS,
  TRANSPORT_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  WORK_LOCATION_OPTIONS,
  YES_NO_UNSURE_OPTIONS,
  isValidLink,
  type LinkField,
  type SectionId,
} from "@/lib/ticketWizardOptions";
import {
  ChoiceChips,
  Combobox,
  MultiChips,
  OtherInput,
  Question,
  SelectField,
  TagPicker,
  WizardCard,
} from "./WizardFields";
import { StepActions, StepHeader } from "./WizardSection";
import ResumeUpload, { type ResumeMeta } from "./ResumeUpload";
import { focusField, saveSection } from "./profileAnswers";

const INTEREST_STEPS: SectionId[] = INTEREST_SECTIONS;

const LINKS: { field: LinkField; placeholder: string }[] = [
  { field: "linkedinUrl", placeholder: "https://linkedin.com/in/your-name" },
  { field: "githubUrl", placeholder: "https://github.com/your-name" },
  { field: "portfolioUrl", placeholder: "https://your-site.com" },
];

interface InterestsFormProps {
  initial: ProfileAnswers;
  startIndex: number;
  initialResume: ResumeMeta | null;
}

export default function InterestsForm({ initial, startIndex, initialResume }: InterestsFormProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();
  const [answers, setAnswers] = useState<ProfileAnswers>(initial);
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileAnswers>(key: K, value: ProfileAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const section = INTEREST_STEPS[index];
  const isLast = index === INTEREST_STEPS.length - 1;

  const go = (next: number) => {
    setError(null);
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (section === "links") {
      const bad = LINKS.find(({ field }) => !isValidLink(field, answers[field]));
      if (bad) {
        setError(t(`error-${bad.field}`));
        focusField(bad.field);
        return;
      }
    }

    setBusy(true);
    setError(null);
    const result = await saveSection(section, answers);
    setBusy(false);

    if (!result.ok) {
      const linkField = LINKS.some(({ field }) => field === result.field);
      setError(
        linkField ? t(`error-${result.field}`) : result.field ? t("error-field") : t("error-generic")
      );
      focusField(result.field);
      return;
    }
    if (isLast) {
      router.push("/tickets/purchase");
    } else {
      go(index + 1);
    }
  };

  const delegationOptions = [
    { value: INDEPENDENT_DELEGATION, label: t("q-delegation-independent") },
    ...INSTITUTIONS.map((i) => ({ value: i.value, label: i.name })),
  ];

  return (
    <form className="wizard-form" onSubmit={submit}>
      {section === "goals" && (
        <>
          <StepHeader
            title={t("goals-heading")}
            current={index + 1}
            total={INTEREST_STEPS.length}
          />

          <WizardCard title={t("card-goals")} subtitle={t("all-optional")}>
            <Question label={t("q-attend-reasons")} labelId="attend-reasons-label" wide>
              <MultiChips
                labelId="attend-reasons-label"
                options={ATTEND_REASON_OPTIONS}
                values={answers.attendReasons}
                max={LIMITS.attendReasons}
                onChange={(v) => set("attendReasons", v)}
              />
              <OtherInput
                show={answers.attendReasons.includes(OTHER)}
                label={t("q-attend-reasons")}
                value={answers.attendReasonsOther}
                onChange={(v) => set("attendReasonsOther", v)}
              />
            </Question>

            <Question label={t("q-success")} labelId="success-label" wide>
              <MultiChips
                labelId="success-label"
                options={SUCCESS_OPTIONS}
                values={answers.successMeasures}
                max={LIMITS.successMeasures}
                onChange={(v) => set("successMeasures", v)}
              />
              <OtherInput
                show={answers.successMeasures.includes(OTHER)}
                label={t("q-success")}
                value={answers.successMeasuresOther}
                onChange={(v) => set("successMeasuresOther", v)}
              />
            </Question>
          </WizardCard>

          <WizardCard title={t("card-career")} subtitle={t("career-note")}>
            <Question label={t("q-opportunities")} labelId="opportunities-label" wide>
              <MultiChips
                labelId="opportunities-label"
                options={OPPORTUNITY_OPTIONS}
                values={answers.opportunities}
                exclusive={[NOT_LOOKING]}
                onChange={(v) =>
                  setAnswers((prev) => ({
                    ...prev,
                    opportunities: v,
                    ...(v.includes(NOT_LOOKING) ? { workLocations: [], workArrangement: "" } : {}),
                  }))
                }
              />
              <OtherInput
                show={answers.opportunities.includes(OTHER)}
                label={t("q-opportunities")}
                value={answers.opportunitiesOther}
                onChange={(v) => set("opportunitiesOther", v)}
              />
            </Question>

            <Question label={t("q-tech-areas")} htmlFor="techAreas" wide>
              <TagPicker
                id="techAreas"
                options={TECH_AREA_OPTIONS}
                values={answers.techAreas}
                max={LIMITS.techAreas}
                onChange={(v) => set("techAreas", v)}
              />
              <OtherInput
                show={answers.techAreas.includes(OTHER)}
                label={t("q-tech-areas")}
                value={answers.techAreasOther}
                onChange={(v) => set("techAreasOther", v)}
              />
            </Question>

            {!answers.opportunities.includes(NOT_LOOKING) && (
              <>
                <Question label={t("q-work-locations")} labelId="work-locations-label" wide>
                  <MultiChips
                    labelId="work-locations-label"
                    options={WORK_LOCATION_OPTIONS}
                    values={answers.workLocations}
                    onChange={(v) => set("workLocations", v)}
                  />
                </Question>

                <Question label={t("q-work-arrangement")} htmlFor="workArrangement" wide>
                  <SelectField
                    id="workArrangement"
                    options={WORK_ARRANGEMENT_OPTIONS}
                    value={answers.workArrangement}
                    onChange={(v) => set("workArrangement", v)}
                  />
                </Question>
              </>
            )}
          </WizardCard>
        </>
      )}

      {section === "experience" && (
        <>
          <StepHeader
            title={t("experience-heading")}
            current={index + 1}
            total={INTEREST_STEPS.length}
          />

          <div className="wizard-card-pair">
            <WizardCard
              title={t("card-travel")}
              subtitle={t("card-travel-note")}
              icon={<TrainFront />}
            >
              <Question label={t("q-transport")} htmlFor="transport" wide>
                <SelectField
                  id="transport"
                  options={TRANSPORT_OPTIONS}
                  value={answers.transport}
                  onChange={(v) => set("transport", v)}
                />
                <OtherInput
                  show={answers.transport === OTHER}
                  label={t("q-transport")}
                  value={answers.transportOther}
                  onChange={(v) => set("transportOther", v)}
                />
              </Question>

              <Question label={t("q-delegation")} labelId="delegation-label" wide>
                <ChoiceChips
                  name="delegation"
                  labelId="delegation-label"
                  options={YES_NO_UNSURE_OPTIONS}
                  value={answers.delegation}
                  onChange={(v) => set("delegation", v)}
                />
              </Question>

              {answers.delegation === "yes" && (
                <Question label={t("q-delegation-school")} htmlFor="delegationSchool" wide>
                  <Combobox
                    id="delegationSchool"
                    options={delegationOptions}
                    value={answers.delegationSchool}
                    otherLabel={t("q-school-other")}
                    onChange={(v) => set("delegationSchool", v)}
                  />
                  <OtherInput
                    show={answers.delegationSchool === OTHER}
                    label={t("q-delegation-school")}
                    value={answers.delegationOther}
                    onChange={(v) => set("delegationOther", v)}
                  />
                </Question>
              )}

              <Question label={t("q-connect-school")} labelId="connect-label" wide>
                <ChoiceChips
                  name="connectWithSchool"
                  labelId="connect-label"
                  options={CONNECT_SCHOOL_OPTIONS}
                  value={answers.connectWithSchool}
                  onChange={(v) => set("connectWithSchool", v)}
                />
              </Question>

              <Question label={t("q-travel-funding")} labelId="funding-label" wide>
                <ChoiceChips
                  name="travelFunding"
                  labelId="funding-label"
                  options={YES_NO_UNSURE_OPTIONS}
                  value={answers.travelFunding}
                  onChange={(v) => set("travelFunding", v)}
                />
              </Question>

              <Question label={t("q-accommodation")} labelId="accommodation-label" wide>
                <ChoiceChips
                  name="accommodation"
                  labelId="accommodation-label"
                  options={YES_NO_UNSURE_OPTIONS}
                  value={answers.accommodation}
                  onChange={(v) => set("accommodation", v)}
                />
              </Question>
            </WizardCard>

            <WizardCard
              title={t("card-about")}
              subtitle={t("card-about-note")}
              icon={<Sparkles />}
            >
              <Question label={t("q-heard-from")} htmlFor="heardFrom" wide>
                <SelectField
                  id="heardFrom"
                  options={HEARD_FROM_OPTIONS}
                  value={answers.heardFrom}
                  onChange={(v) => set("heardFrom", v)}
                />
                <OtherInput
                  show={answers.heardFrom === OTHER}
                  label={t("q-heard-from")}
                  value={answers.heardFromOther}
                  onChange={(v) => set("heardFromOther", v)}
                />
              </Question>

              <Question label={t("q-convinced-by")} htmlFor="convincedBy" wide>
                <SelectField
                  id="convincedBy"
                  options={CONVINCED_BY_OPTIONS}
                  value={answers.convincedBy}
                  onChange={(v) => set("convincedBy", v)}
                />
                <OtherInput
                  show={answers.convincedBy === OTHER}
                  label={t("q-convinced-by")}
                  value={answers.convincedByOther}
                  onChange={(v) => set("convincedByOther", v)}
                />
              </Question>

              <Question label={t("q-attended")} labelId="attended-label" wide>
                <MultiChips
                  labelId="attended-label"
                  options={ATTENDED_OPTIONS}
                  values={answers.attended}
                  exclusive={[FIRST_TIME]}
                  onChange={(v) => set("attended", v)}
                />
              </Question>

              <Question label={t("q-session-formats")} labelId="formats-label" wide>
                <MultiChips
                  labelId="formats-label"
                  options={SESSION_FORMAT_OPTIONS}
                  values={answers.sessionFormats}
                  max={LIMITS.sessionFormats}
                  onChange={(v) => set("sessionFormats", v)}
                />
                <OtherInput
                  show={answers.sessionFormats.includes(OTHER)}
                  label={t("q-session-formats")}
                  value={answers.sessionFormatsOther}
                  onChange={(v) => set("sessionFormatsOther", v)}
                />
              </Question>

              <Question label={t("q-community")} labelId="community-label" wide>
                <MultiChips
                  labelId="community-label"
                  options={COMMUNITY_OPTIONS}
                  values={answers.communityInvolvement}
                  exclusive={["not-involved"]}
                  onChange={(v) => set("communityInvolvement", v)}
                />
                <OtherInput
                  show={answers.communityInvolvement.includes(OTHER)}
                  label={t("q-community")}
                  value={answers.communityInvolvementOther}
                  onChange={(v) => set("communityInvolvementOther", v)}
                />
              </Question>

              <Question label={t("q-community-project")} htmlFor="communityProject" wide>
                <input
                  id="communityProject"
                  className="wizard-input"
                  type="text"
                  maxLength={200}
                  value={answers.communityProject}
                  onChange={(e) => set("communityProject", e.target.value)}
                />
              </Question>
            </WizardCard>
          </div>
        </>
      )}

      {section === "links" && (
        <>
          <StepHeader
            title={t("links-heading")}
            current={index + 1}
            total={INTEREST_STEPS.length}
          />

          <WizardCard title={t("card-links")} subtitle={t("all-optional")} icon={<Link2 />}>
            <div className="wizard-grid">
              <Question label={t("q-resume")} htmlFor="resume" hint={t("resume-hint")} wide>
                <ResumeUpload id="resume" initialResume={initialResume} />
              </Question>

              {LINKS.map(({ field, placeholder }) => (
                <Question key={field} label={t(`q-${field}`)} htmlFor={field}>
                  <input
                    id={field}
                    className="wizard-input"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    placeholder={placeholder}
                    value={answers[field]}
                    onChange={(e) => set(field, e.target.value)}
                  />
                </Question>
              ))}
            </div>

            <label className={`wizard-chip wizard-consent${answers.sponsorConsent ? " is-on" : ""}`}>
              <input
                className="wizard-chip__input"
                type="checkbox"
                checked={answers.sponsorConsent}
                onChange={(e) => set("sponsorConsent", e.target.checked)}
              />
              <span className="wizard-chip__mark" aria-hidden="true">
                {answers.sponsorConsent && <Check strokeWidth={3} />}
              </span>
              <span className="wizard-chip__text">{t("q-sponsor-consent")}</span>
            </label>
          </WizardCard>
        </>
      )}

      <StepActions
        submitLabel={isLast ? t("review-ticket") : t("continue-button")}
        busy={busy}
        error={error}
        onBack={index > 0 ? () => go(index - 1) : undefined}
        backHref={index === 0 ? "/tickets/profile" : undefined}
      />
    </form>
  );
}
