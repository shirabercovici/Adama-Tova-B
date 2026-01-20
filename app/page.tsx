"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import GoogleLoginButton from "./login/GoogleLoginButton";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useThemeColor } from '@/lib/hooks/useThemeColor';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Update theme-color for iOS compatibility (iOS doesn't always respect viewport exports)
  useThemeColor('#FFFCE5');

  useEffect(() => {
    const checkSession = async () => {
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // If logged in, redirect to main app immediately (or after a very short delay if desired)
        router.replace("/participants");
      } else {
        // If not logged in, show splash for 1 second then show login
        setTimeout(() => {
          setShowSplash(false);
        }, 1000); // 1 second splash screen
      }
    };

    checkSession();
  }, [router, supabase]);

  if (showSplash) {
    // Splash Screen (Matches loading.tsx design)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
          backgroundColor: "#FFFCE5",
          margin: 0,
          padding: 0,
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          gap: "10px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "180px",
            height: "180px",
          }}
        >
          <Image
            src="/loading.svg"
            alt="Loading..."
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <div
          style={{
            position: "relative",
            width: "125px",
            height: "40px",
            marginTop: "10px"
          }}
        >
          <Image
            src="/ADAMAMI.svg"
            alt="ADAMAMI"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </div>
    );
  }

  // Login Screen
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#FFFCE5", // Cream background
        margin: 0,
        padding: 0,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Centered Content: Logo and Welcome Text */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem", // Spacing between logo and text
          paddingBottom: "100px", // Push content up slightly to avoid footer overlap visual
        }}
      >
        {/* Logo */}
        <div style={{ position: "relative", width: "180px", height: "180px" }}>
          <Image
            src="/loading.svg"
            alt="Adamami Logo"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* Logo Text Image */}
        <div style={{ position: "relative", width: "125px", height: "40px" }}>
          <Image
            src="/ADAMAMI.svg"
            alt="ADAMAMI"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* Welcome Text */}
        <h1
          style={{
            fontFamily: "EditorSans_PRO, sans-serif",
            fontSize: "1.5rem",
            fontWeight: 400,
            fontStyle: "italic",
            color: "#4D58D8", // Blue Adamami
            margin: 0,
            textAlign: "center",
            marginTop: "10px",
          }}
        >
          ברוכים.ות הבאים.ות
        </h1>
      </div>

      {/* Yellow Footer with Login Button */}
      <div
        style={{
          width: "100%",
          height: "90px", // Approximate height from screenshot
          backgroundColor: "#FFF2A8", // Yellow Adamami
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "fixed", // Changed from sticky to fixed to ensure it stays at bottom
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <GoogleLoginButton />
      </div>
    </main >
  );
}