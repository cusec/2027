"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SITE_URL } from "@/lib/seo";
import { CATEGORIES, GRID_END, GRID_START, trackSpan, type ScheduleDay, type Session } from "@/lib/schedule";
import {
	buildIcs,
	formatHour,
	formatRange,
	formatTime,
	montrealNow,
	rowFor,
	SLOT_MINUTES,
	toMinutes,
} from "./scheduleTime";
import { DayDialog, SessionDialog, type DayDraft, type SessionDraft } from "./V2ScheduleAdmin";

/** Sessions this short put their time and detail on one line. */
const COMPACT_MINUTES = 35;
/** ...and under this, title and time share a single line */
const TINY_MINUTES = 30;
const TICK_MS = 30_000;

// The clock as an external store: the server snapshot is null, so the first
// paint has no "now" and hydration matches; the client then ticks every 30s.
const subscribe = (onTick: () => void) => {
	const id = window.setInterval(onTick, TICK_MS);
	return () => window.clearInterval(id);
};
const readTick = () => Math.floor(Date.now() / TICK_MS);
const readServerTick = () => null;

function useMontrealNow() {
	const tick = useSyncExternalStore(subscribe, readTick, readServerTick);
	return useMemo(() => (tick === null ? null : montrealNow(new Date(tick * TICK_MS))), [tick]);
}

function dayLabels(date: string, locale: string) {
	// noon UTC, so no time zone can push the date onto a neighbouring day
	const at = new Date(`${date}T12:00:00Z`);
	const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(at);
	return {
		number: at.getUTCDate(),
		weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
		month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(at),
	};
}

/** First start to last end of the whole day, after hours included. */
function daySpan(day: ScheduleDay) {
	if (day.sessions.length === 0) return null;
	return {
		start: Math.min(...day.sessions.map((s) => toMinutes(s.start))),
		end: Math.max(...day.sessions.map((s) => toMinutes(s.end))),
	};
}

/** The day after the last one, for the "add day" form. */
function nextDate(days: ScheduleDay[]) {
	if (days.length === 0) return "2027-01-07";
	const last = new Date(`${days[days.length - 1].date}T12:00:00Z`);
	last.setUTCDate(last.getUTCDate() + 1);
	return last.toISOString().slice(0, 10);
}

