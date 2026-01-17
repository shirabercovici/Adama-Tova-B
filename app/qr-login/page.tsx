"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function QRLoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const [debugError, setDebugError] = useState<string | null>(null);

    useEffect(() => {
        const handleLoginProcedure = async () => {
            try {
                // Wait 1 second (splash screen)
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Try to sign in
                let { error } = await supabase.auth.signInWithPassword({
                    email: 'guest@test.com',
                    password: 'welcome2026',
                });

                if (!error) {
                    // Force hard redirect to ensure session is active
                    window.location.href = '/participants';
                } else {
                    console.error('Auto login failed:', error.message);
                    setDebugError(error.message);
                }
            } catch (err: any) {
                console.error('Unexpected error:', err);
                setDebugError(err.message || 'An unexpected error occurred');
            }
        };

        handleLoginProcedure();
    }, [router, supabase]);

    // Render ONLY the Splash Screen style (Clean, no extra text)
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

            {/* Debug Error Message - Only visible on error */}
            {debugError && (
                <div style={{
                    position: 'absolute',
                    bottom: '50px',
                    color: '#D8000C',
                    backgroundColor: '#FFBABA',
                    textAlign: 'center',
                    padding: '15px',
                    fontWeight: 'bold',
                    direction: 'ltr',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    maxWidth: '80%',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    Connection Failed.<br />
                    Reason: {debugError}
                </div>
            )}
        </div>
    );
}