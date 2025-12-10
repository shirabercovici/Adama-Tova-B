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
        <h1 className="text-3xl font-bold mb-4">Internal Dashboard</h1>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Success! </strong>
          <span className="block sm:inline">You are logged in.</span>
        </div>

        <div className="space-y-4">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> <span className="text-sm font-mono bg-gray-100 p-1 rounded">{user.id}</span></p>
        </div>

        <button 
          onClick={handleLogout}
          className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}