export default function V2Schedule({
	days,
	canEdit,
	loadFailed = false,
}: {
	days: ScheduleDay[];
	/** the visitor is a signed-in admin; the server decides, the API re-checks */
	canEdit: boolean;
	loadFailed?: boolean;
}) {
	const t = useTranslations("V2.schedule");
	const locale = useLocale();
	const router = useRouter();
	const now = useMontrealNow();
	const [refreshing, startRefresh] = useTransition();

	const [editing, setEditing] = useState(false);
	const [sessionDraft, setSessionDraft] = useState<SessionDraft | null>(null);
	const [dayDraft, setDayDraft] = useState<DayDraft | null>(null);

	// Picked by date, not position, so adding or removing a day keeps the
	// visitor on the same one. Until they pick, open on today's during the
	// conference.
	const [pickedDate, setPickedDate] = useState<string | null>(null);
	const todayIndex = now ? days.findIndex((d) => d.date === now.date) : -1;
	const pickedIndex = days.findIndex((d) => d.date === pickedDate);
	const active = pickedIndex >= 0 ? pickedIndex : Math.max(todayIndex, 0);
	const day: ScheduleDay | undefined = days[active];

	const text = (en: string, fr?: string) => (locale === "fr-CA" && fr ? fr : en);

	const refresh = (date?: string) => {
		setSessionDraft(null);
		setDayDraft(null);
		if (date) setPickedDate(date);
		startRefresh(() => router.refresh());
	};

	const downloadCalendar = () => {
		const ics = buildIcs(
			days.flatMap((d, i) => {
				const span = daySpan(d);
				return span
					? [
							{
								uid: `cusec-2027-${d.date}@2027.cusec.net`,
								date: d.date,
								...span,
								title: t("calendar-title", { n: i + 1 }),
								location: "Montréal, QC",
								url: `${SITE_URL}/schedule`,
							},
						]
					: [];
			}),
			new Date(),
		);
		const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "cusec-2027.ics";
		link.click();
		URL.revokeObjectURL(url);
	};

	const adminBar = canEdit ? (
		<div className="v2-sched-admin" aria-busy={refreshing}>
			<p>
				<strong>{t("admin.badge")}</strong> {editing ? t("admin.live-note") : t("admin.intro")}
			</p>
			<div className="v2-sched-admin__actions">
				{editing && day ? (
					<>
						<button type="button" onClick={() => setSessionDraft({ day })}>
							{t("admin.add-session")}
						</button>
						<button type="button" onClick={() => setDayDraft({ day })}>
							{t("admin.edit-day")}
						</button>
					</>
				) : null}
				{editing ? (
					<button type="button" onClick={() => setDayDraft({ day: "new", suggestedDate: nextDate(days) })}>
						{t("admin.add-day")}
					</button>
				) : null}
				<button
					type="button"
					className="v2-sched-admin__toggle"
					aria-pressed={editing}
					onClick={() => setEditing((v) => !v)}
				>
					{editing ? t("admin.done") : t("admin.edit")}
				</button>
			</div>
			{loadFailed ? (
				<p className="v2-sched-admin__warn" role="alert">
					{t("admin.load-failed")}
				</p>
			) : null}
		</div>
	) : null;

	const dialogs = canEdit ? (
		<>
			<SessionDialog draft={sessionDraft} onClose={() => setSessionDraft(null)} onSaved={() => refresh()} />
			<DayDialog draft={dayDraft} onClose={() => setDayDraft(null)} onSaved={refresh} />
		</>
	) : null;

	if (!day) {
		// Only an admin reaches here with no days; the page shows the public
		// "coming soon" itself.
		return (
			<section className="v2-section v2-subpage v2-sched">
				<div className="v2-container">
					{adminBar}
					<div className="v2-glass v2-subpage__panel v2-sched__empty">
						<p>{t("admin.no-days")}</p>
					</div>
				</div>
				{dialogs}
			</section>
		);
	}

	const isToday = now?.date === day.date;
	// The API keeps new sessions inside the grid; anything stored before that
	// rule is trimmed to it below, and dropped if it misses the grid entirely.
	const gridSessions = day.sessions
		.filter((s) => !s.afterHours && toMinutes(s.end) > GRID_START && toMinutes(s.start) < GRID_END)
		.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
	const evening = day.sessions
		.filter((s) => s.afterHours)
		.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
	const eveningFrom = day.afterHoursFrom ?? evening[0]?.start;

	// Fixed, not fitted to the day's sessions: every tab draws the same grid.
	const bounds = { start: GRID_START, end: GRID_END };
	const rows = (bounds.end - bounds.start) / SLOT_MINUTES;
	// +1: grid row 1 is the room headers
	const row = (minutes: number) => rowFor(minutes, bounds.start) + 1;

	const hours: number[] = [];
	for (let h = Math.ceil(bounds.start / 60) * 60; h < bounds.end; h += 60) hours.push(h);

	const showNow = isToday && now !== null && now.minutes >= bounds.start && now.minutes <= bounds.end;

	/** The room(s) a session is in, for phones; nothing when it spans every room. */
	const roomLabel = (session: Session) => {
		if (session.location) return session.location;
		const [first, last] = trackSpan(session.track);
		if (day.rooms.length > 1 && first === 0 && last === day.rooms.length - 1) return null;
		return day.rooms.slice(first, last + 1).join(" · ");
	};

	const editButton = (session: Session, title: string) =>
		editing ? (
			<button
				type="button"
				className="v2-sched__edit-hit"
				aria-label={t("admin.edit-named", { title })}
				onClick={() => setSessionDraft({ day, session })}
			/>
		) : null;

	return (
		<section className="v2-section v2-subpage v2-sched">
			<div className="v2-container">
				{adminBar}

				<div className={`v2-glass v2-subpage__panel v2-sched__panel${editing ? " is-editing" : ""}`}>
					<div className="v2-sched__days" role="group" aria-label={t("days-label")}>
						{days.map((d, i) => {
							const label = dayLabels(d.date, locale);
							const span = daySpan(d);
							return (
								<button
									key={d.id}
									type="button"
									className={`v2-sched__day${i === active ? " is-active" : ""}`}
									aria-pressed={i === active}
									onClick={() => setPickedDate(d.date)}
								>
									<span className="v2-sched__day-num v2-pixel" aria-hidden="true">
										{label.number}
									</span>
									<span className="v2-sched__day-name">
										<span className="v2-pixel">{label.weekday}</span>
										<small>{label.month}</small>
									</span>
									{span ? (
										<span className="v2-sched__day-hours">{formatRange(span.start, span.end, locale)}</span>
									) : null}
								</button>
							);
						})}
					</div>

					<div className="v2-sched__toolbar">
						<ul className="v2-sched__legend" aria-label={t("legend-label")}>
							{CATEGORIES.map((category) => (
								<li key={category}>
									<span className={`v2-sched__swatch v2-sched__swatch--${category}`} aria-hidden="true" />
									{t(`category-${category}`)}
								</li>
							))}
						</ul>
						<button type="button" className="v2-sched__calendar v2-pixel" onClick={downloadCalendar}>
							{t("add-to-calendar")}
						</button>
					</div>

					<div
						className="v2-sched__grid"
						style={{ "--rooms": day.rooms.length, "--rows": rows } as React.CSSProperties}
					>
						{day.rooms.map((room, i) => (
							<div key={`room-${i}`} className="v2-sched__room" style={{ gridColumn: i + 2, gridRow: 1 }}>
								{room}
							</div>
						))}

						{day.rooms.map((room, i) => (
							<div
								key={`track-${i}`}
								className="v2-sched__track"
								style={{ gridColumn: i + 2, gridRow: `2 / ${rows + 2}` }}
								aria-hidden="true"
							/>
						))}

						{hours.map((h) => (
							<span
								key={`label-${h}`}
								className="v2-sched__hour"
								style={{ gridColumn: 1, gridRow: row(h) }}
								aria-hidden="true"
							>
								{formatHour(h, locale)}
							</span>
						))}
						{hours
							.filter((h) => h > bounds.start)
							.map((h) => (
								<span
									key={`line-${h}`}
									className="v2-sched__line"
									style={{ gridColumn: "2 / -1", gridRow: row(h) }}
									aria-hidden="true"
								/>
							))}

						{gridSessions.map((session) => {
							const start = toMinutes(session.start);
							const end = toMinutes(session.end);
							const compact = end - start <= COMPACT_MINUTES;
							const tiny = end - start < TINY_MINUTES;
							const time = formatRange(start, end, locale);
							const title = text(session.title, session.titleFr);
							const detail = session.description ? text(session.description, session.descriptionFr) : null;
							const room = roomLabel(session);
							const [first, last] = trackSpan(session.track);
							const past = isToday && now !== null && end <= now.minutes;
							const top = Math.max(start, GRID_START);
							const bottom = Math.min(end, GRID_END);

							return (
								<article
									key={session.id}
									className={`v2-sched__session v2-sched__session--${session.category}${
										compact ? " is-compact" : ""
									}${tiny ? " is-tiny" : ""
									}${past ? " is-past" : ""}`}
									style={{ gridColumn: `${first + 2} / ${last + 3}`, gridRow: `${row(top)} / ${row(bottom)}` }}
								>
									<div className="v2-sched__session-text">
										<h3>{title}</h3>
										{room ? <p className="v2-sched__session-room">{room}</p> : null}
										{compact ? (
											<p>
												{time}
												{detail ? ` · ${detail}` : null}
											</p>
										) : (
											<>
												{detail ? <p>{detail}</p> : null}
												<p>{time}</p>
											</>
										)}
									</div>
									{session.photo ? (
										<span className="v2-sched__portrait" aria-hidden="true">
											<img src={session.photo} alt="" loading="lazy" />
										</span>
									) : null}
									{editButton(session, title)}
								</article>
							);
						})}

						{showNow ? (
							<div
								className="v2-sched__now"
								style={
									{
										gridColumn: "1 / -1",
										gridRow: row(now.minutes - (now.minutes % SLOT_MINUTES)),
										"--now-offset": (now.minutes % SLOT_MINUTES) / SLOT_MINUTES,
									} as React.CSSProperties
								}
							>
								<span className="v2-sched__now-label">
									<span className="v2-sr">{t("now")} </span>
									{formatTime(now.minutes, locale, false)}
								</span>
							</div>
						) : null}
					</div>
				</div>

				{evening.length > 0 && eveningFrom ? (
					<section className="v2-sched__after" aria-labelledby="after-hours">
						<header className="v2-sched__after-head">
							<h2 id="after-hours" className="v2-pixel">
								{t("after-hours")}
							</h2>
							<p>
								{t("after-hours-window", {
									day: dayLabels(day.date, locale).weekday,
									from: formatHour(toMinutes(eveningFrom), locale),
								})}
							</p>
						</header>
						<ul className="v2-sched__after-list">
							{evening.map((event) => {
								const title = text(event.title, event.titleFr);
								return (
									<li key={event.id}>
										<h3>{title}</h3>
										<p>
											<span className="v2-sched__after-time">
												{formatRange(toMinutes(event.start), toMinutes(event.end), locale)}
											</span>
											{event.location ?? (event.description ? text(event.description, event.descriptionFr) : null)}
										</p>
										{editButton(event, title)}
									</li>
								);
							})}
						</ul>
					</section>
				) : null}
			</div>
			{dialogs}
		</section>
	);
}
