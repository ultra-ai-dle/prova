import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frogger",
  description: "AI 기반 알고리즘 시각화 디버거",
  verification: {
    google: "8sjd3GYnLd0qHTHdyRspbckeumtxmx6OhNAay4FilfI",
  },
  openGraph: {
    title: "Frogger",
    description: "AI 기반 알고리즘 시각화 디버거",
    url: "https://frogger-six.vercel.app/",
    siteName: "Frogger",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ko_KR",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Frogger",
    description: "AI 기반 알고리즘 시각화 디버거",
    images: ["/og.png"],
  },
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
