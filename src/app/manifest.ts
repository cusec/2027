import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CUSEC 2027 — Canadian University Software Engineering Conference",
    short_name: "CUSEC 2027",
    description:
      "Canada's longest-running student-led software engineering conference. 26th edition — Montréal, QC · January 2027.",
    start_url: "/",
    display: "standalone",
    background_color: "#103436",
    theme_color: "#103436",
    icons: [
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/cusec-logo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
