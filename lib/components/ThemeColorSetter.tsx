"use client";

import { useThemeColor } from "@/lib/hooks/useThemeColor";

export default function ThemeColorSetter({ color }: { color: string }) {
  useThemeColor(color);
  return null;
}

