import Link from "next/link";
import { APP_NAME } from "../config";

export default function Navbar() {
  return (
    <header id="navbar">
      <h1>
        <Link href="/">{APP_NAME}</Link>
      </h1>
      <nav>
        <Link href="/homepage">Home</Link>
        <Link href="/new-participant">New Participant</Link>
        <Link href="/profile">Profile</Link>
      </nav>
    </header>
  );
}
