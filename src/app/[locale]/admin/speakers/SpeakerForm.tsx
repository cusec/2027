"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import type { SpeakerRecord } from "@/lib/speakers";
import { prepareSpeakerPhoto, saveSpeaker, type SaveState } from "./actions";

import { SPEAKER_PHOTO_MAX_BYTES, SPEAKER_PHOTO_TYPES, uploadSpeakerPhotoDirect, type SpeakerPhotoReceipt } from "@/lib/speakerPhotoUpload";

export default function SpeakerForm({ speaker, id }: { speaker?: SpeakerRecord; id: string }) {
  const t = useTranslations("V2.speakerAdmin");
  const topics = useTranslations("V2.speakers");
  const [values, setValues] = useState(() => ({
    bio: speaker?.bio ?? "", socials: speaker?.socials ?? "",
    name: speaker?.name ?? "", role: speaker?.role ?? "", roleFr: speaker?.roleFr ?? "",
    talk: speaker?.talk ?? "", talkFr: speaker?.talkFr ?? "", photo: speaker?.photo ?? "",
    focus: speaker?.focus ?? "50% 50%", kind: speaker?.kind ?? "speaker", topic: speaker?.topic ?? "web",
    order: String(speaker?.order ?? 0), abstract: speaker?.abstract ?? "", abstractFr: speaker?.abstractFr ?? "",
  }));
  const [published, setPublished] = useState(speaker?.published ?? false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadedPhoto = useRef<SpeakerPhotoReceipt | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function clearSelection() {
    uploadedPhoto.current = null;
    setSelectedPhoto(null);
    setPreviewUrl("");
    setPhotoError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(previous: SaveState, form: FormData): Promise<SaveState> {
    // Never include the file in the Next.js action request.
    form.delete("headshot");
    try {
      if (selectedPhoto) {
        if (!uploadedPhoto.current) {
          setUploading(true);
          const prepared = await prepareSpeakerPhoto(id, String(form.get("version") ?? ""));
          if (prepared.status !== "ready") return { status: prepared.status };
          uploadedPhoto.current = await uploadSpeakerPhotoDirect(selectedPhoto, prepared.upload);
        }
        form.set("headshotUpload", JSON.stringify(uploadedPhoto.current));
      }
      setUploading(false);
      const result = await saveSpeaker(previous, form);
      if (result.status === "saved") {
        setValues(current => ({ ...current, photo: result.photo ?? current.photo }));
        clearSelection();
      }
      return result;
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "photo-too-large" || code === "photo-invalid" || code === "photo-upload-failed") return { status: code };
      return { status: "error" };
    } finally {
      setUploading(false);
    }
  }

  const [state, action, pending] = useActionState<SaveState, FormData>(submit, { status: "idle" });
  const textFields = ["name", "role", "roleFr", "talk", "talkFr", "focus"] as const;

  function changeField(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > SPEAKER_PHOTO_MAX_BYTES) {
      setPhotoError("photo-too-large");
      event.target.value = "";
      return;
    }
    if (!SPEAKER_PHOTO_TYPES.includes(file.type) || file.size === 0) {
      setPhotoError("photo-invalid");
      event.target.value = "";
      return;
    }
    setPhotoError("");
    uploadedPhoto.current = null;
    setSelectedPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const photo = previewUrl || values.photo;

  return (
    <form action={action} className="v2-speaker-editor">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={speaker?.__v ?? ""} />
      <fieldset className="v2-speaker-editor__fieldset" disabled={pending}>
        <div className="v2-speaker-editor__headshot">
          {photo && <img className="v2-speaker-editor__preview" src={photo} alt={t("photo-preview")}
            style={{ objectPosition: values.focus }} />}
          <div className="v2-speaker-editor__photo-controls">
            <label>{t("upload-photo")}
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={choosePhoto} aria-describedby={`photo-hint-${id}`} />
            </label>
            <p id={`photo-hint-${id}`} className="v2-campaign__note">{t("upload-photo-hint")}</p>
            {selectedPhoto && <p role="status">{t("photo-selected", { name: selectedPhoto.name })}</p>}
            {selectedPhoto && <button type="button" className="v2-admin__tool-action" onClick={clearSelection}>{t("cancel-photo")}</button>}
            {photo && <button type="button" className="v2-admin__tool-action" onClick={() => {
              clearSelection();
              setValues(current => ({ ...current, photo: "" }));
            }}>{t("remove-photo")}</button>}
            {photoError && <p role="alert">{t(photoError)}</p>}
          </div>
        </div>
        <div className="v2-speaker-editor__fields">
          {textFields.map(field => <label key={field}>{t(field)}
            <input name={field} value={values[field]} onChange={changeField}
              required={field === "name" || field === "role"}
              maxLength={field === "focus" ? 30 : field === "name" ? 120 : 240} />
          </label>)}
          <label>{t("kind")}<select name="kind" value={values.kind} onChange={changeField}>
            <option value="speaker">{t("speaker")}</option><option value="keynote">{t("keynote")}</option>
          </select></label>
          <label>{t("topic")}<select name="topic" value={values.topic} onChange={changeField}>
            {["ai-ml", "systems", "web", "career", "security", "design", "oss", "grad"].map(topic => (
              <option key={topic} value={topic}>{topics(`topic-${topic}`)}</option>
            ))}
          </select></label>
          <label>{t("order")}<input name="order" type="number" min="0" max="9999" step="1" required
            value={values.order} onChange={changeField} /></label>
        </div>
        <details>
          <summary>{t("photo-url-option")}</summary>
          <label>{t("photo")}<input name="photo" value={values.photo} onChange={changeField} maxLength={1000} readOnly={!!selectedPhoto} /></label>
          <p className="v2-campaign__note">{t("photo-hint")}</p>
        </details>
        <p className="v2-campaign__note">{t("translation-hint")}</p>
        {(["bio", "socials", "abstract", "abstractFr"] as const).map(field => <label key={field}>{t(field)}
          <textarea name={field} value={values[field]} onChange={changeField} maxLength={field === "bio" ? 12000 : 4000} rows={4} />
        </label>)}
        {speaker?.importNotes && <p role="note">{t("import-notes")} {speaker.importNotes}</p>}
        {speaker?.sourceHeadshotUrl && <a href={speaker.sourceHeadshotUrl} target="_blank" rel="noopener noreferrer">{t("source-headshot")}</a>}
        <label className="v2-speaker-editor__publish"><input type="checkbox" name="published" checked={published}
          onChange={event => setPublished(event.target.checked)} />{t("published")}</label>
        <button className="v2-btn v2-btn--primary" disabled={pending}>{uploading ? t("uploading-photo") : pending ? t("saving") : t("save")}</button>
      </fieldset>
      {state.status !== "idle" && <p role={state.status === "saved" ? "status" : "alert"}>{t(state.status)}</p>}
    </form>
  );
}
