"use server";

import { Types } from "mongoose";
import { updateTag, revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { SpeakerProfile } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { logAdminAction } from "@/lib/adminAuditLogger";
import { signSpeakerPhotoUpload, verifySpeakerPhoto } from "@/lib/speakerPhotoStorage";
import type { SpeakerPhotoReceipt, SpeakerPhotoUpload } from "@/lib/speakerPhotoUpload";

export type SaveState = {
  status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "error"
    | "photo-too-large" | "photo-invalid" | "photo-unavailable" | "photo-upload-failed";
  photo?: string;
};

export async function prepareSpeakerPhoto(id: string, version: string): Promise<
  { status: "ready"; upload: SpeakerPhotoUpload } | { status: "forbidden" | "invalid" | "conflict" | "photo-unavailable" | "error" }
> {
  const session = await auth0.getSession();
  if (!session?.user?.email || !session.user["cusec/roles"]?.includes("Admin")) return { status: "forbidden" };
  if (!/^[a-f0-9]{24}$/i.test(id) || (version !== "" && !/^\d+$/.test(version))) return { status: "invalid" };
  try {
    await connectMongoDB();
    const current = await SpeakerProfile.findById(id).select("__v").lean<{ __v?: number }>();
    if (version === "" ? current !== null : !current || (current.__v ?? 0) !== Number(version)) return { status: "conflict" };
    return { status: "ready", upload: signSpeakerPhotoUpload(id) };
  } catch (error) {
    if (error instanceof Error && error.message === "photo-unavailable") return { status: "photo-unavailable" };
    return { status: "error" };
  }
}

export async function saveSpeaker(previous: SaveState, form: FormData): Promise<SaveState> {
  const session = await auth0.getSession();
  if (!session?.user?.email || !session.user["cusec/roles"]?.includes("Admin")) {
    return { status: "forbidden" };
  }
  const read = (key: string) => String(form.get(key) ?? "").trim();
  const id = read("id");
  const version = read("version");
  const data = {
    bio: read("bio"), socials: read("socials"),
    name: read("name"), kind: read("kind"), role: read("role"), roleFr: read("roleFr"),
    talk: read("talk"), talkFr: read("talkFr"), abstract: read("abstract"), abstractFr: read("abstractFr"),
    photoPublicId: "", photo: read("photo"), focus: read("focus") || "50% 50%", topic: read("topic"),
    order: Number(read("order")), published: form.get("published") === "on",
  };
  const photoValid = !data.photo || /^\/(?!\/)[^\\\s]*$/.test(data.photo) || (() => {
    try { const url = new URL(data.photo); return url.protocol === "https:" && !url.username && !url.password; }
    catch { return false; }
  })();
  const topics = ["ai-ml", "systems", "web", "career", "security", "design", "oss", "grad"];
  if (!/^[a-f0-9]{24}$/i.test(id) || (version !== "" && !/^\d+$/.test(version)) ||
    data.bio.length > 12000 || data.socials.length > 4000 ||
    !data.name || data.name.length > 120 || !data.role || data.role.length > 240 ||
    data.roleFr.length > 240 || data.talk.length > 240 || data.talkFr.length > 240 ||
    data.abstract.length > 4000 || data.abstractFr.length > 4000 || data.photo.length > 1000 ||
    !photoValid || !/^(100|\d{1,2})(\.\d+)?% (100|\d{1,2})(\.\d+)?%$/.test(data.focus) ||
    !["speaker", "keynote"].includes(data.kind) || !topics.includes(data.topic) ||
    !Number.isInteger(data.order) || data.order < 0 || data.order > 9999) {
    return { status: "invalid" };
  }
  // File bytes go directly to Cloudinary. This action accepts only its signed receipt.
  if (form.get("headshot") instanceof File) return { status: "photo-invalid" };
  let uploaded: { url: string; publicId: string } | null = null;
  const receipt = read("headshotUpload");
  if (receipt) {
    if (receipt.length > 1000) return { status: "photo-invalid" };
    try {
      uploaded = verifySpeakerPhoto(id, JSON.parse(receipt) as SpeakerPhotoReceipt);
    } catch (error) {
      return { status: error instanceof Error && error.message === "photo-unavailable" ? "photo-unavailable" : "photo-invalid" };
    }
  }
  try {
    await connectMongoDB();
    const current = await SpeakerProfile.findById(id).select("photo photoPublicId __v")
      .lean<{ photo?: string; photoPublicId?: string; __v?: number }>();
    const creating = version === "" && previous.status !== "saved";
    if (creating ? current !== null : !current || (current.__v ?? 0) !== Number(version || 0)) {
      return { status: "conflict" };
    }
    if (current?.photo === data.photo) data.photoPublicId = current.photoPublicId ?? "";
    if (uploaded) {
      data.photo = uploaded.url;
      data.photoPublicId = uploaded.publicId;
    }
    if (creating) {
      await SpeakerProfile.create({ _id: new Types.ObjectId(id), ...data });
    } else {
      const result = await SpeakerProfile.updateOne(
        { _id: id, __v: Number(version || 0) },
        { $set: data, $inc: { __v: 1 } }, { runValidators: true },
      );
      if (!result.matchedCount) return { status: "conflict" };
    }
    await logAdminAction({ adminEmail: session.user.email, action: "SAVE_SPEAKER", resourceType: "speaker", resourceId: id, newData: data });
    updateTag("speakers");
    revalidatePath("/[locale]/admin/speakers", "page");
    revalidatePath("/[locale]/speakers", "page");
    return { status: "saved", photo: data.photo };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return { status: "conflict" };
    console.error("Speaker save failed:", error instanceof Error ? error.message : "Unknown error");
    return { status: "error" };
  }
}
