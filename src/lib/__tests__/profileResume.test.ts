import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), doc: vi.fn(), update: vi.fn(), remove: vi.fn(), upload: vi.fn(), storage: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/attendeeSession", () => ({ getAttendeeSession: m.session }));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/models", () => ({ User: { findOne: () => ({ select: m.user }) }, DemographicInfo: {
  findOne: () => ({ select: () => Object.assign(m.doc(), { lean: m.doc }) }), updateOne: m.update, findOneAndUpdate: m.update,
} }));
vi.mock("@/lib/resumeStorage", () => ({ RESUME_MAX_BYTES: 2 * 1024 * 1024, resumeStorageEnabled: m.storage,
  looksLikePdf: m.pdf, deleteResume: m.remove, uploadResume: m.upload,
  resumeDownloadUrl: () => "https://res.cloudinary.com/example/private-signed-resume.pdf",
}));
import { GET, POST, DELETE } from "../../app/api/demographics/resume/route";
beforeEach(() => {
  vi.clearAllMocks(); m.session.mockResolvedValue({ user: { email: "self@example.com" } });
  m.user.mockResolvedValue({ _id: "own-id" }); m.storage.mockReturnValue(true);
  m.doc.mockResolvedValue({ resumePublicId: "own-private-file" });
});
describe("private résumé management", () => {
  it("rejects unauthenticated downloads", async () => {
    m.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(m.doc).not.toHaveBeenCalled();
  });
  it("gives owners a non-cacheable signed download redirect", async () => {
    const r = await GET(); expect(r.status).toBe(302);
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    expect(r.headers.get("Location")).toContain("private-signed-resume.pdf");
  });
  it("removing a résumé withdraws roast consent but not sponsor consent", async () => {
    expect((await DELETE()).status).toBe(200);
    expect(m.remove).toHaveBeenCalledWith("own-private-file");
    const [filter, update] = m.update.mock.calls[0];
    expect(filter).toEqual({ user: "own-id" });
    expect(update.$set).toMatchObject({ resumePublicId: "", resumeRoast: false, resumeRoastConsentAt: null });
    expect(update.$set).not.toHaveProperty("sponsorConsent");
    expect(update.$set).not.toHaveProperty("sections");
  });
  it("rejects files that fail PDF validation before upload", async () => {
    m.pdf.mockReturnValue(false);
    const form = new FormData(); form.set("file", new File(["not a pdf"], "resume.pdf", { type: "application/pdf" }));
    const r = await POST(new Request("http://localhost/api/demographics/resume", { method: "POST", body: form }));
    expect(r.status).toBe(415); expect(m.upload).not.toHaveBeenCalled();
  });
});
