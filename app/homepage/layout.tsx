import type { Metadata, Viewport } from "next";
import ThemeColorSetter from "@/lib/components/ThemeColorSetter";

export const metadata: Metadata = {
  appleWebApp: {
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#4D58D8", // Blue color for status bar
};

export default function HomepageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeColorSetter color="#4D58D8" />
      {children}
    </>
  );
}
