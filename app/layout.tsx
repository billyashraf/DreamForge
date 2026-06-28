import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DreamForge — Text MMORPG",
  description: "A browser-based text MMORPG across the Moon, Earth, and Mars.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
