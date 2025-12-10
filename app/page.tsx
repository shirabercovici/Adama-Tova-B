import Image from "next/image";
import GoogleLoginButton from "./login/GoogleLoginButton";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex flex-col gap-8">
        
        {/* Title / Header */}
        <h1 className="text-4xl font-bold">
          Adama Tova
        </h1>
        
        <p className="text-lg mb-8">
          Internal Team System
          <br />
          <span className="text-sm opacity-70">
            Please log in with your approved Google account.
          </span>
        </p>

        {/* The Login Button */}
        <div className="p-8 border rounded-lg shadow-sm bg-white/50 dark:bg-black/20">
            <GoogleLoginButton />
        </div>

      </div>
    </main>
  );
}