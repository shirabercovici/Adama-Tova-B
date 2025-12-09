"use client";

import { NEXT_PUBLIC_GOOGLE_CLIENT_ID } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const handleSignInWithGoogle = async (response: any) => {
      console.log("handleSignInWithGoogle", response);
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      location.reload();
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

    // Initialize if Google script is already loaded
    if (window.google) {
      initializeGoogle();
    } else {
      // Wait for the script to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initializeGoogle();
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }
  }, [supabase.auth]);

  // You can customize the button here:
  // https://developers.google.com/identity/gsi/web/tools/configurator
  return <div ref={buttonRef} />;
};

export default GoogleLoginButton;
