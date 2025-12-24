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
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // 2. If not logged in, kick them back to the home page
        router.push("/");
      } else {
        // 3. Fetch user details from the public 'users' table
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        setUser(dbUser || authUser);
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
  console.log(user)

  return (
    <main className="min-h-screen p-24">
      <div className="max-w-2xl mx-auto border p-8 rounded-lg shadow-lg">
        <div>
          <span className="block sm:inline">היי {user.first_name}! טוב לראות אותך</span>
        </div>
      </div>
    </main>
  );
}