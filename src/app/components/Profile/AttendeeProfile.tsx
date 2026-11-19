"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { AVATAR_POSES, type AvatarPose, type ProfileData } from "@/lib/profileSettings";
import { OPPORTUNITY_OPTIONS, TECH_AREA_OPTIONS, WORK_LOCATION_OPTIONS, WORK_ARRANGEMENT_OPTIONS, PRONOUN_OPTIONS, TRANSPORT_OPTIONS, YES_NO_UNSURE_OPTIONS, CONNECT_SCHOOL_OPTIONS, optionLabel, type Option } from "@/lib/ticketWizardOptions";
import VipUpgradeGuide from "./VipUpgradeGuide";
import ResumeUpload from "@/app/components/TicketWizard/ResumeUpload";
import CityPicker from "@/app/components/TicketWizard/CityPicker";
import PostalCodeField from "@/app/components/TicketWizard/PostalCodeField";
import { INSTITUTIONS } from "@/lib/institutions";
import { X, MapPin, LockKeyhole, ArrowUpRight } from "lucide-react";

type Panel = "sponsor" | "resume" | "travel" | "account" | "avatar" | "order" | "upgrade";
function ProfileDialog({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("AttendeeProfile");
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = original; };
  }, []);
  return <dialog ref={ref} className={`pass-dialog${wide ? " pass-dialog--upgrade" : ""}`} aria-labelledby="profile-dialog-heading"
    onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="pass-dialog__head"><h2 id="profile-dialog-heading">{title}</h2><button type="button" onClick={close} aria-label={t("close")}><X size={22} /></button></div>
    <div className="pass-dialog__body">{children}</div>
  </dialog>;
}

