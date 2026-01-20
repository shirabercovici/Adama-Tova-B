import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#FFFCE5", // Cream header background
};

export default function NewParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
