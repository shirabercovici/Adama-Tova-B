"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const GoogleLoginButton = () => {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    // Determine the base URL (works for localhost and production)
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="flex items-center justify-center gap-3 px-6 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50 w-[290px]"
      >
        {loading ? (
          <span>Connecting...</span>
        ) : (
          <>
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-5 h-5" 
            />
            Sign in with Google
          </>
        )}
      </button>
    </div>
  );
};

export default GoogleLoginButton;