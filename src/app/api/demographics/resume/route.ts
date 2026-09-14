import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User, DemographicInfo } from "@/lib/models";
import {
  RESUME_MAX_BYTES,
  deleteResume,
  looksLikePdf,
  resumeStorageEnabled,
  uploadResume,
} from "@/lib/resumeStorage";

// The caller's own résumé: POST (multipart, field "file") uploads or replaces
// it, DELETE removes it. Scoped strictly to the session's user. No file
// contents or names ever reach the logs.

async function currentUser() {
  const session = await auth0.getSession();
  if (!session?.user?.email) return null;
  await connectMongoDB();
  return User.findOne({ email: session.user.email }).select("_id");
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!resumeStorageEnabled()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // Refuse an oversized body before reading it, when the client says how big
  // it is; the byte count below is the check that actually counts.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > RESUME_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (file.size > RESUME_MAX_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikePdf(bytes)) {
    return NextResponse.json({ error: "not-pdf" }, { status: 415 });
  }

  let publicId: string;
  try {
    publicId = await uploadResume(String(user._id), bytes);
  } catch (error) {
    console.error(
      "Résumé upload failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json({ error: "upload-failed" }, { status: 502 });
  }

  const fileName = file.name.replace(/[\r\n]/g, " ").slice(0, 120) || "resume.pdf";
  const uploadedAt = new Date();
  await DemographicInfo.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        user: user._id,
        resumePublicId: publicId,
        resumeFileName: fileName,
        resumeSize: bytes.length,
        resumeUploadedAt: uploadedAt,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return NextResponse.json({
    success: true,
    resume: { fileName, size: bytes.length, uploadedAt: uploadedAt.toISOString() },
  });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await DemographicInfo.findOne({ user: user._id })
    .select("resumePublicId")
    .lean<{ resumePublicId?: string }>();

  if (doc?.resumePublicId && resumeStorageEnabled()) {
    try {
      await deleteResume(doc.resumePublicId);
    } catch (error) {
      console.error(
        "Résumé delete failed:",
        error instanceof Error ? error.message : "unknown error"
      );
      return NextResponse.json({ error: "delete-failed" }, { status: 502 });
    }
  }

  await DemographicInfo.updateOne(
    { user: user._id },
    { $set: { resumePublicId: "", resumeFileName: "", resumeSize: 0, resumeUploadedAt: null } }
  );

  return NextResponse.json({ success: true });
}
