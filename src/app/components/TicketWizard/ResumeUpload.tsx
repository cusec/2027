"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText } from "lucide-react";

const RESUME_MAX_BYTES = 2 * 1024 * 1024;

export interface ResumeMeta {
  fileName: string;
  size: number;
  uploadedAt: string | null;
}

export default function ResumeUpload({
  id,
  initialResume,
}: {
  id: string;
  initialResume: ResumeMeta | null;
}) {
  const t = useTranslations("TicketWizard");
  const locale = useLocale();
  const [resume, setResume] = useState<ResumeMeta | null>(initialResume);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.type && file.type !== "application/pdf") {
      setError(t("resume-error-type"));
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setError(t("resume-error-size"));
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/demographics/resume", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.resume) {
        setResume(data.resume);
      } else {
        setError(
          data?.error === "too-large"
            ? t("resume-error-size")
            : data?.error === "not-pdf"
              ? t("resume-error-type")
              : t("resume-error-generic")
        );
      }
    } catch {
      setError(t("resume-error-generic"));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/demographics/resume", { method: "DELETE" });
      if (res.ok) setResume(null);
      else setError(t("resume-error-generic"));
    } catch {
      setError(t("resume-error-generic"));
    } finally {
      setBusy(false);
    }
  };

  const kb = (bytes: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes / 1024);

  return (
    <>
      {resume ? (
        <div className="wizard-file">
          <FileText aria-hidden="true" />
          <span className="wizard-file__name">
            {resume.fileName}
            <small>{t("resume-size", { size: kb(resume.size) })}</small>
          </span>
          <button
            type="button"
            className="wizard-file__action"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {t("resume-replace")}
          </button>
          <button type="button" className="wizard-file__action" disabled={busy} onClick={remove}>
            {t("resume-remove")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="wizard-input wizard-file__pick"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <FileText aria-hidden="true" />
          {busy ? t("resume-uploading") : t("resume-choose")}
        </button>
      )}
      <input
        ref={fileInput}
        id={id}
        className="wizard-file__input"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {busy && resume && <p className="wizard-q__hint">{t("resume-uploading")}</p>}
      {error && (
        <p className="wizard-form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
