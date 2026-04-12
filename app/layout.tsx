import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frogger",
  description: "AI 기반 알고리즘 시각화 디버거",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
