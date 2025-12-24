"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
      }
    };
    getUser();
  }, [router, supabase]);

  if (!user) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-24">
      <div className="max-w-2xl mx-auto border p-8 rounded-lg shadow-lg bg-white">
        <h1 className="text-3xl font-bold mb-6">User Profile</h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <div className="mt-1 text-lg">{user.email}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <div className="mt-1 text-sm font-mono bg-gray-100 p-2 rounded">{user.id}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Sign In</label>
            <div className="mt-1 text-sm text-gray-600">
              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
