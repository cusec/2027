/** Client-safe types and limits for signed, direct Cloudinary uploads. */
export const SPEAKER_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const SPEAKER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type SpeakerPhotoReceipt = {
  publicId: string;
  version: number;
  signature: string;
};

export type SpeakerPhotoUpload = {
  cloudName: string;
  apiKey: string;
  signature: string;
  parameters: Record<string, string>;
};

export async function uploadSpeakerPhotoDirect(file: File, upload: SpeakerPhotoUpload): Promise<SpeakerPhotoReceipt> {
  if (!file.size || !SPEAKER_PHOTO_TYPES.includes(file.type)) throw new Error("photo-invalid");
  if (file.size > SPEAKER_PHOTO_MAX_BYTES) throw new Error("photo-too-large");
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", upload.apiKey);
  body.set("signature", upload.signature);
  for (const [key, value] of Object.entries(upload.parameters)) body.set(key, value);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(upload.cloudName)}/image/upload`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(120_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 413 || /too large|maximum allowed/i.test(result?.error?.message ?? "")) {
      throw new Error("photo-too-large");
    }
    throw new Error("photo-upload-failed");
  }
  const expectedId = `${upload.parameters.folder}/${upload.parameters.public_id}`;
  if (result?.public_id !== expectedId || !Number.isSafeInteger(result.version) || typeof result.signature !== "string") {
    throw new Error("photo-upload-failed");
  }
  return { publicId: result.public_id, version: result.version, signature: result.signature };
}
