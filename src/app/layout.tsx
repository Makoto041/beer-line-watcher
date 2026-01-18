// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://beer-line-watcher.vercel.app"),
  title: "ビール・お酒イベント情報 | Beer Event Watcher",
  description:
    "全国のビール・お酒イベント情報を毎日自動収集。ビール女子、Walkerplus、ビアフェス情報など複数サイトから最新イベントをお届け。LINE通知にも対応。",
  keywords: [
    "ビール",
    "イベント",
    "ビアフェス",
    "クラフトビール",
    "お酒",
    "フェスティバル",
    "ビール女子",
    "LINE通知",
  ],
  authors: [{ name: "MAKOTO IWABUCHI" }],
  creator: "MAKOTO IWABUCHI",
  publisher: "Beer Event Watcher",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://beer-line-watcher.vercel.app",
    siteName: "ビール・お酒イベント情報",
    title: "ビール・お酒イベント情報 | Beer Event Watcher",
    description:
      "全国のビール・お酒イベント情報を毎日自動収集。LINE通知にも対応。",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ビール・お酒イベント情報",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ビール・お酒イベント情報 | Beer Event Watcher",
    description:
      "全国のビール・お酒イベント情報を毎日自動収集。LINE通知にも対応。",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBEB" },
    { media: "(prefers-color-scheme: dark)", color: "#78350F" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
