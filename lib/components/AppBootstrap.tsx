"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./AppBootstrap.module.css";

interface AppBootstrapProps {
  children: React.ReactNode;
}

export default function AppBootstrap({ children }: AppBootstrapProps) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const hasBootstrappedRef = useRef(false);
  
  // Skip bootstrap for login/auth pages
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/qr-login' || pathname?.startsWith('/auth/');

  // Wait for fonts to load before showing any content
  useEffect(() => {
    if (typeof window === 'undefined') {
      setFontsLoaded(true);
      return;
    }

    // Check if Font Loading API is available
    if ('fonts' in document) {
      // Wait for all fonts to be ready
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      }).catch(() => {
        // If fonts fail to load, still show content after a timeout
        setTimeout(() => {
          setFontsLoaded(true);
        }, 3000); // 3 second fallback
      });
    } else {
      // Fallback for browsers without Font Loading API
      // Wait a bit for fonts to load
      setTimeout(() => {
        setFontsLoaded(true);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    // Skip bootstrap for auth pages - just render children (but still wait for fonts)
    if (isAuthPage) {
      if (fontsLoaded) {
        setIsBootstrapping(false);
      }
      return;
    }
    
    // Don't start bootstrap until fonts are loaded
    if (!fontsLoaded) {
      return;
    }
    
    const bootstrap = async () => {
      // Check if we already bootstrapped in this session
      if (typeof window !== 'undefined') {
        const bootstrapped = sessionStorage.getItem('app_bootstrapped');
        const bootstrappedEmail = sessionStorage.getItem('app_bootstrapped_email');
        
        if (bootstrapped === 'true') {
          // Verify user hasn't changed
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser?.email === bootstrappedEmail) {
              // Same user, already bootstrapped - skip
              setIsBootstrapping(false);
              hasBootstrappedRef.current = true;
              return;
            } else {
              // Different user - clear bootstrap flag and continue
              sessionStorage.removeItem('app_bootstrapped');
              sessionStorage.removeItem('app_bootstrapped_email');
            }
          } catch (e) {
            // Error checking auth - continue with bootstrap
          }
        }
      }

      try {
        // 1. Check authentication
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          // No user - clear bootstrap flag and redirect
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('app_bootstrapped');
            sessionStorage.removeItem('app_bootstrapped_email');
          }
          router.push("/");
          return;
        }

        // 2. Determine user role (check cache first, but always verify)
        let role: string | null = null;
        const cachedRoleData = typeof window !== 'undefined' ? localStorage.getItem('userRoleData') : null;
        if (cachedRoleData) {
          try {
            const { role: cachedRole, email: cachedEmail } = JSON.parse(cachedRoleData);
            if (cachedEmail === authUser.email && cachedRole) {
              role = cachedRole;
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }

        // Always fetch full user profile from server to ensure it's current
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();
        
        if (dbUser) {
          role = dbUser.role;
          // Cache full user profile data for profile page
          if (typeof window !== 'undefined') {
            localStorage.setItem('userProfileData', JSON.stringify(dbUser));
            localStorage.setItem('userRoleData', JSON.stringify({
              role: dbUser.role,
              email: authUser.email
            }));
          }
        }

        // 3. Load all critical data in parallel
        const isManagerRole = (r: string | null) => {
          return r === "מנהל.ת" || r === "מנהל" || r === "מנהלת" || (r && r.includes("מנהל"));
        };

        const isManager = isManagerRole(role);

        // Load participants, tasks, status updates, and user activities in parallel
        const fetchPromises: Promise<any>[] = [
          // Participants - always fetch
          fetch("/api/participants", { cache: 'no-store' }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              const participants = data.participants || [];
              // Cache participants
              if (typeof window !== 'undefined') {
                localStorage.setItem('participants_cache', JSON.stringify({
                  participants,
                  timestamp: Date.now(),
                  filterType: 'active'
                }));
              }
            }
          })
        ];

        // Load user activities for profile page (always fetch for all users)
        if (dbUser?.id) {
          fetchPromises.push(
            fetch(`/api/activities?user_id=${dbUser.id}&limit=100`, { cache: 'no-store' })
              .then(async (res) => {
                if (res.ok) {
                  const activitiesData = await res.json();
                  const activities = activitiesData.activities || [];
                  // Cache activities for profile page
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`userActivities_${dbUser.id}`, JSON.stringify(activities));
                  }
                } else {
                  console.error('Failed to fetch user activities:', res.status);
                  // Cache empty array if fetch fails
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`userActivities_${dbUser.id}`, JSON.stringify([]));
                  }
                }
              })
              .catch((err) => {
                console.error('Error fetching user activities:', err);
                // Cache empty array if fetch fails
                if (typeof window !== 'undefined' && dbUser?.id) {
                  localStorage.setItem(`userActivities_${dbUser.id}`, JSON.stringify([]));
                }
              })
          );
        }

        if (isManager) {
          // Tasks (only if manager)
          fetchPromises.push(
            fetch("/tasks/api", { cache: 'no-store' }).then(async (res) => {
              if (res.ok) {
                const tasksData = await res.json();
                const tasks = tasksData.tasks || [];
                // Cache tasks
                if (typeof window !== 'undefined') {
                  localStorage.setItem('tasks_cache', JSON.stringify({
                    tasks,
                    timestamp: Date.now()
                  }));
                }
              }
            })
          );

          // Status updates (only if manager)
          fetchPromises.push(
            fetch("/api/activities?activity_type=status_update&limit=50", { cache: 'no-store' }).then(async (res) => {
              if (res.ok) {
                const statusData = await res.json();
                const statusUpdates = statusData.activities || [];
                // Cache status updates
                if (typeof window !== 'undefined') {
                  localStorage.setItem('statusUpdates_cache', JSON.stringify({
                    statusUpdates,
                    timestamp: Date.now()
                  }));
                }
              }
            })
          );
        }

        // Wait for all data to load - CRITICAL: don't show app until all data is loaded
        await Promise.all(fetchPromises);

        // CRITICAL: Verify ALL critical data is cached before proceeding
        // If any critical data is missing, we cannot show the app
        if (typeof window !== 'undefined') {
          const participantsCache = localStorage.getItem('participants_cache');
          const userProfileCache = localStorage.getItem('userProfileData');
          
          // These are REQUIRED - app cannot function without them
          if (!participantsCache || !userProfileCache) {
            console.error('CRITICAL: Required data not cached after bootstrap');
            // Don't show app - keep loading screen
            return;
          }
          
          // If manager, tasks and status updates are also REQUIRED
          if (isManager) {
            const tasksCache = localStorage.getItem('tasks_cache');
            const statusUpdatesCache = localStorage.getItem('statusUpdates_cache');
            if (!tasksCache || !statusUpdatesCache) {
              console.error('CRITICAL: Manager data not fully cached after bootstrap');
              // Don't show app - keep loading screen
              return;
            }
          }
          
          // Verify user activities are cached (for profile page)
          if (dbUser?.id) {
            const activitiesCache = localStorage.getItem(`userActivities_${dbUser.id}`);
            if (!activitiesCache) {
              console.warn('User activities not cached - profile page may be incomplete');
              // This is not critical, but log it
            }
          }
        }

        // Mark as bootstrapped
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('app_bootstrapped', 'true');
          sessionStorage.setItem('app_bootstrapped_email', authUser.email || '');
        }
        hasBootstrappedRef.current = true;
        setIsBootstrapping(false);
      } catch (error) {
        console.error('Bootstrap error:', error);
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [supabase, router, isAuthPage, fontsLoaded]);

  // Show loading screen during bootstrap
  if (isBootstrapping) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingImageWrapper}>
          <Image
            src="/icons/loading.png"
            alt="טוען..."
            width={200}
            height={200}
            className={styles.loadingImage}
            priority
          />
        </div>
        <div className={styles.loadingText}>רק רגע...</div>
      </div>
    );
  }

  // After bootstrap, render children
  return <>{children}</>;
}
