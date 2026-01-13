"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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