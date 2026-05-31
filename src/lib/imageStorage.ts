import { v2 as cloudinary } from "cloudinary";

/**
 * Server-side image storage for the scavenger hunt (hunt-item QR codes, shop
 * prizes, and collectibles).
 *
 * When Cloudinary credentials are present, images are uploaded to Cloudinary
 * under a CUSEC-2027-only root folder (`cusec-2027/...`) so this year's assets
 * stay isolated from previous years on the same shared Cloudinary account — no
 * new account or extra storage purchase required. When credentials are absent,
 * every helper transparently falls back to the legacy "base64 in Mongo"
 * behaviour, so local dev and builds work with zero configuration.
 *
 * Required env (any one set enables Cloudinary):
 *   - CLOUDINARY_URL                                   (single connection string), or
 *   - CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 */

/** Root folder that isolates every 2027 asset on the shared Cloudinary account. */
const CUSEC_2027_ROOT = "cusec-2027";

/** Hard cap on stored photo dimensions; larger images scale down (aspect kept). */
const MAX_DIMENSION = 2000;

let configured: boolean | null = null;

/** Detect Cloudinary configuration once (memoized). */
export function isCloudinaryEnabled(): boolean {
  if (configured !== null) return configured;

  if (process.env.CLOUDINARY_URL) {
    // The SDK reads CLOUDINARY_URL from the environment automatically.
    configured = true;
  } else if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  } else {
    configured = false;
  }

  return configured;
}

interface UploadOptions {
  /** Stored format. Photos → "webp" (small); QR codes → "png" (kept crisp). */
  format: "webp" | "png";
  /** Downscale + quality-optimize. Disabled for QR codes to avoid artifacts. */
  optimize: boolean;
}

async function uploadToCloudinary(
  dataUri: string,
  folder: string,
  { format, optimize }: UploadOptions,
): Promise<string> {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `${CUSEC_2027_ROOT}/${folder}`,
    resource_type: "image",
    format,
    transformation: optimize
      ? [
          {
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            crop: "limit",
            quality: "auto:good",
          },
        ]
      : undefined,
  });
  return result.secure_url;
}

/**
 * Store a user-uploaded photo (shop prizes / collectibles).
 *
 * Accepts the shape the admin forms send: raw base64 (no `data:` prefix) plus
 * its MIME type. Returns the `{ imageData, imageContentType }` pair to persist:
 *   - Cloudinary on  → uploads a compressed WebP under `cusec-2027/<folder>`;
 *     `imageData` becomes the secure URL and `imageContentType` becomes
 *     `"image/webp"`.
 *   - Cloudinary off → returns the base64 + content type unchanged (legacy).
 *   - Already a URL (unchanged image on edit) / empty / upload failure →
 *     returns the input unchanged.
 */
export async function storePhoto(
  imageData: string | null | undefined,
  imageContentType: string | null | undefined,
  folder: string,
): Promise<{ imageData: string | null; imageContentType: string | null }> {
  const data = imageData ?? null;
  const contentType = imageContentType ?? null;

  if (!data) return { imageData: data, imageContentType: contentType };
  // Already stored remotely (e.g. editing an item without changing its image).
  if (data.startsWith("http")) return { imageData: data, imageContentType: contentType };
  if (!isCloudinaryEnabled()) return { imageData: data, imageContentType: contentType };

  const dataUri = data.startsWith("data:")
    ? data
    : `data:${contentType || "image/png"};base64,${data}`;

  try {
    const url = await uploadToCloudinary(dataUri, folder, {
      format: "webp",
      optimize: true,
    });
    return { imageData: url, imageContentType: "image/webp" };
  } catch (error) {
    console.error("[imageStorage] photo upload failed; storing inline:", error);
    return { imageData: data, imageContentType: contentType };
  }
}

/**
 * Store a generated QR code (hunt items). Input is a PNG `data:` URI.
 *
 *   - Cloudinary on  → uploads as PNG (no compression, kept crisp for printing)
 *     under `cusec-2027/qr-codes`; returns the secure URL.
 *   - Cloudinary off / empty / already a URL / upload failure → returns input.
 */
export async function storeQrCode(
  dataUri: string | null | undefined,
  folder = "qr-codes",
): Promise<string | null | undefined> {
  if (!dataUri || dataUri.startsWith("http")) return dataUri;
  if (!isCloudinaryEnabled()) return dataUri;

  try {
    return await uploadToCloudinary(dataUri, folder, {
      format: "png",
      optimize: false,
    });
  } catch (error) {
    console.error("[imageStorage] QR upload failed; storing inline:", error);
    return dataUri;
  }
}
