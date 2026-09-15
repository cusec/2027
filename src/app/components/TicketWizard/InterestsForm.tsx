"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2, Sparkles, TrainFront } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { ProfileAnswers } from "@/lib/interface";
import { DELEGATION_INSTITUTIONS } from "@/lib/institutions";
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
  type Option,
  type SectionId,
} from "@/lib/ticketWizardOptions";
import {
  ChoiceChips,
  Combobox,
  MultiChips,
  MultiSelect,
  OtherInput,
  Question,
  SelectField,
  WizardCard,
} from "./WizardFields";
import { StepActions, StepHeader } from "./WizardSection";
import ResumeUpload, { type ResumeMeta } from "./ResumeUpload";
import { focusField, saveSection } from "./profileAnswers";

const INTEREST_STEPS: SectionId[] = INTEREST_SECTIONS;

const LINKS: {
  field: LinkField;
  prefix: string;
  base: string;
  strip: RegExp;
  placeholder: string;
}[] = [
  {
    field: "linkedinUrl",
    prefix: "linkedin.com/in/",
    base: "https://www.linkedin.com/in/",
    strip: /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\//i,
    placeholder: "your-name",
  },
  {
    field: "githubUrl",
    prefix: "github.com/",
    base: "https://github.com/",
    strip: /^(https?:\/\/)?(www\.)?github\.com\//i,
    placeholder: "your-name",
  },
  {
    field: "portfolioUrl",
    prefix: "https://",
    base: "https://",
    strip: /^https?:\/\//i,
    placeholder: "your-site.com",
  },
];

type Key = keyof ProfileAnswers;

const keys = (...list: Key[]) => list;

const blank = (value: unknown) =>
  Array.isArray(value) ? value.length === 0 : typeof value === "string" ? !value.trim() : false;

const known = (values: string[], options: Option[]) =>
  values.filter((v) => options.some((o) => o.value === v));

function withOther(a: ProfileAnswers, key: Key, otherKey: Key): Key[] {
  const value = a[key];
  const picked = Array.isArray(value) ? value.includes(OTHER) : value === OTHER;
  return picked ? keys(key, otherKey) : keys(key);
}

function requiredFields(section: SectionId, a: ProfileAnswers): Key[] {
  switch (section) {
    case "goals":
      return [
        ...withOther(a, "attendReasons", "attendReasonsOther"),
        ...withOther(a, "successMeasures", "successMeasuresOther"),
        ...withOther(a, "opportunities", "opportunitiesOther"),
        ...withOther(a, "techAreas", "techAreasOther"),
        ...(a.opportunities.includes(NOT_LOOKING) ? [] : keys("workLocations", "workArrangement")),
      ];
    case "travel":
      return [
        ...withOther(a, "transport", "transportOther"),
        ...keys("delegation"),
        ...(a.delegation === "yes" ? withOther(a, "delegationSchool", "delegationOther") : []),
        ...keys("connectWithSchool", "travelFunding", "accommodation"),
      ];
    case "experience":
      return [
        ...withOther(a, "heardFrom", "heardFromOther"),
        ...withOther(a, "convincedBy", "convincedByOther"),
        ...keys("attended"),
        ...withOther(a, "sessionFormats", "sessionFormatsOther"),
        ...withOther(a, "communityInvolvement", "communityInvolvementOther"),
      ];
    default:
      return [];
  }
}

interface InterestsFormProps {
  initial: ProfileAnswers;
  startIndex: number;
  initialResume: ResumeMeta | null;
}

