import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#FFFCE5", // Cream header background
};

export default function EditVolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
