"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import styles from "./page.module.css";

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
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

        // Fetch details from the 'users' table using the email
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", authUser.email)
          .single();

        const finalUserData = (!error && dbUser) ? dbUser : authUser;
        
        // Update state
        setUserData(finalUserData);
        
        // Save to localStorage for next time
        if (typeof window !== 'undefined') {
          localStorage.setItem('userProfileData', JSON.stringify(finalUserData));
        }

        // Fetch all activities for this user
        if (dbUser?.id) {
          try {
            const activitiesResponse = await fetch(`/api/activities?user_id=${dbUser.id}&limit=50`);
            if (activitiesResponse.ok) {
              const activitiesData = await activitiesResponse.json();
              setActivities(activitiesData.activities || []);
            }
          } catch (err) {
            console.error("Error fetching activities:", err);
          } finally {
            setActivitiesLoading(false);
          }
        } else {
          setActivitiesLoading(false);
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

  useEffect(() => {
    // Load from localStorage after mount to avoid hydration mismatch
    if (mounted && typeof window !== 'undefined') {
      const saved = localStorage.getItem('userProfileData');
      if (saved) {
        try {
          const cachedData = JSON.parse(saved);
          setUserData(cachedData);
          setLoading(false);
        } catch {
          // Invalid cache, continue with fetch
        }
      }
    }
  }, [mounted]);

  if (loading) {
    return (
      <main className={styles.main} dir="rtl">
        <div className={styles.container}>
          <div className={styles.backButtonWrapper}>
            <BackButton />
          </div>
          <div className={styles.notch}></div>
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
          <BackButton />
        </div>
        <div className={styles.notch}></div>

        {/* User Greeting */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>
              {userData?.first_name || "לא הוזן"} {userData?.last_name || ""}
            </h3>
            <p className={styles.userRole}>{userData?.role || "לא הוזן"}</p>
          </div>
          <button className={styles.closeButton} aria-label="סגור">
            ×
          </button>
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
              {activitiesLoading ? (
                <div className={styles.loadingState}>
                  <div className={styles.loadingStateText}>טוען פעילויות...</div>
                </div>
              ) : activities.length === 0 ? (
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                          );
                        case 'attendance_marked':
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          );
                        case 'status_update':
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                          );
                        default:
                          return null;
                      }
                    };

                    return (
                      <div key={activity.id || index} className={styles.activityItem}>
                        <div className={styles.activityDate}>{formattedDate}</div>
                        <div className={styles.activityIcon}>
                          {getActivityIcon()}
                        </div>
                        <div className={styles.activityContent}>
                          <div className={styles.activityDescription}>{activity.description}</div>
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