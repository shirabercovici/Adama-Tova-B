import Link from "next/link";
import { APP_NAME } from "../config";

export default function Navbar() {
  return (
    <header id="navbar">
      <h1>
        <Link href="/">{APP_NAME}</Link>
      </h1>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/participants">משתתפים</Link>
        <Link href="/homepage">דף הבית</Link>
        <Link href="/new-participant">פונה חדש</Link>
        <Link href="/profile">פרופיל</Link>
      </nav>
    </header>
  );
}
