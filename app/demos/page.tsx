import Link from "next/link";

import { DEMOS } from "@/lib/config";

export default function Demos() {
  return (
    <main>
      {DEMOS.map((demo) => (
        <div key={demo.slug} className="demo-item">
          <h2>{demo.title}</h2>
          <p>{demo.description}</p>
          <Link className="button" href={demo.slug}>
            See it →
          </Link>
        </div>
      ))}
    </main>
  );
}
