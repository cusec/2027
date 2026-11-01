"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
	CATEGORIES,
	MAX_ROOMS,
	toMinutes,
	trackSpan,
	tracksFor,
	type ScheduleDay,
	type Session,
	type Track,
} from "@/lib/schedule";

/*
 * The admin editor's two forms, each in a native <dialog> (focus trapping,
 * Escape and the backdrop come for free). Both send to the admin-only API and
 * hand control back through `onSaved`, which refreshes the server-rendered
 * schedule. The API re-validates everything with the same rules
 * (src/lib/schedule.ts), so the form only guides; it is never the guard.
 */

type SaveResult = { ok: true } | { ok: false; error: string };

async function send(url: string, method: string, body: unknown): Promise<SaveResult> {
	try {
		const response = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (response.ok) return { ok: true };
		const data = (await response.json().catch(() => null)) as { error?: string } | null;
		return { ok: false, error: data?.error ?? `Request failed (${response.status})` };
	} catch {
		return { ok: false, error: "Network error - check your connection and try again." };
	}
}

function useModal(open: boolean, onClose: () => void) {
	const ref = useRef<HTMLDialogElement>(null);
	const pressedOutside = useRef(false);
	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	// A click on the dimmed backdrop lands on the <dialog> itself (the form
	// fills it edge to edge), so that's "clicked outside". Both the press and
	// the release must be out there: dragging a text selection out of a field
	// also ends as a click on the dialog, and must not throw the edit away.
	const backdrop = {
		onMouseDown: (e: React.MouseEvent<HTMLDialogElement>) => {
			pressedOutside.current = e.target === e.currentTarget;
		},
		onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
			if (pressedOutside.current && e.target === e.currentTarget) onClose();
			pressedOutside.current = false;
		},
	};
	return { ref, backdrop };
}

/* ------------------------------------------------------------------------ */

export type SessionDraft = { day: ScheduleDay; session?: Session };

const emptyDay: ScheduleDay = { id: "", date: "", rooms: ["Main stage"], sessions: [] };

