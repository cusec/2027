import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPEAKER_PHOTO_MAX_BYTES, uploadSpeakerPhotoDirect, type SpeakerPhotoUpload } from "../speakerPhotoUpload";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), config: vi.fn(), sign: vi.fn(), url: vi.fn() }));
vi.mock("cloudinary", () => ({ v2: {
  config: mocks.config, uploader: { upload: mocks.upload },
  utils: { api_sign_request: mocks.sign }, url: mocks.url,
} }));
const id = "507f1f77bcf86cd799439011";
const publicId = `cusec-2027/speakers/${id}-11111111-1111-4111-8111-111111111111`;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("CLOUDINARY_URL", "cloudinary://test-key:test-secret@team");
  mocks.config.mockReturnValue({ cloud_name: "team", api_key: "test-key", api_secret: "test-secret" });
  mocks.sign.mockImplementation((params, secret) => createHash("sha1").update(JSON.stringify(params) + secret).digest("hex"));
  mocks.url.mockReturnValue("https://res.cloudinary.com/team/image/upload/v123/portrait.webp");
  mocks.upload.mockResolvedValue({ secure_url: "https://res.cloudinary.com/team/portrait.webp", public_id: publicId });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("signed speaker image storage", () => {
  it("signs a unique, non-overwriting image in the speaker folder", async () => {
    const { signSpeakerPhotoUpload } = await import("../speakerPhotoStorage");
    const first = signSpeakerPhotoUpload(id);
    const second = signSpeakerPhotoUpload(id);
    expect(first.parameters).toMatchObject({ folder: "cusec-2027/speakers", overwrite: "false", format: "webp", transformation: "c_limit,h_2000,w_2000,q_auto:good" });
    expect(first.parameters.public_id).toMatch(new RegExp(`^${id}-`));
    expect(first.parameters.public_id).not.toBe(second.parameters.public_id);
    expect(first).not.toHaveProperty("apiSecret");
  });

  it("verifies the response and constructs the delivery URL on the server", async () => {
    const { verifySpeakerPhoto } = await import("../speakerPhotoStorage");
    const signature = mocks.sign({ public_id: publicId, version: 123 }, "test-secret");
    expect(verifySpeakerPhoto(id, { publicId, version: 123, signature })).toEqual({ publicId, url: "https://res.cloudinary.com/team/image/upload/v123/portrait.webp" });
    expect(mocks.url).toHaveBeenCalledWith(publicId, expect.objectContaining({ version: 123, secure: true, format: "webp" }));
  });

  it("rejects tampered signatures and assets belonging to other speakers or folders", async () => {
    const { verifySpeakerPhoto } = await import("../speakerPhotoStorage");
    const signature = mocks.sign({ public_id: publicId, version: 123 }, "test-secret");
    expect(() => verifySpeakerPhoto(id, { publicId, version: 124, signature })).toThrow("photo-invalid");
    expect(() => verifySpeakerPhoto("another-speaker", { publicId, version: 123, signature })).toThrow("photo-invalid");
    expect(() => verifySpeakerPhoto(id, { publicId: "cusec-2027/shop/prize", version: 123, signature })).toThrow("photo-invalid");
    expect(() => verifySpeakerPhoto(id, { publicId, version: 123, signature: "bad" })).toThrow("photo-invalid");
  });

  it("preserves inline storage for other image callers", async () => {
    vi.stubEnv("CLOUDINARY_URL", "");
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    const { storePhoto } = await import("../imageStorage");
    expect(await storePhoto("base64-data", "image/png", "shop")).toEqual({ imageData: "base64-data", imageContentType: "image/png" });
  });

  it("preserves photo and QR URL return values", async () => {
    const { storePhoto, storeQrCode } = await import("../imageStorage");
    expect(await storePhoto("base64-data", "image/png", "shop")).toEqual({ imageData: "https://res.cloudinary.com/team/portrait.webp", imageContentType: "image/webp" });
    expect(await storeQrCode("data:image/png;base64,abc")).toBe("https://res.cloudinary.com/team/portrait.webp");
  });
});

const upload: SpeakerPhotoUpload = {
  cloudName: "team", apiKey: "public-key", signature: "upload-signature",
  parameters: { folder: "cusec-2027/speakers", public_id: `${id}-11111111-1111-4111-8111-111111111111` },
};

describe("direct browser upload", () => {
  it("sends an image larger than 3 MB directly to Cloudinary", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ public_id: publicId, version: 123, signature: "response-signature" }) });
    vi.stubGlobal("fetch", request);
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "large.png", { type: "image/png" });
    expect(await uploadSpeakerPhotoDirect(file, upload)).toEqual({ publicId, version: 123, signature: "response-signature" });
    expect(request).toHaveBeenCalledWith("https://api.cloudinary.com/v1_1/team/image/upload", expect.objectContaining({ method: "POST" }));
    const body = request.mock.calls[0][1].body as FormData;
    expect((body.get("file") as File).size).toBe(file.size);
    expect(body.get("api_key")).toBe("public-key");
    expect(body.get("signature")).toBe("upload-signature");
  });

  it("rejects oversized, empty, and unsupported files before any network request", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(uploadSpeakerPhotoDirect(new File([new Uint8Array(SPEAKER_PHOTO_MAX_BYTES + 1)], "large.png", { type: "image/png" }), upload)).rejects.toThrow("photo-too-large");
    await expect(uploadSpeakerPhotoDirect(new File([], "empty.png", { type: "image/png" }), upload)).rejects.toThrow("photo-invalid");
    await expect(uploadSpeakerPhotoDirect(new File(["svg"], "image.svg", { type: "image/svg+xml" }), upload)).rejects.toThrow("photo-invalid");
    expect(request).not.toHaveBeenCalled();
  });

  it("reports provider failures and rejects responses for a different asset", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal("fetch", request);
    const file = new File(["png"], "photo.png", { type: "image/png" });
    await expect(uploadSpeakerPhotoDirect(file, upload)).rejects.toThrow("photo-upload-failed");
    request.mockResolvedValue({ ok: true, json: async () => ({ public_id: "another-file", version: 123, signature: "response" }) });
    await expect(uploadSpeakerPhotoDirect(file, upload)).rejects.toThrow("photo-upload-failed");
  });
});
