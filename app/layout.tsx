import "@/styles/global.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/lib/components/Navbar";
import Footer from "@/lib/components/Footer";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Digital Product Jam Starter Kit",
  description:
    "A starter kit for writing code in the Digital Product Jam course.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        {/* Browser Favicon */}
        <link rel="icon" href="/icons/favicon.png" />
        {/* Apple Icon */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-180.png"
        />
        {/* Android Icon */}
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icons/icon-192.png"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {/* The Script component goes inside body, usually at the top */}
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="beforeInteractive" 
        />

        <Navbar />
        <div>{children}</div>
        <Footer />
      </body>
    </html>
  );
} 