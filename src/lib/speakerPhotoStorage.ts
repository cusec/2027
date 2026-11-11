import { randomUUID, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryEnabled } from "./imageStorage";
import type { SpeakerPhotoReceipt, SpeakerPhotoUpload } from "./speakerPhotoUpload";

const FOLDER = "cusec-2027/speakers";

function credentials() {
  if (!isCloudinaryEnabled()) throw new Error("photo-unavailable");
  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) throw new Error("photo-unavailable");
  return { cloudName: config.cloud_name, apiKey: config.api_key, apiSecret: config.api_secret };
}

export function signSpeakerPhotoUpload(speakerId: string): SpeakerPhotoUpload {
  const config = credentials();
  const parameters = {
    timestamp: String(Math.floor(Date.now() / 1000)),
    folder: FOLDER,
    public_id: `${speakerId}-${randomUUID()}`,
    overwrite: "false",
    format: "webp",
    allowed_formats: "jpg,jpeg,png,webp",
    transformation: "c_limit,h_2000,w_2000,q_auto:good",
  };
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    parameters,
    signature: cloudinary.utils.api_sign_request(parameters, config.apiSecret),
  };
}

/** The signed response binds the asset to this speaker. Derive its URL server-side. */
export function verifySpeakerPhoto(speakerId: string, receipt: SpeakerPhotoReceipt): { url: string; publicId: string } {
  const config = credentials();
  const prefix = `${FOLDER}/${speakerId}-`;
  if (!receipt || typeof receipt.publicId !== "string" || !receipt.publicId.startsWith(prefix) ||
    !/^[a-f0-9-]{36}$/.test(receipt.publicId.slice(prefix.length)) ||
    !Number.isSafeInteger(receipt.version) || receipt.version <= 0 ||
    typeof receipt.signature !== "string" || !/^[a-f0-9]{40}$/.test(receipt.signature)) {
    throw new Error("photo-invalid");
  }
  const expected = cloudinary.utils.api_sign_request({ public_id: receipt.publicId, version: receipt.version }, config.apiSecret);
  const received = Buffer.from(receipt.signature);
  const signed = Buffer.from(expected);
  if (received.length !== signed.length || !timingSafeEqual(received, signed)) throw new Error("photo-invalid");
  return {
    publicId: receipt.publicId,
    url: cloudinary.url(receipt.publicId, { secure: true, version: receipt.version, format: "webp", resource_type: "image", type: "upload" }),
  };
}
