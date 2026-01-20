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
  // If we have cached data, start with loading=false to show it immediately
  const [loading, setLoading] = useState(!initialState.userData);
  const [activities, setActivities] = useState<any[]>(initialState.activities);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'history'>('personal');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const hasFetchedProfileRef = useRef(false);

  useEffect(() => {
    // Always verify the cached user matches the authenticated user
    if (!hasFetchedProfileRef.current) {
      hasFetchedProfileRef.current = true;
      
      const getProfile = async () => {
        try {
          // Get authenticated user
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (!authUser) {
            router.push("/");
            return;
          }

          // Check if cached data belongs to the current user
          const cachedData = initialState.userData;
          const cachedEmail = cachedData?.email;
          const currentEmail = authUser.email;

          // If cached data exists but belongs to a different user, clear it
          if (cachedData && cachedEmail !== currentEmail) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('userProfileData');
              // Also clear activities cache for the old user
              if (cachedData.id) {
                localStorage.removeItem(`userActivities_${cachedData.id}`);
              }
            }
            setUserData(null);
            setActivities([]);
          }

          // Fetch full user details first (single query is faster than two)
          const { data: dbUser, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", authUser.email)
            .single();

          const finalUserData = (!error && dbUser) ? dbUser : authUser;
          
          // Update state immediately
          setUserData(finalUserData);
          setLoading(false); // Mark as loaded
          
          // Save to localStorage for next time
          if (typeof window !== 'undefined') {
            localStorage.setItem('userProfileData', JSON.stringify(finalUserData));
          }

          // Fetch activities in parallel
          const userId = dbUser?.id || authUser?.id;
          if (userId) {
            fetch(`/api/activities?user_id=${userId}&limit=100`)
              .then(async (activitiesResponse) => {
                if (activitiesResponse.ok) {
                  const activitiesData = await activitiesResponse.json();
                  const fetchedActivities = activitiesData.activities || [];
                  setActivities(fetchedActivities);
                  // Cache activities for next time
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`userActivities_${userId}`, JSON.stringify(fetchedActivities));
                  }
                }
              })
              .catch((err) => {
                console.error("Error fetching activities:", err);
              });
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          // Try to get user from auth as fallback
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            setUserData(authUser);
          }
          setLoading(false); // Mark as loaded even on error
        }
      };

      getProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    setMounted(true);
    document.body.classList.add('profile-page');
    return () => {
      document.body.classList.remove('profile-page');
    };
  }, []);

  // Listen for auth state changes (e.g., when user switches accounts)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // User has signed in or switched accounts, refresh profile data
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Clear old cache
          if (typeof window !== 'undefined') {
            localStorage.removeItem('userProfileData');
            if (userData?.id) {
              localStorage.removeItem(`userActivities_${userData.id}`);
            }
          }

          // Fetch new user data
          const { data: dbUser, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", authUser.email)
            .single();

          const finalUserData = (!error && dbUser) ? dbUser : authUser;
          setUserData(finalUserData);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('userProfileData', JSON.stringify(finalUserData));
          }

          // Fetch activities
          const userId = dbUser?.id || authUser?.id;
          if (userId) {
            fetch(`/api/activities?user_id=${userId}&limit=100`)
              .then(async (activitiesResponse) => {
                if (activitiesResponse.ok) {
                  const activitiesData = await activitiesResponse.json();
                  const fetchedActivities = activitiesData.activities || [];
                  setActivities(fetchedActivities);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`userActivities_${userId}`, JSON.stringify(fetchedActivities));
                  }
                }
              })
              .catch((err) => {
                console.error("Error fetching activities:", err);
              });
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear cache on sign out
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userProfileData');
          if (userData?.id) {
            localStorage.removeItem(`userActivities_${userData.id}`);
          }
        }
        setUserData(null);
        setActivities([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, userData?.id]);

  const handleSignOut = async () => {
    // Clear localStorage cache before signing out
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userProfileData');
      if (userData?.id) {
        localStorage.removeItem(`userActivities_${userData.id}`);
      }
    }
    await supabase.auth.signOut();
    router.push("/");
  };

  // Filter out attendance pairs (marked + removed for same participant on same day)
  const filterAttendancePairs = (activities: any[]) => {
    // Group attendance activities by participant and date
    const attendanceGroups = new Map<string, any[]>();

    // First pass: collect all attendance activities by participant and date
    activities.forEach((activity) => {
      if (activity.activity_type === 'attendance_marked' || activity.activity_type === 'attendance_removed') {
        if (!activity.participant_id) return;

        const date = new Date(activity.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `${activity.participant_id}_${date}`;

        if (!attendanceGroups.has(key)) {
          attendanceGroups.set(key, []);
        }

        attendanceGroups.get(key)!.push(activity);
      }
    });

    // For each group, match pairs (marked + removed) and exclude them
    const excludeIds = new Set<string>();

    attendanceGroups.forEach((groupActivities) => {
      // Sort by created_at to process chronologically
      groupActivities.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Match pairs: mark each marked/removed pair for exclusion
      const markedStack: any[] = [];
      const removedStack: any[] = [];

      groupActivities.forEach((activity) => {
        if (activity.activity_type === 'attendance_marked') {
          markedStack.push(activity);
        } else {
          removedStack.push(activity);
        }
      });

      // Pair up marked and removed activities (match them)
      while (markedStack.length > 0 && removedStack.length > 0) {
        const marked = markedStack.shift()!;
        const removed = removedStack.shift()!;
        excludeIds.add(marked.id);
        excludeIds.add(removed.id);
      }
    });

    // Filter out activities that are part of a pair
    return activities.filter((activity) => !excludeIds.has(activity.id));
  };


  // Note: Cached data is now loaded synchronously in useState initializer above
  // This useEffect is kept for cases where we need to refresh from cache

  // Show loading screen while loading userData
  if (loading || !userData) {
    return (
      <div className={styles.loadingContainer}>
        <div style={{
          position: 'relative',
          width: '20.375rem',
          height: '17.375rem',
          flexShrink: 0,
          aspectRatio: '163/139'
        }}>
          <Image
            src="/icons/loading.png"
            alt="טוען..."
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <div className={styles.loadingText}>רק רגע...</div>
      </div>
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

        {/* User Info Header */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>
              {userData.first_name || ""} {userData.last_name || ""}
            </h3>
            <p className={styles.userRole}>{userData.role || ""}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tab} ${activeTab === 'personal' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setActiveTab('personal')}
          >
            מידע אישי
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : styles.tabInactive}`}
            onClick={() => setActiveTab('history')}
          >
            היסטוריה
          </button>
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          {activeTab === 'personal' ? (
            /* Personal Information Tab */
            <div className={styles.personalInfoSection}>
              {/* First Name Field */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>שם פרטי</label>
                <div className={styles.fieldValue}>{userData.first_name || ""}</div>
              </div>

              {/* Last Name Field */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>שם משפחה</label>
                <div className={styles.fieldValue}>{userData.last_name || ""}</div>
              </div>

              {/* Phone Number Field */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>מס&apos; טלפון</label>
                <div className={styles.fieldValue} dir="ltr" style={{ textAlign: 'right' }}>{userData.phone_number || ""}</div>
              </div>

              {/* Email Field */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>מייל</label>
                <div className={styles.fieldValue} dir="ltr" style={{ textAlign: 'right' }}>{userData.email || ""}</div>
              </div>
            </div>
          ) : (
            /* History Tab */
            <div className={styles.historySection}>
              {activities.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateText}>אין פעילויות עדיין</div>
                </div>
              ) : (
                <div className={styles.activityList}>
                  {filterAttendancePairs(activities).slice(0, 20).map((activity, index) => {
                    const activityDate = new Date(activity.created_at);
                    const day = activityDate.getDate();
                    const month = String(activityDate.getMonth() + 1).padStart(2, '0');
                    const formattedDate = `${day}/${month}`;

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
                              className={styles.activityIconImageNoFilter}
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
                      // Use update_content column if available, otherwise parse from description for backward compatibility
                      if (activity.update_content) {
                        updateDetails = activity.update_content;
                      } else {
                        // Fallback: parse from description for older entries
                        const colonIndex = activity.description.indexOf(':');
                        if (colonIndex !== -1) {
                          mainDescription = activity.description.substring(0, colonIndex + 1);
                          updateDetails = activity.description.substring(colonIndex + 1).trim();
                        }
                      }
                      
                      // Add participant_name to the main description for status updates
                      if (activity.participant_name) {
                        mainDescription = `${mainDescription} ${activity.participant_name}`;
                      }
                    }

                    // Make activities clickable if they have a participant_id
                    const handleActivityClick = () => {
                      if (activity.participant_id) {
                        router.push(`/participant-card?id=${activity.participant_id}`);
                      }
                    };

                    return (
                      <div 
                        key={activity.id || index} 
                        className={styles.activityItem}
                        onClick={handleActivityClick}
                        style={activity.participant_id ? { cursor: 'pointer' } : {}}
                      >
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
          )}
        </div>

        {/* Bottom Section with Action Buttons */}
        <div className={styles.bottomSection}>
          {userData?.role === "מנהל.ת" && (
            <>
              <button
                onClick={() => router.push('/manage-volunteers')}
                className={styles.actionButton}
              >
                ניהול אנשי צוות
              </button>
              <div className={styles.separator}></div>
            </>
          )}
          <button
            onClick={handleSignOut}
            className={styles.actionButton}
          >
            התנתקות
          </button>
        </div>
      </div>
    </main>
  );
}