import { useEffect, useLayoutEffect } from 'react';

// Use layout effect on the client to avoid a visible "flash" of the previous page's theme-color.
// Fall back to useEffect during SSR.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * A hook to dynamically set the theme-color meta tag based on the header's background color.
 * This is used to change the status bar color on mobile devices per page.
 * 
 * @param color The color to set the theme-color to (e.g., "#FFFCE5")
 *              If null/undefined, will auto-detect from the page header
 */
export function useThemeColor(color?: string | null) {
  useIsomorphicLayoutEffect(() => {
    const computeFinalColor = () => {
      // FORCE status bar color to always use --color-background in ALL modes.
      // Ignore any page-provided colors and ignore auto-detection logic.
      let cssVar = "";
      try {
        cssVar = window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--color-background")
          .trim();
      } catch {
        // ignore
      }
      // Default to the value defined in global.css
      return cssVar || "#FFFCE5";

    };

    const applyThemeColor = (finalColor: string) => {
      // IMPORTANT: Next.js can generate multiple theme-color tags (e.g. from `viewport.themeColor`
      // plus any manual tag in layout). Some browsers apply the *last* one.
      // Next can also generate multiple theme-color tags (sometimes with `media`).
      // Deleting duplicates can break which one the browser chooses; instead:
      // - Update all existing theme-color metas
      // - Ensure we append ONE dedicated, "last" meta tag without media that always wins in PWA.
      const themeColorMetas = Array.from(
        document.querySelectorAll("meta[name='theme-color']")
      ) as HTMLMetaElement[];

      themeColorMetas.forEach((m) => {
        m.setAttribute("content", finalColor);
        m.content = finalColor;
      });

      // Ensure there is a dedicated last meta tag (no `media`) that browsers can pick up reliably.
      let lastMeta = document.querySelector(
        "meta[name='theme-color'][data-dynamic-theme-color='true']"
      ) as HTMLMetaElement | null;
      if (!lastMeta) {
        lastMeta = document.createElement("meta");
        lastMeta.setAttribute("name", "theme-color");
        lastMeta.setAttribute("data-dynamic-theme-color", "true");
        document.head.appendChild(lastMeta);
      } else {
        // Move to the end of <head> to be the authoritative "last" meta tag.
        lastMeta.remove();
        document.head.appendChild(lastMeta);
      }
      lastMeta.setAttribute("content", finalColor);
      lastMeta.content = finalColor;

      // Ensure iOS "black-translucent" mode is enabled so the page background shows.
      let appleMeta = document.querySelector(
        "meta[name='apple-mobile-web-app-status-bar-style']"
      );
      if (!appleMeta) {
        appleMeta = document.createElement("meta");
        appleMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
        appleMeta.setAttribute("content", "black-translucent");
        document.head.appendChild(appleMeta);
      }

      // Also update body/html background color to match (for iOS safe areas/home indicator)
      document.body.style.backgroundColor = finalColor;
      document.documentElement.style.backgroundColor = finalColor;

      // Force a reflow to ensure browsers pick up the change immediately
      void document.documentElement.offsetHeight;
    };

    // First pass: set immediately.
    applyThemeColor(computeFinalColor());

    // Second pass: some pages render header/content after data loads or after transitions.
    // Re-apply on next frame so PWA/standalone reliably updates.
    let raf = window.requestAnimationFrame(() => {
      applyThemeColor(computeFinalColor());
    });
    // Third pass: Next.js can also update <head> slightly after route transitions.
    // A short timeout helps ensure our theme-color ends up as the last/authoritative value in PWA.
    const t = window.setTimeout(() => {
      applyThemeColor(computeFinalColor());
    }, 50);

    // NOTE: We intentionally do NOT "revert" theme-color in cleanup.
    // During client navigations, the previous page's cleanup can run *after* the next page
    // has already set its theme-color, causing the status bar to get stuck on the wrong color.
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, []);
}
