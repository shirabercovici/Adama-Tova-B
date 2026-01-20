"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeColor } from '@/lib/hooks/useThemeColor';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const hasFetchedUserRef = useRef(false);

  // Update theme-color for iOS compatibility (iOS doesn't always respect viewport exports)
  useThemeColor('#4D58D8');

  // --- אפקט 1: בדיקת משתמש וקביעת טיימר של 2 שניות להצגת ההודעה ---
  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetchedUserRef.current) {
      return;
    }
    hasFetchedUserRef.current = true;
    
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/");
      } else {
        // Try to use cached user data first
        let dbUser = null;
        if (typeof window !== 'undefined') {
          try {
            const cachedUserData = localStorage.getItem('userProfileData');
            if (cachedUserData) {
              const cached = JSON.parse(cachedUserData);
              // Verify cached email matches current user
              if (cached.email === authUser.email) {
                dbUser = cached;
              }
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }

        // If no cache or cache invalid, fetch from server
        if (!dbUser) {
          const { data: fetchedDbUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', authUser.email)
            .single();
          dbUser = fetchedDbUser;
        }

        setUser(dbUser || authUser);

        // אחרי 2 שניות, אנחנו רק מסמנים שצריך להתחיל לצאת
        setTimeout(() => {
          setIsExiting(true); 
        }, 2000);
      }
    };
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once

  // --- אפקט 2 (החדש!): הקשבה למשתנה isExiting ומעבר דף בפועל ---
  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        router.push("/participants");
      }, 800); // מחכים שהאנימציה (של ה-0.8 שניות) תסתיים

      return () => clearTimeout(timer);
    }
  }, [isExiting, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-24" style={{ position: "relative" }}>
      {/* Blue status bar area for mobile */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: `max(44px, calc(env(safe-area-inset-top, 0px) + 44px))`,
          backgroundColor: "#4D58D8",
          zIndex: 10000,
        }}
      />
      <AnimatePresence>
        {!isExiting && (
          <motion.div 
            key="welcome-box"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }} // האנימציה שבה הוא מחליק שמאלה
            transition={{ duration: 0.8 }} // זמן האנימציה
            className="max-w-2xl mx-auto border p-8 rounded-lg shadow-lg"
          >
            <div>
              <span className="block sm:inline">היי {user.first_name}! טוב לראות אותך</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}