export default function AttendeeProfile({ initial, baseURL }: { initial: ProfileData; baseURL: string }) {
  const t = useTranslations("AttendeeProfile");
  const locale = useLocale();
  const tw = useTranslations("TicketWizard");
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sponsor, setSponsor] = useState(initial.sponsor);
  const [account, setAccount] = useState({ firstName: initial.firstName, lastName: initial.lastName, pronoun: initial.pronoun });
  const [travel, setTravel] = useState({ ...initial.travel, ...initial.travelPlans });
  const [upgrade, setUpgrade] = useState<{ configured: boolean; checkoutUrl: string; checkoutEmbedUrl: string | null; checkoutEmail: string } | null>(null);
  const [checkingVip, setCheckingVip] = useState(false);
  const [vipMessage, setVipMessage] = useState("");
  const [vipPhase, setVipPhase] = useState<"idle" | "updating" | "pending" | "confirmed">("idle");
  const vipCheckInFlight = useRef(false);
  const checkVip = useCallback(async () => {
    if (vipCheckInFlight.current) return;
    vipCheckInFlight.current = true;
    setCheckingVip(true); setVipMessage(t("vip-checking"));
    try {
      const response = await fetch("/api/vip/status", { method: "POST" });
      const result = await response.json();
      if (result.state !== "verified") { setVipMessage(t("vip-pending")); return; }
      if (result.isVip) setVipPhase(previous => previous === "updating" ? "confirmed" : previous);
      setData(d => ({ ...d, isVip: result.isVip }));
      setVipMessage(t(result.isVip ? "vip-confirmed" : "vip-not-found")); router.refresh();
    } catch { setVipMessage(t("vip-pending")); }
    finally { vipCheckInFlight.current = false; setCheckingVip(false); }
  }, [router, t]);
  useEffect(() => {
    if (vipPhase !== "updating" || data.isVip) return;
    // Confirmation closes the guide first; the ticket owns the asynchronous status.
    const verify = () => { if (!document.hidden) void checkVip(); };
    const first = window.setTimeout(verify, 1500);
    const timer = window.setInterval(verify, 6000);
    const stop = window.setTimeout(() => setVipPhase(phase => phase === "updating" ? "pending" : phase), 120000);
    return () => { window.clearTimeout(first); window.clearTimeout(stop); window.clearInterval(timer); };
  }, [vipPhase, data.isVip, checkVip]);
  useEffect(() => {
    if (panel !== "upgrade") return;
    let cancelled = false;
    fetch("/api/vip/status").then(r => r.ok ? r.json() : null).then(value => { if (!cancelled) { setUpgrade(value); if (value?.isVip) setData(d => ({ ...d, isVip: true })); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [panel]);
  const [pose, setPose] = useState<AvatarPose>(initial.avatarPose);
  const open = (next: Panel) => { setError(""); setSponsor(data.sponsor); setAccount({ firstName: data.firstName, lastName: data.lastName, pronoun: data.pronoun }); setPose(data.avatarPose); setTravel({ ...data.travel, ...data.travelPlans }); setPanel(next); };
  const close = () => { setPanel(null); setError(""); };
  const refresh = () => { router.refresh(); setNotice(t("saved")); };
  async function save(group: string, values: object): Promise<boolean> {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group, ...values }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error === "resume-required" ? t("roast-needs-resume") : result.field ? t("invalid-field", { field: result.field }) : t("error")); return false; }
      refresh(); return true;
    } catch { setError(t("error")); return false; }
    finally { setBusy(false); }
  }
  const submitSponsor = async (event: FormEvent) => { event.preventDefault(); if (await save("sponsor", sponsor)) { setData(d => ({ ...d, sponsor })); close(); } };
  const submitAccount = async (event: FormEvent) => { event.preventDefault(); if (await save("account", account)) { setData(d => ({ ...d, ...account, name: `${account.firstName} ${account.lastName}`.trim() })); close(); } };
  const options = (key: "opportunities" | "techAreas" | "workLocations", choices: Option[], max: number) => <fieldset className="pass-options"><legend>{t(key)}</legend>
    <p>{t("choose-up-to", { count: max })}</p>
    <div>{choices.map(option => <label key={option.value}><input type="checkbox" checked={sponsor[key].includes(option.value)}
      disabled={!sponsor[key].includes(option.value) && sponsor[key].length >= max}
      onChange={event => setSponsor(s => ({ ...s, [key]: event.target.checked ? (key === "opportunities" && option.value === "not-looking" ? [option.value] : [...s[key].filter(v => v !== "not-looking"), option.value]) : s[key].filter(v => v !== option.value) }))} />{optionLabel(option, locale)}</label>)}</div>
  </fieldset>;
  const pronoun = PRONOUN_OPTIONS.find(o => o.value === data.pronoun);

  return <main className="pass-profile">
    <header className="pass-profile__heading"><h1>{t("heading")}</h1><p>{t("subheading")}</p></header>
    <div className="pass-profile__grid">
      <section className="delegate-pass v2-glass" aria-label={t("delegate-card")}>
        <div className="delegate-pass__ribbon" aria-hidden="true">CUSEC 2027</div><div className="delegate-pass__clip" aria-hidden="true" />
        <div className="delegate-pass__top"><div><b>CUSEC 2027</b><p>{t("dates")}</p></div><span aria-hidden="true">XXVI</span></div>
        <div className="delegate-pass__body">
          <div className="delegate-pass__avatar"><div className="delegate-pass__platform" aria-hidden="true" />
            {/* The same Blender-rendered mascot assets used throughout the site. */}
            <Image src={`/assets/v2/cubear/cubear-${data.avatarPose}.webp`} alt={t("avatar-alt")} width={280} height={280} />
            <button className="pass-button pass-button--lime" onClick={() => open("avatar")}>{t("customize")}</button>
          </div>
          <h2>{data.name}</h2>{pronoun && data.pronoun !== "prefer-not" && <p className="delegate-pass__pronoun">{optionLabel(pronoun, locale)}</p>}
          <div className="delegate-pass__education"><strong>{data.school}</strong>
            <p>{[data.fieldOfStudy, data.graduation ? t("class-of", { year: data.graduation }) : ""].filter(Boolean).join(" · ") || t("education-empty")}</p>
          </div>
          <div className="delegate-pass__chips"><span>{data.role}</span><button type="button" disabled title={t("teams-soon")}>{t("teams-soon")}</button></div>
        </div>
      </section>
      <div className="pass-profile__details">
        <div className="profile-ticket-block">
        {vipPhase !== "idle" && <div className={`profile-ticket-update profile-ticket-update--${vipPhase}`} role="status">
          <span>{t(vipPhase === "confirmed" ? "vip-confirmed" : vipPhase === "pending" ? "vip-update-pending" : "vip-updating-ticket")}</span>
          {vipPhase === "pending" && <button className="pass-button" onClick={() => setVipPhase("updating")}>{t("vip-check")}</button>}
        </div>}
        <section className={`profile-ticket${data.isVip ? " profile-ticket--vip" : ""}`} aria-label={t("your-ticket")}>
          {data.isVip && <span className="profile-ticket__vip">{t("vip-badge")}</span>}
          <div className="profile-ticket__main"><p className="profile-eyebrow">{t("your-ticket")}</p>
            <div className="profile-ticket__name"><h2>{data.ticketName}</h2>{/early|lève/i.test(data.ticketName) && <span>{t("early-bird")}</span>}</div>
            <div className="profile-ticket__actions"><a href="/cusec-2027.ics" download className="pass-button pass-button--lime">{t("calendar")}</a><button className="pass-button pass-button--dark" onClick={() => open("order")}>{t("view-order")}</button>{!data.isVip && <button className="pass-button pass-button--dark" onClick={() => open("upgrade")}>{t("upgrade-vip")}</button>}</div>
          </div><div className="profile-ticket__stub" aria-hidden="true"><span>{t("admit-one")}</span><strong>XXVI</strong><b>CUSEC 2027</b></div>
        </section>
        </div>
        <section className="profile-hunt v2-glass" aria-label={t("your-hunt")}>
          <div><h2>{t("your-hunt")}</h2><p>{data.huntOpen ? t("found", { found: data.found, total: data.total }) : t("hunt-locked")}</p></div>
          {data.huntOpen ? <><div className="profile-hunt__stat"><strong>{data.points.toLocaleString(locale)}</strong><span>{t("points")}</span></div><div className="profile-hunt__stat"><strong>{data.rank ? `#${data.rank}` : "—"}</strong><span>{t("rank")}</span></div><Link href="/scavenger" className="pass-button">{t("open-hunt")}</Link></> : <span className="profile-hunt__locked"><LockKeyhole size={18} />{t("locked")}</span>}
        </section>
        <section className="profile-settings v2-glass" aria-label={t("settings")}>
          {data.isSponsor && <div className="profile-settings__row"><div><h2>{t("sponsor")}</h2><p>{data.sponsor.sponsorConsent ? t("sponsor-visible") : t("sponsor-private")}</p></div><button className="pass-button" onClick={() => open("sponsor")}>{t("edit")}</button></div>}
          <div className="profile-settings__row"><div><h2>{t("resume")}</h2><p>{data.resume?.fileName || t("resume-empty")}</p>{data.resumeRoast && <span className="profile-settings__tag">{t("roast-enabled")}</span>}</div><button className={`pass-button${!data.resume ? " pass-button--lime" : ""}`} onClick={() => open("resume")}>{t(data.resume ? "manage-resume" : "upload-resume")}</button></div>
          <div className="profile-settings__row"><div><h2>{t("travel")}</h2><p>{[data.travel.travelCity, data.travel.travelRegion, data.travel.travelCountry].filter(Boolean).join(", ")}</p></div><button className="pass-button" onClick={() => open("travel")}>{t("edit")}</button></div>
          <div className="profile-settings__row"><div><h2>{t("account")}</h2><p>{data.email}</p></div><button className="pass-button" onClick={() => open("account")}>{t("manage")}</button></div>
        </section>
        <p className="profile-notice" role="status">{notice}</p>
      </div>
    </div>
    {panel && <ProfileDialog title={t(panel === "avatar" ? "customize" : panel === "order" ? "order-details" : panel === "upgrade" ? "upgrade-vip" : panel)} close={close} wide={panel === "upgrade"}>
      {panel === "sponsor" && data.isSponsor && <form onSubmit={submitSponsor} className="pass-editor"><fieldset disabled={busy}>
        <label className="pass-check"><input type="checkbox" checked={sponsor.sponsorConsent} onChange={e => setSponsor(s => ({ ...s, sponsorConsent: e.target.checked }))} /><span>{t("sharing-consent")}<small>{t("sharing-hint")}</small></span></label>
        {options("opportunities", OPPORTUNITY_OPTIONS, 10)}
        {sponsor.opportunities.includes("other") && <label>{t("other-opportunities")}<input value={sponsor.opportunitiesOther} onChange={e => setSponsor(s => ({ ...s, opportunitiesOther: e.target.value }))} maxLength={200} /></label>}
        {options("techAreas", TECH_AREA_OPTIONS, 5)}
        {sponsor.techAreas.includes("other") && <label>{t("other-tech")}<input value={sponsor.techAreasOther} onChange={e => setSponsor(s => ({ ...s, techAreasOther: e.target.value }))} maxLength={200} /></label>}
        {options("workLocations", WORK_LOCATION_OPTIONS, 5)}
        <label>{t("arrangement")}<select value={sponsor.workArrangement} onChange={e => setSponsor(s => ({ ...s, workArrangement: e.target.value }))}><option value="">{t("choose")}</option>{WORK_ARRANGEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{optionLabel(o, locale)}</option>)}</select></label>
        {(["linkedinUrl", "githubUrl", "portfolioUrl"] as const).map(key => <label key={key}>{t(key)}<input type="url" value={sponsor[key]} onChange={e => setSponsor(s => ({ ...s, [key]: e.target.value }))} maxLength={500} /></label>)}
        <button className="pass-button pass-button--lime" type="submit">{t(busy ? "saving" : "save")}</button>
      </fieldset></form>}
      {panel === "resume" && <div className="pass-editor"><p>{t("resume-hint")}</p><ResumeUpload id="profile-resume" initialResume={data.resume}
        onChange={resume => { setData(d => ({ ...d, resume, resumeRoast: resume ? d.resumeRoast : false })); refresh(); }} />
        {data.resume && <a className="pass-editor__download" href="/api/demographics/resume" target="_blank" rel="noopener noreferrer">{t("view-resume")} <ArrowUpRight size={15} /></a>}
        <label className="pass-check"><input type="checkbox" checked={data.resumeRoast} disabled={busy || !data.resume} onChange={async event => { const resumeRoast = event.target.checked; if (await save("resume", { resumeRoast })) setData(d => ({ ...d, resumeRoast })); }} /><span>{t("roast-consent")}<small>{t("roast-hint")}</small></span></label>
        {!data.resume && <p className="pass-editor__hint">{t("roast-needs-resume")}</p>}
      </div>}
      {panel === "travel" && <form className="pass-editor" onSubmit={async event => { event.preventDefault(); if (await save("travel", travel)) { setData(d => ({ ...d, travel, travelPlans: travel })); close(); } }}><fieldset disabled={busy}>
        <div><label htmlFor="profile-travel-city">{tw("q-travel-from")}</label><CityPicker id="profile-travel-city" value={travel} onChange={patch => setTravel(v => ({ ...v, ...patch }))} /></div>
        <PostalCodeField country={travel.travelCountry} value={travel.postalCode} onChange={postalCode => setTravel(v => ({ ...v, postalCode }))} />
        {([["transport", TRANSPORT_OPTIONS, "q-transport"], ["delegation", YES_NO_UNSURE_OPTIONS, "q-delegation"], ["connectWithSchool", CONNECT_SCHOOL_OPTIONS, "q-connect-school"], ["travelFunding", YES_NO_UNSURE_OPTIONS, "q-travel-funding"], ["accommodation", YES_NO_UNSURE_OPTIONS, "q-accommodation"]] as const).map(([key, choices, label]) => <label key={key}>{tw(label)}<select value={travel[key]} onChange={e => setTravel(v => ({ ...v, [key]: e.target.value }))}><option value="">{t("choose")}</option>{choices.map(o => <option key={o.value} value={o.value}>{optionLabel(o, locale)}</option>)}</select></label>)}
        {travel.transport === "other" && <label>{tw("q-transport")}<input value={travel.transportOther} onChange={e => setTravel(v => ({ ...v, transportOther: e.target.value }))} maxLength={200} /></label>}
        {travel.delegation === "yes" && <label>{tw("q-delegation-school")}<select value={travel.delegationSchool} onChange={e => setTravel(v => ({ ...v, delegationSchool: e.target.value }))}><option value="">{t("choose")}</option>{INSTITUTIONS.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}<option value="other">{tw("q-school-other")}</option></select></label>}
        {travel.delegationSchool === "other" && <label>{tw("q-school-other")}<input value={travel.delegationOther} onChange={e => setTravel(v => ({ ...v, delegationOther: e.target.value }))} maxLength={200} /></label>}
        <button className="pass-button pass-button--lime" type="submit">{t(busy ? "saving" : "save")}</button>
      </fieldset></form>}
      {panel === "account" && <form className="pass-editor" onSubmit={submitAccount}><p>{data.email}</p><fieldset disabled={busy}>
        <label>{t("first-name")}<input required autoComplete="given-name" maxLength={100} value={account.firstName} onChange={e => setAccount(a => ({ ...a, firstName: e.target.value }))} /></label>
        <label>{t("last-name")}<input required autoComplete="family-name" maxLength={100} value={account.lastName} onChange={e => setAccount(a => ({ ...a, lastName: e.target.value }))} /></label>
        <label>{t("pronouns")}<select value={account.pronoun} onChange={e => setAccount(a => ({ ...a, pronoun: e.target.value }))}><option value="">{t("choose")}</option>{PRONOUN_OPTIONS.map(o => <option key={o.value} value={o.value}>{optionLabel(o, locale)}</option>)}</select></label>
        <button className="pass-button pass-button--lime" type="submit">{t(busy ? "saving" : "save")}</button>
        </fieldset><a className="pass-editor__download" href={`/auth/logout?returnTo=${encodeURIComponent(`${baseURL}/`)}`}>{t("sign-out")}</a></form>}
      {panel === "avatar" && <div className="pass-editor"><p>{t("choose-avatar")}</p><div className="pass-avatar-options">{AVATAR_POSES.map(value => <button key={value} type="button" disabled={busy} aria-pressed={value === pose} aria-label={t(`pose-${value}`)} onClick={() => setPose(value)}><Image src={`/assets/v2/cubear/cubear-${value}.webp`} alt="" width={100} height={100} /><span>{t(`pose-${value}`)}</span></button>)}</div>
        <button className="pass-button pass-button--lime" disabled={busy} onClick={async () => { if (await save("avatar", { avatarPose: pose })) { setData(d => ({ ...d, avatarPose: pose })); close(); } }}>{t(busy ? "saving" : "save")}</button></div>}
      {panel === "upgrade" && <VipUpgradeGuide checkout={upgrade} isVip={data.isVip} checking={checkingVip} message={vipMessage}
        purchased={() => { close(); setVipPhase("updating"); }} />}
      {panel === "order" && <div className="pass-editor"><dl className="profile-order"><div><dt>{t("your-ticket")}</dt><dd>{data.ticketName}</dd></div><div><dt>{t("account")}</dt><dd>{data.email}</dd></div>{data.orderId && <div><dt>{t("order-reference")}</dt><dd>{data.orderId}</dd></div>}{data.ticketId && <div><dt>{t("ticket-reference")}</dt><dd>{data.ticketId}</dd></div>}<div><dt>{t("dates-label")}</dt><dd>{t("dates")}</dd></div></dl><p>{t("order-hint")}</p></div>}
      {error && <p className="profile-error" role="alert">{error}</p>}
    </ProfileDialog>}
    <Link href="/" className="pass-profile__home">CUSEC 2027 <MapPin size={13} /> Montréal</Link>
  </main>;
}
