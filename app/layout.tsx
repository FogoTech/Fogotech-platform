import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FogoTech | Security & Network Systems",
  description: "CCTV, intercoms, access control and WiFi network installation and maintenance.",
};

export const viewport: Viewport = {
  themeColor: "#1f5a3a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
