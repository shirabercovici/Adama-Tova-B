"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

export default function ProfilePage() {
  // Try to load from localStorage first for instant display
  const [userData, setUserData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userProfileData');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!userData); // Only show loading if no cached data
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const hasFetchedProfileRef = useRef(false);

  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetchedProfileRef.current) {
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
  }, []); // Empty deps - only run once

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7faf3] font-sans" dir="rtl">
        <div className="max-w-md mx-auto bg-[#f7faf3] min-h-screen border-x border-gray-200 relative">
          <BackButton />
          <div className="flex justify-center pt-4">
            <div className="w-24 h-6 bg-black rounded-full"></div>
          </div>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-gray-400">טוען...</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faf3] font-sans" dir="rtl">
      <div className="max-w-md mx-auto bg-[#f7faf3] min-h-screen border-x border-gray-200 relative">
        <BackButton />
        <div className="flex justify-center pt-4">
          <div className="w-24 h-6 bg-black rounded-full"></div>
        </div>

        {/* User Greeting */}
        <div className="flex justify-between items-center px-6 py-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800">היי {userData?.first_name || "לא הוזן"}</h3>
            <p className="text-gray-600">{userData?.role || "לא הוזן"}</p>
          </div>
        </div>

        <div className="px-4 space-y-8">
          {/* Section: Personal Details */}
          <section>
            <h3 className="text-gray-400 text-sm mb-2 px-2">פרטים אישיים</h3>
            <div className="border-t border-gray-800">
              <div className="flex items-center justify-between p-3 border-b border-gray-300">
                <span className="text-gray-600">טלפון:</span>
                <span className="font-medium">{userData?.phone_number || "לא הוזן"}</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-gray-300">
                <span className="text-gray-600">דואל:</span>
                <span className="font-medium">{userData?.email || "לא הוזן"}</span>
              </div>
            </div>
          </section>

          {/* Section: Management */}
          {userData?.role === "מנהל.ת" && (
            <section>
              <h3 className="text-gray-400 text-sm mb-2 px-2">ניהול אנשי צוות</h3>
              <div className="border-y border-gray-300 divide-y divide-gray-300">
                <button
                  onClick={() => router.push('/add-volunteer')}
                  className="w-full text-right p-3 font-bold hover:bg-white/40 transition-colors"
                >
                  הוספת איש צוות
                </button>
                <br></br>
                <button
                  onClick={() => router.push('/manage-volunteers')}
                  className="w-full text-right p-3 font-bold hover:bg-white/40 transition-colors"
                >
                  עריכה/הסר איש צוות
                </button>
              </div>
            </section>
          )}

          {/* Section: Activity History */}
          <section>
            <h3 className="text-gray-400 text-sm mb-2 px-2">היסטוריית הפעילות שלי</h3>
            <div className="border-t border-gray-800">
              {activitiesLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="text-gray-400">טוען פעילויות...</div>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex justify-center items-center p-8">
                  <div className="text-gray-400">אין פעילויות עדיין</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
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
                      <div key={activity.id || index} className="p-3 flex items-start gap-3">
                        <div className="text-[#4D58D8] mt-0.5 flex-shrink-0">
                          {getActivityIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800">{activity.description}</div>
                          <div className="text-xs text-gray-500 mt-1">{formattedDate}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Sign Out Button */}
          <div className="pt-10 pb-20 text-center">
            <br></br>
            <button
              onClick={handleSignOut}
              className="text-lg font-medium border-t border-gray-300 pt-4 w-full text-red-600"
            >
              התנתקות
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}