import { useEffect, useLayoutEffect } from 'react';

// Use layout effect on the client to avoid a visible "flash" of the previous page's theme-color.
// Fall back to useEffect during SSR.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * A hook to dynamically set the theme-color meta tag.
 * 
 * NOTE: For static theme colors, use the Next.js viewport export instead:
 *   export const viewport: Viewport = { themeColor: "#4D58D8" };
 * 
 * This hook should only be used for dynamic theme colors that change based on
 * runtime data (e.g., participant archived status).
 * 
 * @param color The color to set the theme-color to (e.g., "#FFFCE5")
 */
export function useThemeColor(color: string) {
  useIsomorphicLayoutEffect(() => {
    // Remove any duplicate theme-color meta tags first
    const allThemeColorTags = document.querySelectorAll("meta[name='theme-color']");
    // Keep only the first one (created by Next.js viewport export)
    for (let i = 1; i < allThemeColorTags.length; i++) {
      allThemeColorTags[i].remove();
    }

    // Get the single remaining meta tag (should be created by Next.js viewport export)
    let metaThemeColor = document.querySelector("meta[name='theme-color']");

    // If not, create it (fallback for edge cases)
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    // Store the previous color BEFORE updating (captures current state at mount/re-render)
    // This ensures we can revert to the color that was active before this component mounted
    const previousColor = metaThemeColor.getAttribute("content");

    // Always update to the new color
    metaThemeColor.setAttribute("content", color);

    // Also update body background color to match (for iOS safe areas/home indicator)
    document.body.style.backgroundColor = color;
    document.documentElement.style.backgroundColor = color;

    // Cleanup: revert to the previous color
    return () => {
      if (previousColor && metaThemeColor) {
        metaThemeColor.setAttribute("content", previousColor);
        // We generally don't revert body color here to prevent flashing,
        // as the next page's hook will run immediately and set its own color.
      }
    };
  }, [color]);
}