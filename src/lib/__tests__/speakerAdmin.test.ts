import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), connect: vi.fn(), create: vi.fn(), update: vi.fn(),
  audit: vi.fn(), tag: vi.fn(), path: vi.fn(),
  lookup: vi.fn(), signPhoto: vi.fn(), verifyPhoto: vi.fn(),
}));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: mocks.session } }));
vi.mock("@/lib/mongodb", () => ({ default: mocks.connect }));
vi.mock("@/lib/models", () => ({ SpeakerProfile: {
  create: mocks.create, updateOne: mocks.update,
  findById: () => ({ select: () => ({ lean: mocks.lookup }) }),
} }));
vi.mock("@/lib/speakerPhotoStorage", () => ({ signSpeakerPhotoUpload: mocks.signPhoto, verifySpeakerPhoto: mocks.verifyPhoto }));
vi.mock("@/lib/adminAuditLogger", () => ({ logAdminAction: mocks.audit }));
vi.mock("next/cache", () => ({ updateTag: mocks.tag, revalidatePath: mocks.path }));
import { prepareSpeakerPhoto, saveSpeaker } from "../../app/[locale]/admin/speakers/actions";

function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    id: "507f1f77bcf86cd799439011", name: "Test Speaker", role: "Engineer",
    kind: "speaker", topic: "web", order: "0", version: "",
    photo: "https://example.com/speaker.webp", focus: "50% 50%",
  })) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { email: "admin@example.com", "cusec/roles": ["Admin"] } });
  mocks.create.mockResolvedValue({});
  mocks.lookup.mockResolvedValue(null);
  mocks.signPhoto.mockReturnValue({ cloudName: "team", apiKey: "public-key", signature: "signed", parameters: { folder: "cusec-2027/speakers" } });
  mocks.verifyPhoto.mockReturnValue({ url: "https://res.cloudinary.com/team/image/upload/speakers/new.webp", publicId: "cusec-2027/speakers/new" });
  mocks.update.mockResolvedValue({ matchedCount: 1 });
});

describe("speaker administration", () => {
  it("rejects anonymous users and non-admins before database access", async () => {
    for (const session of [null, { user: { email: "user@example.com", "cusec/roles": ["Volunteer"] } }]) {
      mocks.session.mockResolvedValue(session);
      expect(await saveSpeaker({ status: "idle" }, form())).toEqual({ status: "forbidden" });
    }
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("rejects unsafe image URLs and invalid speaker fields", async () => {
    for (const [key, value] of [["photo", "javascript:alert(1)"], ["photo", "//example.com/photo"], ["kind", "other"], ["name", ""], ["order", "-1"], ["version", "NaN"]]) {
      const data = form();
      data.set(key, value);
      expect(await saveSpeaker({ status: "idle" }, data)).toEqual({ status: "invalid" });
    }
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("creates drafts and invalidates the public cache after saving", async () => {
    expect(await saveSpeaker({ status: "idle" }, form())).toMatchObject({ status: "saved" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Test Speaker", published: false }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ resourceType: "speaker" }));
    expect(mocks.tag).toHaveBeenCalledWith("speakers");
  });

  it("publishes a keynote using an optimistic version check", async () => {
    const data = form();
    mocks.lookup.mockResolvedValue({ __v: 2 });
    data.set("version", "2");
    data.set("kind", "keynote");
    data.set("published", "on");
    expect(await saveSpeaker({ status: "idle" }, data)).toMatchObject({ status: "saved" });
    expect(mocks.update).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439011", __v: 2 },
      expect.objectContaining({ $set: expect.objectContaining({ kind: "keynote", published: true }), $inc: { __v: 1 } }),
      { runValidators: true },
    );
  });

  it("preserves concurrent changes by refusing stale saves", async () => {
    mocks.update.mockResolvedValue({ matchedCount: 0 });
    mocks.lookup.mockResolvedValue({ __v: 1 });
    const data = form();
    data.set("version", "1");
    expect(await saveSpeaker({ status: "idle" }, data)).toEqual({ status: "conflict" });
    expect(mocks.tag).not.toHaveBeenCalled();
  });
});


const receipt = { publicId: "cusec-2027/speakers/test", version: 123, signature: "signed" };
function photoForm() {
  const data = form();
  data.set("headshotUpload", JSON.stringify(receipt));
  return data;
}

describe("signed speaker uploads", () => {
  it("only signs uploads for admins", async () => {
    mocks.session.mockResolvedValue(null);
    expect(await prepareSpeakerPhoto("507f1f77bcf86cd799439011", "")).toEqual({ status: "forbidden" });
    expect(mocks.signPhoto).not.toHaveBeenCalled();
  });

  it("signs uploads for the requested speaker after checking its version", async () => {
    expect(await prepareSpeakerPhoto("507f1f77bcf86cd799439011", "")).toMatchObject({ status: "ready" });
    expect(mocks.signPhoto).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    mocks.lookup.mockResolvedValue({ __v: 2 });
    expect(await prepareSpeakerPhoto("507f1f77bcf86cd799439011", "1")).toEqual({ status: "conflict" });
    expect(mocks.signPhoto).toHaveBeenCalledTimes(1);
  });

  it("reports missing Cloudinary configuration", async () => {
    mocks.signPhoto.mockImplementation(() => { throw new Error("photo-unavailable"); });
    expect(await prepareSpeakerPhoto("507f1f77bcf86cd799439011", "")).toEqual({ status: "photo-unavailable" });
  });

  it("saves verified upload metadata instead of trusting a browser URL", async () => {
    const result = await saveSpeaker({ status: "idle" }, photoForm());
    expect(mocks.verifyPhoto).toHaveBeenCalledWith("507f1f77bcf86cd799439011", receipt);
    expect(result).toEqual({ status: "saved", photo: "https://res.cloudinary.com/team/image/upload/speakers/new.webp" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ photo: result.photo, photoPublicId: "cusec-2027/speakers/new" }));
  });

  it("rejects forged and malformed receipts before saving", async () => {
    mocks.verifyPhoto.mockImplementation(() => { throw new Error("photo-invalid"); });
    expect(await saveSpeaker({ status: "idle" }, photoForm())).toEqual({ status: "photo-invalid" });
    const data = form();
    data.set("headshotUpload", "invalid-json");
    expect(await saveSpeaker({ status: "idle" }, data)).toEqual({ status: "photo-invalid" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps optimistic concurrency checks after a completed upload", async () => {
    mocks.lookup.mockResolvedValue({ __v: 1 });
    mocks.update.mockResolvedValue({ matchedCount: 0 });
    const data = photoForm();
    data.set("version", "1");
    expect(await saveSpeaker({ status: "idle" }, data)).toEqual({ status: "conflict" });
    expect(mocks.tag).not.toHaveBeenCalled();
  });

  it("keeps existing image identifiers when editing text", async () => {
    mocks.lookup.mockResolvedValue({ __v: 1, photo: "https://example.com/speaker.webp", photoPublicId: "cusec-2027/speakers/original" });
    const data = form();
    data.set("version", "1");
    expect(await saveSpeaker({ status: "idle" }, data)).toMatchObject({ status: "saved" });
    expect(mocks.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      $set: expect.objectContaining({ photoPublicId: "cusec-2027/speakers/original" }),
    }), expect.anything());
  });

  it("rejects file bytes submitted to the profile action", async () => {
    const data = form();
    data.set("headshot", new File(["image bytes"], "photo.png", { type: "image/png" }));
    expect(await saveSpeaker({ status: "idle" }, data)).toEqual({ status: "photo-invalid" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
