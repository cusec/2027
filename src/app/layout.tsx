import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/index.css";
import "./styles/navbar.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://2027.cusec.net"
  ),

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
  authors: [{ name: "CUSEC Organization" }],
  creator: "CUSEC Organization",
  publisher: "CUSEC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "CUSEC 2027 — Canadian University Software Engineering Conference",
    description:
      "Join CUSEC 2027, the 26th annual student-led software engineering conference in Montréal, QC. Canada's premier student tech conference — January 2027.",
    url: "/",
    siteName: "CUSEC 2027",
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    images: [
      {
        // Add a 1200×630 OG image at public/cusec-logo.png for best results
        url: "/cusec-logo.png",
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
    images: ["/cusec-logo.png"],
    site: "@cusec",     // update if handle changes
    creator: "@cusec",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
      { url: "/cusec-logo.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/cusec-logo.svg", color: "#103436" },
    ],
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
    <html lang="en-CA" dir="ltr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
