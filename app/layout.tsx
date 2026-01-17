import "@/styles/global.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Footer from "@/lib/components/Footer";
import Script from "next/script";

export const metadata = {
  title: "אדממי",
  description: "אפליקציה למעקב אחר צוות אדמה טובה",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "אדממי",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#4D58D8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Theme color for mobile status bar */}
        <meta name="theme-color" content="#4D58D8" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        {/* The Script component goes inside body, usually at the top */}
        {/* <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        /> */}

        <main className="main-layout">
          {children}
        </main>
      </body>
    </html>
  );
}