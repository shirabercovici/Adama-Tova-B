import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("email")
        .eq("email", data.user.email)
        .single();

      if (!existingUser) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
      }

      return NextResponse.redirect(`${requestUrl.origin}/homepage`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`);
}