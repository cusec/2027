import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/index.css";
import "./styles/navbar.css";

export const metadata: Metadata = {
  title: "CUSEC 2027",
  description: "CUSEC 2027: Canadian University Software Engineering Conference",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
