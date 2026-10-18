"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { pick } from "@/lib/localized";
import { SITE_URL } from "@/lib/seo";
import { CATEGORIES, SCHEDULE, type ScheduleDay } from "./scheduleData";
import {
	buildIcs,
	formatHour,
	formatRange,
	formatTime,
	gridBounds,
	montrealNow,
	rowFor,
	SLOT_MINUTES,
	toMinutes,
} from "./scheduleTime";

/** Sessions this short put their time and detail on one line. */
const COMPACT_MINUTES = 35;
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
	const all = [...day.sessions, ...(day.afterHours?.events ?? [])];
	return {
		start: Math.min(...all.map((s) => toMinutes(s.start))),
		end: Math.max(...all.map((s) => toMinutes(s.end))),
	};
}

export default function V2Schedule() {
	const t = useTranslations("V2.schedule");
	const locale = useLocale();
	const now = useMontrealNow();

	// Until a visitor picks a day, open on today's during the conference.
	const [picked, setPicked] = useState<number | null>(null);
	const todayIndex = now ? SCHEDULE.findIndex((d) => d.date === now.date) : -1;
	const active = picked ?? Math.max(todayIndex, 0);
	const day = SCHEDULE[active];
	const isToday = now?.date === day.date;

	const bounds = gridBounds(day.sessions);
	const rows = (bounds.end - bounds.start) / SLOT_MINUTES;
	// +1: grid row 1 is the room headers
	const row = (minutes: number) => rowFor(minutes, bounds.start) + 1;
	const roomIndex = new Map(day.rooms.map((room, i) => [room.id, i]));
	const sessions = [...day.sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

	const hours: number[] = [];
	for (let h = Math.ceil(bounds.start / 60) * 60; h < bounds.end; h += 60) hours.push(h);

	const showNow = isToday && now !== null && now.minutes >= bounds.start && now.minutes <= bounds.end;

	const downloadCalendar = () => {
		const ics = buildIcs(
			SCHEDULE.map((d, i) => ({
				uid: `cusec-2027-day-${i + 1}@2027.cusec.net`,
				date: d.date,
				...daySpan(d),
				title: t("calendar-title", { n: i + 1 }),
				location: "Montréal, QC",
				url: `${SITE_URL}/schedule`,
			})),
			new Date(),
		);
		const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "cusec-2027.ics";
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<section className="v2-section v2-subpage v2-sched">
			<div className="v2-container">
				<div className="v2-glass v2-subpage__panel v2-sched__panel">
					<div className="v2-sched__days" role="group" aria-label={t("days-label")}>
						{SCHEDULE.map((d, i) => {
							const label = dayLabels(d.date, locale);
							const span = daySpan(d);
							return (
								<button
									key={d.date}
									type="button"
									className={`v2-sched__day${i === active ? " is-active" : ""}`}
									aria-pressed={i === active}
									onClick={() => setPicked(i)}
								>
									<span className="v2-sched__day-num v2-pixel" aria-hidden="true">
										{label.number}
									</span>
									<span className="v2-sched__day-name">
										<span className="v2-pixel">{label.weekday}</span>
										<small>{label.month}</small>
									</span>
									<span className="v2-sched__day-hours">
										{formatRange(span.start, span.end, locale)}
									</span>
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
							<div
								key={room.id}
								className="v2-sched__room"
								style={{ gridColumn: i + 2, gridRow: 1 }}
							>
								{pick(room.name, locale)}
							</div>
						))}

						{day.rooms.map((room, i) => (
							<div
								key={`track-${room.id}`}
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

						{sessions.map((session, i) => {
							const start = toMinutes(session.start);
							const end = toMinutes(session.end);
							const compact = end - start <= COMPACT_MINUTES;
							const time = formatRange(start, end, locale);
							const detail = session.detail ? pick(session.detail, locale) : null;
							const room = day.rooms.find((r) => r.id === session.room);
							const column =
								session.room === "all" ? "2 / -1" : String((roomIndex.get(session.room) ?? 0) + 2);
							const past = isToday && now !== null && end <= now.minutes;

							return (
								<article
									key={`${session.start}-${session.room}-${i}`}
									className={`v2-sched__session v2-sched__session--${session.category}${
										compact ? " is-compact" : ""
									}${past ? " is-past" : ""}`}
									style={{ gridColumn: column, gridRow: `${row(start)} / ${row(end)}` }}
								>
									<div className="v2-sched__session-text">
										<h3>{pick(session.title, locale)}</h3>
										{room ? <p className="v2-sched__session-room">{pick(room.name, locale)}</p> : null}
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
									{session.portrait ? (
										<span className="v2-sched__portrait" aria-hidden="true">
											{session.portrait.src ? <img src={session.portrait.src} alt="" loading="lazy" /> : null}
										</span>
									) : null}
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

				{day.afterHours ? (
					<section className="v2-sched__after" aria-labelledby="after-hours">
						<header className="v2-sched__after-head">
							<h2 id="after-hours" className="v2-pixel">
								{t("after-hours")}
							</h2>
							<p>
								{t("after-hours-window", {
									day: dayLabels(day.date, locale).weekday,
									from: formatHour(toMinutes(day.afterHours.from), locale),
								})}
							</p>
						</header>
						<ul className="v2-sched__after-list">
							{day.afterHours.events.map((event, i) => (
								<li key={`${event.start}-${i}`}>
									<h3>{pick(event.title, locale)}</h3>
									<p>
										<span className="v2-sched__after-time">
											{formatRange(toMinutes(event.start), toMinutes(event.end), locale)}
										</span>
										{pick(event.location, locale)}
									</p>
								</li>
							))}
						</ul>
					</section>
				) : null}
			</div>
		</section>
	);
}
