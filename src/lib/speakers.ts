import "server-only";
import { unstable_cache } from "next/cache";
import connectMongoDB, { DB_NAME } from "./mongodb";
import { SpeakerProfile } from "./models";

export type SpeakerRecord = {
  _id: string;
  __v: number;
  name: string;
  kind: "speaker" | "keynote";
  role: string;
  roleFr: string;
  bio: string;
  socials: string;
  sourceHeadshotUrl: string;
  talkFormat: string;
  duration: string;
  importNotes: string;
  talk: string;
  talkFr: string;
  abstract: string;
  abstractFr: string;
  photo: string;
  photoPublicId?: string;
  focus: string;
  topic: string;
  order: number;
  published: boolean;
};

export async function listSpeakers(publishedOnly = false): Promise<SpeakerRecord[]> {
  await connectMongoDB();
  const rows = await SpeakerProfile.find(publishedOnly ? { published: true } : {})
    .sort({ order: 1, name: 1, _id: 1 }).lean();
  return JSON.parse(JSON.stringify(rows));
}

// Cache the public projection only. Admins always read fresh records.
export const getPublishedSpeakers = unstable_cache(
  async () => {
    const rows = await listSpeakers(true);
    return rows.map(({ name, kind, role, roleFr, talk, talkFr, abstract, abstractFr, photo, focus, topic, socials, bio }) => ({
      name, kind, role, roleFr, talk, talkFr, abstract, abstractFr, photo, focus, topic, socials, bio,
    }));
  },
  ["published-speakers-v3", DB_NAME],
  { tags: ["speakers"], revalidate: 3600 },
);
