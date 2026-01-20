import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  appleWebApp: {
    statusBarStyle: "default",
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
  return <>{children}</>;
}
