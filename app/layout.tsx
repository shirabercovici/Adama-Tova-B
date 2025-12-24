import "@/styles/global.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/lib/components/Navbar";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: '#f5f7f2', 
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        direction: 'rtl' 
      }}>
        {/* The Script component goes inside body, usually at the top */}
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="beforeInteractive" 
        />
        <header style={{ width: '100%', backgroundColor: '#f5f7f2', paddingTop: '20px' }}>
          <Navbar />
          <hr style={{ border: '0', borderTop: '0.5px solid #ccc', width: '100%', margin: 0 }} />
        </header>

        <main style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}