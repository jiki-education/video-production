import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jiki Pipeline Editor",
  description: "Visual pipeline editor for Jiki educational videos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
