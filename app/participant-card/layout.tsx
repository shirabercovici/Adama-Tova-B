import type { Viewport } from "next";

// Default viewport for non-archived participants (most common case)
// Dynamic color changes are handled by useThemeColor hook in the page:
//   - Non-archived: #4D58D8 (purple)
//   - Archived: #949ADD (light blue)
export const viewport: Viewport = {
  themeColor: "#4D58D8", // Default purple header background (non-archived)
};

export default function ParticipantCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
