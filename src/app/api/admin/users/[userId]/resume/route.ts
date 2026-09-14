import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { User, DemographicInfo } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import isAdmin from "@/lib/isAdmin";
import { logAdminAction } from "@/lib/adminAuditLogger";
import { resumeDownloadUrl, resumeStorageEnabled } from "@/lib/resumeStorage";

/**
 * GET - download one user's résumé.
 *
 * Admin only, like the profile it belongs to, and audit-logged on every
 * download. Responds with a redirect to a signed Cloudinary link that expires
 * after a minute, so a copied URL is useless shortly after.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }
  if (!resumeStorageEnabled()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { userId } = await params;
  await connectMongoDB();

  const user = await User.findById(userId).select("email").lean<{ email: string }>();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const doc = await DemographicInfo.findOne({ user: userId })
    .select("resumePublicId")
    .lean<{ resumePublicId?: string }>();
  if (!doc?.resumePublicId) {
    return NextResponse.json({ error: "No résumé on file" }, { status: 404 });
  }

  await logAdminAction({
    adminEmail: session.user.email as string,
    action: "downloaded resume",
    resourceType: "demographics",
    targetUserEmail: user.email,
    resourceId: String(userId),
    request,
  });

  return NextResponse.redirect(resumeDownloadUrl(doc.resumePublicId), 302);
}