const hhmm = (minutes: number) =>
	`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const blankSession = (day: ScheduleDay): Omit<Session, "id"> => {
	// A new session starts where the day's latest one ends, which is usually
	// what comes next, and runs an hour.
	const ends = day.sessions.filter((s) => !s.afterHours).map((s) => toMinutes(s.end));
	const start = ends.length > 0 ? Math.min(Math.max(...ends), 22 * 60) : 9 * 60;
	return {
		start: hhmm(start),
		end: hhmm(start + 60),
		title: "",
		track: "A",
		category: "talk",
		afterHours: false,
	};
};

export function SessionDialog({
	draft,
	onClose,
	onSaved,
}: {
	draft: SessionDraft | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const t = useTranslations("V2.schedule");
	const { ref, backdrop } = useModal(draft !== null, onClose);
	const [form, setForm] = useState<Omit<Session, "id">>(() => blankSession(draft?.day ?? emptyDay));
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [lastDraft, setLastDraft] = useState<SessionDraft | null>(null);

	// Reset the form whenever a different session (or a fresh "add") opens.
	// Adjusting state while rendering, per React's guidance, rather than in an
	// effect.
	if (draft !== lastDraft) {
		setLastDraft(draft);
		if (draft) {
			setForm(draft.session ? { ...draft.session } : blankSession(draft.day));
			setError(null);
		}
	}

	if (!draft) return <dialog ref={ref} className="v2-sched-dialog" onClose={onClose} />;

	const { day, session } = draft;
	const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
		setForm((current) => ({ ...current, [key]: value }));

	const trackLabel = (track: Track) => {
		const [first, last] = trackSpan(track);
		if (day.rooms.length > 1 && first === 0 && last === day.rooms.length - 1) return t("admin.all-rooms");
		return day.rooms.slice(first, last + 1).join(" + ");
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		// <input type="time"> can't say 24:00; an after-hours end of 00:00 means midnight.
		const end = form.afterHours && form.end === "00:00" ? "24:00" : form.end;
		const result = await send("/api/schedule", session ? "PUT" : "POST", {
			dayId: day.id,
			sessionId: session?.id,
			session: { ...form, end },
		});
		setBusy(false);
		if (result.ok) onSaved();
		else setError(result.error);
	};

	const remove = async () => {
		if (!session || !window.confirm(t("admin.confirm-delete-session", { title: session.title }))) return;
		setBusy(true);
		const result = await send("/api/schedule", "DELETE", { dayId: day.id, sessionId: session.id });
		setBusy(false);
		if (result.ok) onSaved();
		else setError(result.error);
	};

	return (
		<dialog ref={ref} className="v2-sched-dialog" onClose={onClose} {...backdrop} aria-labelledby="sched-session-title">
			<form className="v2-sched-form" onSubmit={submit}>
				<h2 id="sched-session-title" className="v2-pixel">
					{session ? t("admin.edit-session") : t("admin.add-session")}
				</h2>

				<label>
					{t("admin.field-title")}
					<input required value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
				</label>
				<label>
					{t("admin.field-title-fr")}
					<input value={form.titleFr ?? ""} onChange={(e) => set("titleFr", e.target.value)} maxLength={200} />
				</label>
				<label>
					{t("admin.field-description")}
					<input
						value={form.description ?? ""}
						onChange={(e) => set("description", e.target.value)}
						placeholder={t("admin.field-description-hint")}
						maxLength={300}
					/>
				</label>
				<label>
					{t("admin.field-description-fr")}
					<input
						value={form.descriptionFr ?? ""}
						onChange={(e) => set("descriptionFr", e.target.value)}
						maxLength={300}
					/>
				</label>

				<div className="v2-sched-form__row">
					<label>
						{t("admin.field-start")}
						<input
							type="time"
							required
							min={form.afterHours ? undefined : "09:00"}
							max={form.afterHours ? undefined : "22:00"}
							value={form.start}
							onChange={(e) => set("start", e.target.value)}
						/>
					</label>
					<label>
						{t("admin.field-end")}
						<input
							type="time"
							required
							min={form.afterHours ? undefined : "09:00"}
							max={form.afterHours ? undefined : "22:00"}
							value={form.end === "24:00" ? "00:00" : form.end}
							onChange={(e) => set("end", e.target.value)}
						/>
					</label>
				</div>

				<label className="v2-sched-form__check">
					<input
						type="checkbox"
						checked={form.afterHours}
						onChange={(e) => set("afterHours", e.target.checked)}
					/>
					{t("admin.field-after-hours")}
				</label>

				<div className="v2-sched-form__row">
					<label>
						{t("admin.field-category")}
						<select
							value={form.category}
							onChange={(e) => set("category", e.target.value as Session["category"])}
						>
							{CATEGORIES.map((category) => (
								<option key={category} value={category}>
									{t(`category-${category}`)}
								</option>
							))}
						</select>
					</label>
					{form.afterHours ? null : (
						<label>
							{t("admin.field-rooms")}
							<select value={form.track} onChange={(e) => set("track", e.target.value as Track)}>
								{tracksFor(day.rooms.length).map((track) => (
									<option key={track} value={track}>
										{trackLabel(track)}
									</option>
								))}
							</select>
						</label>
					)}
				</div>

				<label>
					{t("admin.field-location")}
					<input
						value={form.location ?? ""}
						onChange={(e) => set("location", e.target.value)}
						placeholder={t("admin.field-location-hint")}
						maxLength={120}
					/>
				</label>
				<label>
					{t("admin.field-photo")}
					<input
						value={form.photo ?? ""}
						onChange={(e) => set("photo", e.target.value)}
						placeholder="https://… or /assets/…"
						maxLength={500}
					/>
				</label>

				{error ? (
					<p className="v2-sched-form__error" role="alert">
						{error}
					</p>
				) : null}

				<div className="v2-sched-form__actions">
					{session ? (
						<button type="button" className="v2-sched-form__danger" onClick={remove} disabled={busy}>
							{t("admin.delete")}
						</button>
					) : null}
					<button type="button" className="v2-sched-form__quiet" onClick={onClose} disabled={busy}>
						{t("admin.cancel")}
					</button>
					<button type="submit" className="v2-btn v2-btn--primary" disabled={busy}>
						{busy ? t("admin.saving") : t("admin.save")}
					</button>
				</div>
			</form>
		</dialog>
	);
}

/* ------------------------------------------------------------------------ */

/** `day` is the day being edited, or `"new"` to add one. */
export type DayDraft = { day: ScheduleDay | "new"; suggestedDate?: string };

export function DayDialog({
	draft,
	onClose,
	onSaved,
}: {
	draft: DayDraft | null;
	onClose: () => void;
	onSaved: (date?: string) => void;
}) {
	const t = useTranslations("V2.schedule");
	const { ref, backdrop } = useModal(draft !== null, onClose);
	const [date, setDate] = useState("");
	const [rooms, setRooms] = useState<string[]>(["", "", ""]);
	const [afterHoursFrom, setAfterHoursFrom] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [lastDraft, setLastDraft] = useState<DayDraft | null>(null);

	if (draft !== lastDraft) {
		setLastDraft(draft);
		if (draft) {
			const existing = draft.day === "new" ? null : draft.day;
			setDate(existing?.date ?? draft.suggestedDate ?? "");
			const names = existing?.rooms ?? ["Main stage"];
			setRooms(Array.from({ length: MAX_ROOMS }, (_, i) => names[i] ?? ""));
			setAfterHoursFrom(existing?.afterHoursFrom ?? "");
			setError(null);
		}
	}

	if (!draft) return <dialog ref={ref} className="v2-sched-dialog" onClose={onClose} />;
	const existing = draft.day === "new" ? null : draft.day;

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		const result = await send("/api/schedule/days", existing ? "PUT" : "POST", {
			dayId: existing?.id,
			day: { date, rooms: rooms.map((r) => r.trim()).filter(Boolean), afterHoursFrom },
		});
		setBusy(false);
		if (result.ok) onSaved(date);
		else setError(result.error);
	};

	const remove = async () => {
		if (!existing) return;
		if (!window.confirm(t("admin.confirm-delete-day", { count: existing.sessions.length }))) return;
		setBusy(true);
		const result = await send("/api/schedule/days", "DELETE", { dayId: existing.id });
		setBusy(false);
		if (result.ok) onSaved();
		else setError(result.error);
	};

	return (
		<dialog ref={ref} className="v2-sched-dialog" onClose={onClose} {...backdrop} aria-labelledby="sched-day-title">
			<form className="v2-sched-form" onSubmit={submit}>
				<h2 id="sched-day-title" className="v2-pixel">
					{existing ? t("admin.edit-day") : t("admin.add-day")}
				</h2>

				<label>
					{t("admin.field-date")}
					<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
				</label>

				<fieldset className="v2-sched-form__rooms">
					<legend>{t("admin.field-room-names")}</legend>
					<p>{t("admin.field-room-names-hint")}</p>
					{rooms.map((room, i) => (
						<input
							key={i}
							value={room}
							required={i === 0}
							aria-label={t("admin.field-room-n", { n: i + 1 })}
							placeholder={t("admin.field-room-n", { n: i + 1 })}
							onChange={(e) => setRooms((current) => current.map((r, j) => (j === i ? e.target.value : r)))}
							maxLength={60}
						/>
					))}
				</fieldset>

				<label>
					{t("admin.field-evening")}
					<input type="time" value={afterHoursFrom} onChange={(e) => setAfterHoursFrom(e.target.value)} />
				</label>

				{error ? (
					<p className="v2-sched-form__error" role="alert">
						{error}
					</p>
				) : null}

				<div className="v2-sched-form__actions">
					{existing ? (
						<button type="button" className="v2-sched-form__danger" onClick={remove} disabled={busy}>
							{t("admin.delete-day")}
						</button>
					) : null}
					<button type="button" className="v2-sched-form__quiet" onClick={onClose} disabled={busy}>
						{t("admin.cancel")}
					</button>
					<button type="submit" className="v2-btn v2-btn--primary" disabled={busy}>
						{busy ? t("admin.saving") : t("admin.save")}
					</button>
				</div>
			</form>
		</dialog>
	);
}
