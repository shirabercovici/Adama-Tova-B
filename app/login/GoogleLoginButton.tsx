"use client";

import { NEXT_PUBLIC_GOOGLE_CLIENT_ID } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleSignInWithGoogle = async (response: any) => {
      setErrorMessage(null);
      
      // 1. Authenticate with Google to get the user session
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (authError) {
        console.error("Login error:", authError);
        setErrorMessage("Authentication failed.");
        return;
      }

      const userEmail = data.user?.email;

      // 2. CHECK: Does this email exist in your 'users' table?
      const { data: existingUser, error: dbError } = await supabase
        .from("users") // Ensure this matches your table name exactly
        .select("email")
        .eq("email", userEmail)
        .single();

      if (dbError || !existingUser) {
        // 3. REJECT: User not in allowed list
        console.warn("Access denied: Email not found in approved users table.");
        
        // Sign out of Supabase immediately so the session isn't kept
        await supabase.auth.signOut();
        
        setErrorMessage("Access Denied: Your account is not authorized for this system.");
        return;
      }

      // 4. ALLOW: User is authorized
      router.push("/homepage");
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
  }, [supabase, router]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={buttonRef} />
      {errorMessage && (
        <p className="text-red-500 text-xs font-bold max-w-[290px]">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default GoogleLoginButton;