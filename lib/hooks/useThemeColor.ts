import { useEffect } from 'react';

/**
 * A hook to dynamically set the theme-color meta tag.
 * This is used to change the status bar color on mobile devices per page.
 * 
 * @param color The color to set the theme-color to (e.g., "#FFFCE5")
 */
export function useThemeColor(color: string) {
  useEffect(() => {
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

    // Store original color to revert later (optional, but good practice)
    const originalColor = metaThemeColor.getAttribute("content");

    // Update the color
    metaThemeColor.setAttribute("content", color);

    // Cleanup: revert to original color or default purple
    return () => {
      if (originalColor) {
        metaThemeColor.setAttribute("content", originalColor);
      }
    };
  }, [color]);
}
