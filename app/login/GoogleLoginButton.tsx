"use client";

import { NEXT_PUBLIC_GOOGLE_CLIENT_ID } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; // 1. Import useRouter

// TypeScript declaration for the Google global object
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

const GoogleLoginButton = () => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter(); // 2. Initialize router

  useEffect(() => {
    // 3. Define the login handler
    const handleSignInWithGoogle = async (response: any) => {
      console.log("handleSignInWithGoogle", response);
      
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (error) {
        console.error("Login error:", error);
      } else {
        // 4. Redirect to dashboard on success
        router.push("/dashboard");
      }
    };

    const initializeGoogle = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleSignInWithGoogle,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: "signin_with",
          size: "medium",
          logo_alignment: "left",
          width: 290,
        });
      }
    };

    // 5. Load the button (Wait for script if needed)
    if (window.google) {
      initializeGoogle();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initializeGoogle();
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }
  }, [supabase.auth, router]); // Added router to dependency array

  return <div ref={buttonRef} />;
};

export default GoogleLoginButton;