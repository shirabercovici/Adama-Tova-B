import "@/styles/global.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Footer from "@/lib/components/Footer";
import Script from "next/script";

export const metadata = {
  title: "אדממי",
  description: "אפליקציה למעקב אחר צוות אדמה טובה",
  manifest: "/manifest.json",
  icons: {
    icon: "/chrome_logo_adamami.svg",
  },
  appleWebApp: {
    capable: true,
    title: "אדממי",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        {/* Favicon for all browsers - no white background */}
        <link rel="icon" href="/chrome_logo_adamami.svg" type="image/svg+xml" />
      </head>
      <body>
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