import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  appleWebApp: {
    statusBarStyle: "default",
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
