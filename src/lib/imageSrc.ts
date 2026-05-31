/**
 * Resolve a stored image value into a usable `<img src>`.
 *
 * Supports both storage formats transparently:
 *   - Cloudinary URL (current)  → an absolute `http(s)` URL, used directly.
 *   - base64 in Mongo (legacy)  → raw base64 in `imageData` + MIME type in
 *     `imageContentType`, reassembled into a `data:` URI.
 *   - an already-assembled `data:` URI → used directly.
 *
 * Returns `null` when there is no usable image, so callers can guard rendering.
 *
 * Pure and dependency-free — safe to import from client components.
 */
export function resolveImageSrc(
  imageData?: string | null,
  imageContentType?: string | null,
): string | null {
  if (!imageData) return null;
  if (imageData.startsWith("http") || imageData.startsWith("data:")) {
    return imageData;
  }
  if (imageContentType) {
    return `data:${imageContentType};base64,${imageData}`;
  }
  return null;
}
