import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // 1. Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      const userEmail = data.user.email;

      // 2. CHECK: Does this email exist in your 'users' table?
      const { data: existingUser, error: dbError } = await supabase
        .from("users")
        .select("email")
        .eq("email", userEmail)
        .single();

      if (dbError || !existingUser) {
        // 3. REJECT: Sign out and redirect to login with error
        await supabase.auth.signOut();
        return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
      }

      // 4. ALLOW: User is in the table, proceed to homepage
      return NextResponse.redirect(`${requestUrl.origin}/homepage`);
    }
  }

  // Fallback for errors
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}