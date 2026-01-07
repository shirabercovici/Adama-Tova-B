"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
      // 1. Get the authenticated user from Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/");
        return;
      }

      // 2. Fetch details from the 'users' table using the email (matching homepage logic)
      const { data: dbUser, error } = await supabase
        .from("users")
        .select("*") // Selecting all columns like the homepage
        .eq("email", authUser.email)
        .single();

      if (!error && dbUser) {
        // Set state to the database user data
        setUserData(dbUser);
      } else {
        // Fallback to auth data if the database record isn't found
        setUserData(authUser);
      }

      setLoading(false);
    };

    getProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f7faf3]">טוען...</div>;

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