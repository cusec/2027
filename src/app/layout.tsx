import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GeistPixelSquare } from "geist/font/pixel";
import { Nunito } from "next/font/google";
import AnalyticsClickTracking from "./components/Analytics/AnalyticsClickTracking";
import AttributionCapture from "./components/Analytics/AttributionCapture";
import "./globals.css";
import "./styles/Tickets/TicketCard.css";
import "./styles/TicketWizard/TicketWizard.css";
import "./styles/v2/index.css";
import "./styles/v2/meet.css";
import { SITE_URL } from "@/lib/seo";

// Body copy face for the main site. Exposed as a CSS variable so swapping it
// for the real Figma font later is a one-line change.
const bodyFont = Nunito({
  subsets: ["latin"],
  variable: "--font-v2-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: "CUSEC 2027 - Canadian University Software Engineering Conference",
  description:
    "CUSEC 2027 is the 26th annual Canadian University Software Engineering Conference - Canada's longest-running student-led software engineering conference, held in Montréal, QC in January 2027.",
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
  verification: {
    google: "rr8EHeTgYYXM7QyXAgy2-R715ahKGs6lkLyR9vsKHMY",
  },
  authors: [{ name: "CUSEC Organization" }],
  creator: "CUSEC Organization",
  publisher: "CUSEC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "./",
  },

  openGraph: {
    title: "CUSEC 2027 - Canadian University Software Engineering Conference",
    description:
      "Three days of talks, workshops, career conversations, and late-night ideas at Canada's longest-running student-led software engineering conference.",
    url: "./",
    siteName: "CUSEC 2027",
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    images: [
      {
        url: "/cusec-logo.png",
        width: 1200,
        height: 630,
        alt: "CUSEC 2027 - Canadian University Software Engineering Conference, Montréal, January 2027",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CUSEC 2027 - Canadian University Software Engineering Conference",
    description:
      "Canada's longest-running student-led software engineering conference. 26th edition - Montréal, QC, January 2027.",
    images: ["/cusec-logo.png"],
    site: "@cusec", 
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
    <html
      lang="en-CA"
      dir="ltr"
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${GeistPixelSquare.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
        <AnalyticsClickTracking />
        <AttributionCapture />
        <Analytics />
      </body>
    </html>
  );
}

