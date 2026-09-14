"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Info, Sparkles, TrainFront } from "lucide-react";
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
import { focusField, saveSection } from "./profileAnswers";

const STEPS: SectionId[] = ["goals", "experience"];

interface InterestsFormProps {
  initial: ProfileAnswers;
  startIndex: number;
}

/**
 * The Interests step: goals and career interests, then getting to CUSEC and
 * how they found it. Every question here is optional. Each section still
 * saves on Continue, blank or not, which is what moves the delegate on.
 */
export default function InterestsForm({ initial, startIndex }: InterestsFormProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();
  const [answers, setAnswers] = useState<ProfileAnswers>(initial);
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileAnswers>(key: K, value: ProfileAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

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
      router.push("/tickets/purchase");
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
            note={t("confidential-notice")}
            tone="confidential"
            current={index + 1}
            total={STEPS.length}
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
                    // Not looking: where and how they'd work no longer apply.
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
            note={t("confidential-notice")}
            tone="confidential"
            current={index + 1}
            total={STEPS.length}
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

              <p className="wizard-card__foot">
                <Info aria-hidden="true" />
                {t("aggregate-only")}
              </p>
            </WizardCard>
          </div>
        </>
      )}

      <StepActions
        submitLabel={index < STEPS.length - 1 ? t("continue-button") : t("review-ticket")}
        busy={busy}
        error={error}
        onBack={index > 0 ? () => go(index - 1) : undefined}
        backHref={index === 0 ? "/tickets/profile" : undefined}
      />
    </form>
  );
}