export default function InterestsForm({ initial, startIndex, initialResume }: InterestsFormProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();
  const [answers, setAnswers] = useState<ProfileAnswers>(() => ({
    ...initial,
    opportunities: known(initial.opportunities, OPPORTUNITY_OPTIONS),
    workLocations: known(initial.workLocations, WORK_LOCATION_OPTIONS),
    convincedBy: known([initial.convincedBy], CONVINCED_BY_OPTIONS)[0] ?? "",
  }));
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  const isFixed = (key: string, value: unknown) => {
    const link = LINKS.find((l) => l.field === key);
    return link ? isValidLink(link.field, String(value ?? "")) : !blank(value);
  };

  const update = (patch: Partial<ProfileAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
    if (errorField && errorField in patch && isFixed(errorField, patch[errorField as Key])) {
      setError(null);
      setErrorField(null);
    }
  };

  const set = <K extends Key>(key: K, value: ProfileAnswers[K]) =>
    update({ [key]: value } as Partial<ProfileAnswers>);

  const section = INTEREST_STEPS[index];
  const isLast = index === INTEREST_STEPS.length - 1;

  const go = (next: number) => {
    setError(null);
    setErrorField(null);
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fail = (message: string, field?: string) => {
    setError(message);
    setErrorField(field ?? null);
    focusField(field);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const missing = requiredFields(section, answers).find((key) => blank(answers[key]));
    if (missing) {
      fail(t("error-required"), missing);
      return;
    }

    if (section === "links") {
      const bad = LINKS.find(({ field }) => !isValidLink(field, answers[field]));
      if (bad) {
        fail(t(`error-${bad.field}`), bad.field);
        return;
      }
    }

    setBusy(true);
    setError(null);
    setErrorField(null);
    const result = await saveSection(section, answers);
    setBusy(false);

    if (!result.ok) {
      const linkField = LINKS.some(({ field }) => field === result.field);
      fail(
        linkField ? t(`error-${result.field}`) : result.field ? t("error-field") : t("error-generic"),
        result.field
      );
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
    ...DELEGATION_INSTITUTIONS.map((i) => ({ value: i.value, label: i.name })),
  ];

  const looking = !answers.opportunities.includes(NOT_LOOKING);

  return (
    <form className="wizard-form" onSubmit={submit}>
      {section === "goals" && (
        <>
          <StepHeader
            title={t("goals-heading")}
            current={index + 1}
            total={INTEREST_STEPS.length}
          />

          <WizardCard title={t("card-goals")}>
            <Question
              label={t("q-attend-reasons")}
              labelId="attend-reasons-label"
              anchor="attendReasons"
              required
              wide
            >
              <MultiChips
                labelId="attend-reasons-label"
                options={ATTEND_REASON_OPTIONS}
                values={answers.attendReasons}
                max={LIMITS.attendReasons}
                onChange={(v) => set("attendReasons", v)}
              />
              <OtherInput
                id="attendReasonsOther"
                show={answers.attendReasons.includes(OTHER)}
                label={t("q-attend-reasons")}
                value={answers.attendReasonsOther}
                onChange={(v) => set("attendReasonsOther", v)}
              />
            </Question>

            <Question
              label={t("q-success")}
              labelId="success-label"
              anchor="successMeasures"
              required
              wide
            >
              <MultiChips
                labelId="success-label"
                options={SUCCESS_OPTIONS}
                values={answers.successMeasures}
                max={LIMITS.successMeasures}
                onChange={(v) => set("successMeasures", v)}
              />
              <OtherInput
                id="successMeasuresOther"
                show={answers.successMeasures.includes(OTHER)}
                label={t("q-success")}
                value={answers.successMeasuresOther}
                onChange={(v) => set("successMeasuresOther", v)}
              />
            </Question>
          </WizardCard>

          <WizardCard title={t("card-career")}>
            <Question
              label={t("q-opportunities")}
              labelId="opportunities-label"
              anchor="opportunities"
              required
              wide
            >
              <MultiChips
                labelId="opportunities-label"
                options={OPPORTUNITY_OPTIONS}
                values={answers.opportunities}
                exclusive={[NOT_LOOKING]}
                onChange={(v) =>
                  update({
                    opportunities: v,
                    ...(v.includes(NOT_LOOKING) ? { workLocations: [], workArrangement: "" } : {}),
                  })
                }
              />
              <OtherInput
                id="opportunitiesOther"
                show={answers.opportunities.includes(OTHER)}
                label={t("q-opportunities")}
                value={answers.opportunitiesOther}
                onChange={(v) => set("opportunitiesOther", v)}
              />
            </Question>

            <Question label={t("q-tech-areas")} labelId="tech-areas-label" required wide>
              <MultiSelect
                id="techAreas"
                labelId="tech-areas-label"
                options={TECH_AREA_OPTIONS}
                values={answers.techAreas}
                max={LIMITS.techAreas}
                placeholder={t("tag-add")}
                onChange={(v) => set("techAreas", v)}
              />
              <OtherInput
                id="techAreasOther"
                show={answers.techAreas.includes(OTHER)}
                label={t("q-tech-areas")}
                value={answers.techAreasOther}
                onChange={(v) => set("techAreasOther", v)}
              />
            </Question>

            {looking && (
              <>
                <Question
                  label={t("q-work-locations")}
                  labelId="work-locations-label"
                  required
                  wide
                >
                  <MultiSelect
                    id="workLocations"
                    labelId="work-locations-label"
                    options={WORK_LOCATION_OPTIONS}
                    values={answers.workLocations}
                    max={LIMITS.workLocations}
                    placeholder={t("location-add")}
                    onChange={(v) => set("workLocations", v)}
                  />
                </Question>

                <Question
                  label={t("q-work-arrangement")}
                  labelId="work-arrangement-label"
                  required
                  wide
                >
                  <SelectField
                    id="workArrangement"
                    labelId="work-arrangement-label"
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

      {section === "travel" && (
        <>
          <StepHeader
            title={t("travel-heading")}
            current={index + 1}
            total={INTEREST_STEPS.length}
          />

          <WizardCard title={t("card-travel")} icon={<TrainFront />}>
            <Question label={t("q-transport")} labelId="transport-label" required wide>
              <SelectField
                id="transport"
                labelId="transport-label"
                options={TRANSPORT_OPTIONS}
                value={answers.transport}
                onChange={(v) => set("transport", v)}
              />
              <OtherInput
                id="transportOther"
                show={answers.transport === OTHER}
                label={t("q-transport")}
                value={answers.transportOther}
                onChange={(v) => set("transportOther", v)}
              />
            </Question>

            <Question
              label={t("q-delegation")}
              labelId="delegation-label"
              anchor="delegation"
              required
              wide
            >
              <ChoiceChips
                name="delegation"
                labelId="delegation-label"
                options={YES_NO_UNSURE_OPTIONS}
                value={answers.delegation}
                onChange={(v) => set("delegation", v)}
              />
            </Question>

            {answers.delegation === "yes" && (
              <Question label={t("q-delegation-school")} htmlFor="delegationSchool" required wide>
                <Combobox
                  id="delegationSchool"
                  options={delegationOptions}
                  value={answers.delegationSchool}
                  otherLabel={t("q-school-other")}
                  onChange={(v) => set("delegationSchool", v)}
                />
                <OtherInput
                  id="delegationOther"
                  show={answers.delegationSchool === OTHER}
                  label={t("q-delegation-school")}
                  value={answers.delegationOther}
                  onChange={(v) => set("delegationOther", v)}
                />
              </Question>
            )}

            <Question
              label={t("q-connect-school")}
              labelId="connect-label"
              anchor="connectWithSchool"
              required
              wide
            >
              <ChoiceChips
                name="connectWithSchool"
                labelId="connect-label"
                options={CONNECT_SCHOOL_OPTIONS}
                value={answers.connectWithSchool}
                onChange={(v) => set("connectWithSchool", v)}
              />
            </Question>

            <Question
              label={t("q-travel-funding")}
              labelId="funding-label"
              anchor="travelFunding"
              required
              wide
            >
              <ChoiceChips
                name="travelFunding"
                labelId="funding-label"
                options={YES_NO_UNSURE_OPTIONS}
                value={answers.travelFunding}
                onChange={(v) => set("travelFunding", v)}
              />
            </Question>

            <Question
              label={t("q-accommodation")}
              labelId="accommodation-label"
              anchor="accommodation"
              required
              wide
            >
              <ChoiceChips
                name="accommodation"
                labelId="accommodation-label"
                options={YES_NO_UNSURE_OPTIONS}
                value={answers.accommodation}
                onChange={(v) => set("accommodation", v)}
              />
            </Question>
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

          <WizardCard title={t("card-about")} icon={<Sparkles />}>
            <Question label={t("q-heard-from")} labelId="heard-from-label" required wide>
              <SelectField
                id="heardFrom"
                labelId="heard-from-label"
                options={HEARD_FROM_OPTIONS}
                value={answers.heardFrom}
                onChange={(v) => set("heardFrom", v)}
              />
              <OtherInput
                id="heardFromOther"
                show={answers.heardFrom === OTHER}
                label={t("q-heard-from")}
                value={answers.heardFromOther}
                onChange={(v) => set("heardFromOther", v)}
              />
            </Question>

            <Question label={t("q-convinced-by")} labelId="convinced-by-label" required wide>
              <SelectField
                id="convincedBy"
                labelId="convinced-by-label"
                options={CONVINCED_BY_OPTIONS}
                value={answers.convincedBy}
                onChange={(v) => set("convincedBy", v)}
              />
              <OtherInput
                id="convincedByOther"
                show={answers.convincedBy === OTHER}
                label={t("q-convinced-by")}
                value={answers.convincedByOther}
                onChange={(v) => set("convincedByOther", v)}
              />
            </Question>

            <Question
              label={t("q-attended")}
              labelId="attended-label"
              anchor="attended"
              required
              wide
            >
              <MultiChips
                labelId="attended-label"
                options={ATTENDED_OPTIONS}
                values={answers.attended}
                exclusive={[FIRST_TIME]}
                onChange={(v) => set("attended", v)}
              />
            </Question>

            <Question
              label={t("q-session-formats")}
              labelId="formats-label"
              anchor="sessionFormats"
              required
              wide
            >
              <MultiChips
                labelId="formats-label"
                options={SESSION_FORMAT_OPTIONS}
                values={answers.sessionFormats}
                max={LIMITS.sessionFormats}
                onChange={(v) => set("sessionFormats", v)}
              />
              <OtherInput
                id="sessionFormatsOther"
                show={answers.sessionFormats.includes(OTHER)}
                label={t("q-session-formats")}
                value={answers.sessionFormatsOther}
                onChange={(v) => set("sessionFormatsOther", v)}
              />
            </Question>

            <Question
              label={t("q-community")}
              labelId="community-label"
              anchor="communityInvolvement"
              required
              wide
            >
              <MultiChips
                labelId="community-label"
                options={COMMUNITY_OPTIONS}
                values={answers.communityInvolvement}
                exclusive={["not-involved"]}
                onChange={(v) => set("communityInvolvement", v)}
              />
              <OtherInput
                id="communityInvolvementOther"
                show={answers.communityInvolvement.includes(OTHER)}
                label={t("q-community")}
                value={answers.communityInvolvementOther}
                onChange={(v) => set("communityInvolvementOther", v)}
              />
            </Question>

            <Question label={t("q-community-project")} htmlFor="communityProject" wide>
              <textarea
                id="communityProject"
                className="wizard-input wizard-textarea"
                rows={3}
                maxLength={200}
                value={answers.communityProject}
                onChange={(e) => set("communityProject", e.target.value)}
              />
            </Question>
          </WizardCard>
        </>
      )}

      {section === "links" && (
        <>
          <StepHeader
            title={t("links-heading")}
            current={index + 1}
            total={INTEREST_STEPS.length}
          />

          <WizardCard title={t("card-links")} icon={<Link2 />}>
            <div className="wizard-grid">
              <Question label={t("q-resume")} htmlFor="resume" hint={t("resume-hint")} wide>
                <ResumeUpload id="resume" initialResume={initialResume} />
              </Question>

              {LINKS.map(({ field, prefix, base, strip, placeholder }) => (
                <Question key={field} label={t(`q-${field}`)} htmlFor={field}>
                  <div className="wizard-input wizard-prefix">
                    <span className="wizard-prefix__text" aria-hidden="true">
                      {prefix}
                    </span>
                    <input
                      id={field}
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={placeholder}
                      value={answers[field].replace(strip, "")}
                      onChange={(e) => {
                        const handle = e.target.value.trim().replace(strip, "");
                        set(field, handle ? `${base}${handle}` : "");
                      }}
                    />
                  </div>
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
