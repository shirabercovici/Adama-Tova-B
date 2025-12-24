"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      // 1. Get the current logged-in user from Supabase
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // 2. If not logged in, kick them back to the home page
        router.push("/");
      } else {
        // 3. If logged in, save the user info to display
        setUser(user);
      }
    };

    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-24">
      <div className="max-w-2xl mx-auto border p-8 rounded-lg shadow-lg">
        <div>
          <span className="block sm:inline">היי {user.email}! טוב שאתה איתנו</span>
        </div>

        <button 
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}