// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Beer Event Watcher",
  description:
    "ビール・お酒イベントの新着情報を集約して表示＆LINE通知するサービス。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
