import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/index.css";
import "./styles/navbar.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://2027.cusec.net"),

  title: {
    default: "CUSEC 2027 — Canadian University Software Engineering Conference",
    template: "%s | CUSEC 2027",
  },
  description:
    "CUSEC 2027 is the 26th annual Canadian University Software Engineering Conference — Canada's longest-running student-led software engineering conference, held in Montréal, QC in January 2027.",
  keywords: [
    "CUSEC",
    "CUSEC 2027",
    "Canadian University Software Engineering Conference",
    "software engineering conference",
    "student tech conference",
    "university conference Canada",
    "tech conference Montréal",
    "computer science conference",
    "programming conference",
    "student conference 2027",
    "Canada",
    "Montréal",
    "Quebec",
    "career development",
    "networking",
    "technology",
    "software development",
    "engineering students",
    "CUSEC 26th edition",
    "conférence génie logiciel",
  ],
  authors: [{ name: "CUSEC Organization", url: "https://cusec.net" }],
  creator: "CUSEC Organization",
  publisher: "CUSEC",
  category: "technology",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "https://2027.cusec.net",
    languages: {
      "en-CA": "https://2027.cusec.net",
      "fr-CA": "https://2027.cusec.net",
      "x-default": "https://2027.cusec.net",
    },
  },

  openGraph: {
    title: "CUSEC 2027 — Canadian University Software Engineering Conference",
    description:
      "Join CUSEC 2027, the 26th annual student-led software engineering conference in Montréal, QC. Canada's premier student tech conference — January 2027.",
    url: "https://2027.cusec.net",
    siteName: "CUSEC 2027",
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    images: [
      {
        // Add a 1200×630 OG image at public/og-image.png for best results
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CUSEC 2027 — Canadian University Software Engineering Conference, Montréal · January 2027",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CUSEC 2027 — Canadian University Software Engineering Conference",
    description:
      "Canada's longest-running student-led software engineering conference. 26th edition — Montréal, QC · January 2027.",
    images: ["/og-image.png"],
    site: "@cusec",     // update if handle changes
    creator: "@cusec",
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#103436" },
    ],
  },

  manifest: "/manifest.json",

  verification: {
    google: "", // paste Google Search Console verification token here
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#103436" },
    { media: "(prefers-color-scheme: dark)", color: "#103436" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
