import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryEnabled } from "./imageStorage";

export const RESUME_MAX_BYTES = 2 * 1024 * 1024;

const FOLDER = "cusec-2027/resumes";

const publicIdFor = (userId: string) => `${FOLDER}/${userId}.pdf`;

export const resumeStorageEnabled = () => isCloudinaryEnabled();

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

export function resumeDownloadUrl(publicId: string): string {
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
}
