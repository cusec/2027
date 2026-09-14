import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryEnabled } from "./imageStorage";

/**
 * Résumé storage for the attendee profile.
 *
 * Résumés live in Cloudinary rather than MongoDB: the database is on the free
 * 512 MB tier, and a few hundred PDFs would fill it. They are uploaded as
 * `authenticated` raw files, so no public URL exists; the only way to fetch
 * one is a short-lived signed download link, which only the admin route
 * hands out.
 *
 * Each delegate has exactly one path, keyed by their user id, so uploading
 * again replaces the old file instead of leaving it behind.
 */

export const RESUME_MAX_BYTES = 2 * 1024 * 1024;

const FOLDER = "cusec-2027/resumes";

const publicIdFor = (userId: string) => `${FOLDER}/${userId}.pdf`;

/** Whether uploads can work at all in this environment. */
export const resumeStorageEnabled = () => isCloudinaryEnabled();

/** A real PDF starts with "%PDF-", whatever its name or claimed type says. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export async function uploadResume(userId: string, bytes: Uint8Array): Promise<string> {
  const publicId = publicIdFor(userId);
  await new Promise<void>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "raw",
        type: "authenticated",
        overwrite: true,
        invalidate: true,
      },
      (error) => (error ? reject(error) : resolve())
    );
    stream.end(Buffer.from(bytes));
  });
  return publicId;
}

export async function deleteResume(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });
}

/** A download link that stops working after a minute. */
export function resumeDownloadUrl(publicId: string): string {
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
}
