import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  appleWebApp: {
    statusBarStyle: "default", // Remove blue status bar on iOS
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFCE5", // Cream color instead of blue
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
