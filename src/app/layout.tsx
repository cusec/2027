import type { Metadata } from "next";
import "./globals.css";
import "./styles/index.css";
import "./styles/navbar.css";

export const metadata: Metadata = {
  title: "CUSEC 2027",
  description: "CUSEC 2027: Canadian University Software Engineering Conference",
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
