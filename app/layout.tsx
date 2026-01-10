import "@/styles/global.css";

import type { Metadata } from "next";
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
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
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