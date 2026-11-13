"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ACTIONABLE, type AssignmentStatus, type ParseProblem, type PlannedLine } from "@/lib/ticketAssignment";

type Outcome = "linked" | "ticket-id-added" | "failed" | "skipped";
type Row = PlannedLine & { outcome?: Outcome };
type Response =
  | { ok: true; plan?: Row[]; results?: Row[]; problems: ParseProblem[]; ticketCount?: number }
  | { ok: false; error: string };

const TONE: Record<AssignmentStatus, "go" | "wait" | "stop" | "done"> = {
  ready: "go",
  "add-ticket-id": "go",
  done: "done",
  waiting: "wait",
  "code-not-found": "stop",
  "duplicate-code": "stop",
  "duplicate-email": "stop",
  "ticket-taken": "stop",
  "account-has-other-ticket": "stop",
  "email-taken": "stop",
};

async function post(text: string, apply: boolean): Promise<Response> {
  try {
    const res = await fetch("/api/admin/ticket-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apply }),
    });
    const data = (await res.json().catch(() => null)) as Response | { error?: string } | null;
    if (data && "ok" in data) return data;
    return { ok: false, error: (data as { error?: string } | null)?.error ?? `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "network" };
  }
}

/**
 * Paste -> Preview -> Apply. Apply is only offered for the exact text that
 * was previewed, and the server re-plans from fresh data before it writes.
 */
export default function TicketAssignmentTool() {
  const t = useTranslations("V2.ticketAssignments");
  const [text, setText] = useState("");
  const [previewedText, setPreviewedText] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [problems, setProblems] = useState<ParseProblem[]>([]);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fresh = previewedText === text;
  const actionable = fresh && !applied ? (rows ?? []).filter((r) => ACTIONABLE.has(r.status)).length : 0;

  const run = async (apply: boolean) => {
    setBusy(true);
    setError(null);
    const result = await post(text, apply);
    setBusy(false);
    if (!result.ok) {
      setError(result.error === "ticket-tailor-unavailable" ? t("error-ticket-tailor") : result.error === "network" ? t("error-network") : result.error);
      return;
    }
    setRows(result.results ?? result.plan ?? []);
    setProblems(result.problems);
    if (result.ticketCount !== undefined) setTicketCount(result.ticketCount);
    setPreviewedText(text);
    setApplied(apply);
  };

  const confirmApply = () => {
    if (window.confirm(t("confirm", { count: actionable }))) void run(true);
  };

  return (
    <div className="v2-assign">
      <label className="v2-assign__input">
        <span>{t("list-label")}</span>
        <small>{t("list-hint")}</small>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder="Sam Laquerre - samuel.laquerre@ucalgary.ca - Ek59veA"
        />
      </label>

      <div className="v2-assign__actions">
        <button type="button" className="v2-btn v2-btn--primary" disabled={busy || !text.trim()} onClick={() => void run(false)}>
          {busy ? t("working") : t("preview")}
        </button>
        {actionable > 0 ? (
          <button type="button" className="v2-btn v2-assign__apply" disabled={busy} onClick={confirmApply}>
            {t("apply", { count: actionable })}
          </button>
        ) : null}
      </div>

      {error ? <p className="v2-campaign__error" role="alert">{error}</p> : null}

      {rows ? (
        <section className="v2-assign__results" aria-live="polite">
          <p className="v2-campaign__note">
            {applied ? t("applied-note") : t("preview-note", { tickets: ticketCount ?? 0 })}
            {!fresh ? ` ${t("stale")}` : null}
          </p>
          {problems.length > 0 ? (
            <ul className="v2-assign__problems">
              {problems.map((p) => (
                <li key={p.line}>{t(`problem-${p.reason}`, { line: p.line })}: <code>{p.text}</code></li>
              ))}
            </ul>
          ) : null}
          <div className="v2-assign__table-wrap">
            <table className="v2-assign__table">
              <thead>
                <tr>
                  <th>{t("col-line")}</th>
                  <th>{t("col-person")}</th>
                  <th>{t("col-code")}</th>
                  <th>{t("col-status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td>
                      <strong>{row.name || "-"}</strong>
                      <span>{row.email}</span>
                    </td>
                    <td><code>{row.code}</code></td>
                    <td>
                      <span className={`v2-assign__chip v2-assign__chip--${row.outcome === "failed" ? "stop" : TONE[row.status]}`}>
                        {row.outcome && row.outcome !== "skipped" ? t(`outcome-${row.outcome}`) : t(`status-${row.status}`)}
                      </span>
                      {row.suggestion ? <small>{t("suggestion", { code: row.suggestion })}</small> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
