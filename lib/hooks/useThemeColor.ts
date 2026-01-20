import { useEffect, useLayoutEffect } from 'react';

// Use layout effect on the client to avoid a visible "flash" of the previous page's theme-color.
// Fall back to useEffect during SSR.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * A hook to dynamically set the theme-color meta tag.
 * This is used to change the status bar color on mobile devices per page.
 * 
 * @param color The color to set the theme-color to (e.g., "#FFFCE5")
 */
export function useThemeColor(color: string) {
  useIsomorphicLayoutEffect(() => {
    // Check if the meta tag exists
    let metaThemeColor = document.querySelector("meta[name='theme-color']");

    // If not, create it (should exist from layout, but just in case)
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    // Check if apple-mobile-web-app-status-bar-style exists (should be black-translucent from layout)
    let appleMeta = document.querySelector("meta[name='apple-mobile-web-app-status-bar-style']");
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      appleMeta.setAttribute('content', 'black-translucent');
      document.head.appendChild(appleMeta);
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