"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function ProfilePage() {
  // Initialize with cached data immediately (synchronous)
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { userData: null, activities: [] };
    }
    
    try {
      const saved = localStorage.getItem('userProfileData');
      if (saved) {
        const cachedData = JSON.parse(saved);
        const cachedActivities = cachedData?.id 
          ? localStorage.getItem(`userActivities_${cachedData.id}`)
          : null;
        
        return {
          userData: cachedData,
          activities: cachedActivities ? JSON.parse(cachedActivities) : []
        };
      }
    } catch {
      // Invalid cache, use defaults
    }
    
    return { userData: null, activities: [] };
  };

  const initialState = getInitialState();
  const [userData, setUserData] = useState<any>(initialState.userData);
  const [loading, setLoading] = useState(!initialState.userData);
  const [activities, setActivities] = useState<any[]>(initialState.activities);
  const [activitiesLoading, setActivitiesLoading] = useState(!initialState.activities.length);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const hasFetchedProfileRef = useRef(false);

  useEffect(() => {
    // Only fetch after component is mounted to avoid hydration issues
    if (!mounted || hasFetchedProfileRef.current) {
      return;
    }
    hasFetchedProfileRef.current = true;
    
    const getProfile = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/");
          return;
        }

        // First, get just the user ID (lightweight query) to start activities fetch early
        const { data: userWithId } = await supabase
          .from("users")
          .select("id")
          .eq("email", authUser.email)
          .single();

        // Start fetching activities immediately if we have the ID
        if (userWithId?.id) {
          // Fetch activities in parallel with profile
          fetch(`/api/activities?user_id=${userWithId.id}&limit=50`)
            .then(async (activitiesResponse) => {
              if (activitiesResponse.ok) {
                const activitiesData = await activitiesResponse.json();
                const fetchedActivities = activitiesData.activities || [];
                setActivities(fetchedActivities);
                // Cache activities for next time
                if (typeof window !== 'undefined') {
                  localStorage.setItem(`userActivities_${userWithId.id}`, JSON.stringify(fetchedActivities));
                }
              }
            })
            .catch((err) => {
              console.error("Error fetching activities:", err);
            })
            .finally(() => {
              setActivitiesLoading(false);
            });
        } else {
          setActivitiesLoading(false);
        }

        // Now fetch full user details
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", authUser.email)
          .single();

        const finalUserData = (!error && dbUser) ? dbUser : authUser;
        
        // Update state immediately
        setUserData(finalUserData);
        
        // Save to localStorage for next time
        if (typeof window !== 'undefined') {
          localStorage.setItem('userProfileData', JSON.stringify(finalUserData));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        // Try to get user from auth as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUserData(authUser);
        }
      } finally {
        setLoading(false);
      }
    };

    getProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]); // Run when mounted

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    setMounted(true);
    document.body.classList.add('profile-page');
    return () => {
      document.body.classList.remove('profile-page');
    };
  }, []);

  // Note: Cached data is now loaded synchronously in useState initializer above
  // This useEffect is kept for cases where we need to refresh from cache

  if (loading) {
    return (
      <main className={styles.main} dir="rtl">
        <div className={styles.container}>
          <div className={styles.backButtonWrapper}>
            <button 
              onClick={() => router.back()}
              className={styles.closeXButton}
              aria-label="סגור"
            >
              ×
            </button>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>טוען...</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main} dir="rtl">
      <div className={styles.container}>
        <div className={styles.backButtonWrapper}>
          <button 
            onClick={() => router.back()}
            className={styles.closeXButton}
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        {/* User Greeting */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>
              {userData?.first_name || "לא הוזן"} {userData?.last_name || ""}
            </h3>
            <p className={styles.userRole}>{userData?.role || "לא הוזן"}</p>
          </div>
        </div>

        <div className={styles.content}>
          {/* Section: Personal Details */}
          <section className={styles.section}>
            <div className={styles.personalDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>מס&apos; טלפון</span>
                <span className={styles.detailValue}>{userData?.phone_number || "לא הוזן"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>מייל</span>
                <span className={styles.detailValue}>{userData?.email || "לא הוזן"}</span>
              </div>
            </div>
          </section>

          {/* Section: Activity History */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>היסטוריית הפעילות שלי</h3>
            <div className={styles.activityHistory}>
              {activities.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateText}>אין פעילויות עדיין</div>
                </div>
              ) : (
                <div className={styles.activityList}>
                  {activities.map((activity, index) => {
                    const activityDate = new Date(activity.created_at);
                    const formattedDate = activityDate.toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "numeric",
                    });

                    // Get icon based on activity type
                    const getActivityIcon = () => {
                      switch (activity.activity_type) {
                        case 'phone_call':
                          return (
                            <Image
                              src="/icons/phone_call.svg"
                              alt="Phone call"
                              width={16}
                              height={16}
                              className={styles.activityIconImage}
                            />
                          );
                        case 'attendance_marked':
                          return (
                            <Image
                              src="/icons/attendace_marked.svg"
                              alt="Attendance marked"
                              width={16}
                              height={16}
                            />
                          );
                        case 'status_update':
                          return (
                            <Image
                              src="/icons/status_update.svg"
                              alt="Status update"
                              width={16}
                              height={16}
                              className={styles.activityIconImage}
                            />
                          );
                        default:
                          return null;
                      }
                    };

                    // Parse status update description to separate main text from update details
                    const isStatusUpdate = activity.activity_type === 'status_update';
                    let mainDescription = activity.description;
                    let updateDetails = '';
                    
                    if (isStatusUpdate) {
                      const colonIndex = activity.description.indexOf(':');
                      if (colonIndex !== -1) {
                        mainDescription = activity.description.substring(0, colonIndex + 1);
                        updateDetails = activity.description.substring(colonIndex + 1).trim();
                      }
                    }

                    return (
                      <div key={activity.id || index} className={styles.activityItem}>
                        <div className={styles.activityDate}>{formattedDate}</div>
                        <div className={styles.activityIcon}>
                          {getActivityIcon()}
                        </div>
                        <div className={styles.activityContent}>
                          <div className={styles.activityDescription}>{mainDescription}</div>
                          {isStatusUpdate && updateDetails && (
                            <div className={styles.statusUpdateDetails}>{updateDetails}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sticky Footer with Management and Sign Out Buttons */}
        <div className={styles.stickyFooter}>
          {userData?.role === "מנהל.ת" && (
            <button
              onClick={() => router.push('/manage-volunteers')}
              className={styles.managementButton}
            >
              ניהול אנשי צוות
            </button>
          )}
          <div className={styles.signOutSection}>
            <button onClick={handleSignOut} className={styles.signOutButton}>
              התנתקות
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}