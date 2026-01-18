import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import GoogleLoginButton from "./GoogleLoginButton";

export default async function Login({
  searchParams,
}: {
  searchParams: { message: string, error?: string };
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*/ If we want to restirct the accsess to only users that are in this list, this is the correct code line
  if (user) return <div className={styles.loginForm}>hello {user.email}</div>;/*/

  if (user) {
    return redirect("/");
  }

  // Handle unauthorized error (email not in database)
  if (searchParams?.error === "unauthorized") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: "#FFFCE5",
          margin: 0,
          padding: 0,
          position: "relative",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: "90px", // Space for footer
        }}
      >
        <div style={{ position: "relative", width: "180px", height: "180px" }}>
          <Image
            src="/loading.svg"
            alt="Loading..."
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <div style={{ position: "relative", width: "125px", height: "40px", marginTop: "24px" }}>
          <Image
            src="/ADAMAMI.svg"
            alt="ADAMAMI"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <div style={{
          fontFamily: "EditorSans_PRO, sans-serif",
          fontSize: "1.5rem",
          fontWeight: 400,
          fontStyle: "italic",
          color: "#4D58D8",
          textAlign: "center",
          marginTop: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <p style={{ margin: 0 }}>לצערנו המייל לא קיים במאגר</p>
          <p style={{ margin: 0 }}>יש לפנות למנהל.ת לעזרה</p>
        </div>

        {/* Yellow Footer with Return Button */}
        <div
          style={{
            width: "100%",
            height: "90px",
            backgroundColor: "#FFF2A8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <Link
            href="/"
            style={{
              background: "transparent",
              border: "none",
              color: "#4D58D8",
              fontFamily: "EditorSans_PRO, sans-serif",
              fontSize: "1.875rem",
              fontStyle: "normal",
              fontWeight: 400,
              textDecoration: "none",
              cursor: "pointer",
              padding: "10px",
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            חזרה למסך ההתחברות
          </Link>
        </div>
      </div>
    );
  }

  const signIn = async (formData: FormData) => {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return redirect("/login?message=Could not authenticate user");
    }
    return redirect("/");
  };

  const signUp = async (formData: FormData) => {
    "use server";
    const origin = headers().get("origin");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      return redirect("/login?message=Could not authenticate user");
    }
    return redirect("/login?message=Check email to continue sign in process");
  };

  return (
    <div className="content">
      <form className={styles.loginForm} action={signIn}>
        <label htmlFor="email">
          Email <input name="email" placeholder="you@example.com" required />
        </label>

        <label htmlFor="password">
          Password{" "}
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="on"
            required
          />
        </label>

        <button>Log In</button>
        <button formAction={signUp}>Sign Up</button>
        {searchParams?.message && (
          <p className={styles.errorMessage}>{searchParams.message}</p>
        )}
        <GoogleLoginButton />
      </form>
    </div>
  );
}
