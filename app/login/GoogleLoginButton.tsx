"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const GoogleLoginButton = () => {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      setLoading(false);
    } else if (data?.url) {
      window.location.href = data.url;
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      style={{
        background: "transparent",
        border: "none",
        color: "#4D58D8", // Blue Adamami
        fontFamily: "EditorSans_PRO, sans-serif",
        fontSize: "1.875rem",
        fontStyle: "normal",
        fontWeight: 400,
        textDecoration: "none",
        cursor: "pointer",
        padding: "10px",
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
      }}
    >
      {loading ? "מתחבר..." : "התחברות דרך Google"}
    </button>
  );
};

export default GoogleLoginButton;