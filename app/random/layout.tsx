import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#1d1d1d", // Dark background for random page
};

interface Props {
  children: ReactNode[];
}

export default function Layout({ children }: Props) {
  return <div>{children}</div>;
}
