/** Shared by admin previews and public cards; never alters the stored URL. */
export function speakerPortrait(photo: string, focus = "50% 50%", keynote = false): string {
  if (!photo.startsWith("https://res.cloudinary.com/") || focus !== "50% 50%") return photo;
  return photo.replace("/image/upload/", `/image/upload/c_thumb,g_faces,z_0.6,w_${keynote ? 800 : 1120},h_800/`);
}
