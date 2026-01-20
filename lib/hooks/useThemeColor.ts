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
      // If we are running as an installed PWA (standalone), force a consistent status bar color.
      // This avoids device/browser-specific caching quirks where theme-color can get "stuck".
      const isStandalonePwa =
        (typeof window !== "undefined" &&
          window.matchMedia?.("(display-mode: standalone)")?.matches) ||
        // iOS Safari "Add to Home Screen" legacy flag
        (typeof window !== "undefined" && (window.navigator as any)?.standalone === true);

      if (isStandalonePwa) {
        // Prefer the design system background color.
        const cssVar = window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--color-background")
          .trim();
        return cssVar || "#FFFCE5";
      }

      // If a color is explicitly provided by the page, treat it as authoritative.
      // Auto-detection is useful when the page doesn't know its final header color,
      // but it can pick the wrong element (especially with fixed overlays).
      if (color) return color;

      // Always try to detect the header's background color first (most accurate)
      // Use passed color only as fallback if detection fails
      let finalColor: string | null = null;

      // Try to find the header element at the top of the page and get its background color
      // Priority: elements with inline backgroundColor style > .header class > header tag > elements near top
      const candidates: HTMLElement[] = [];

      // 1. Check for elements with inline backgroundColor (like participant-card)
      document
        .querySelectorAll('[style*="backgroundColor"], [style*="background-color"]')
        .forEach((el) => {
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          // Check if it's near the top (likely a header)
          if (rect.top <= 100 && rect.height > 20) {
            candidates.push(htmlEl);
          }
        });

      // 2. Check for .header class elements
      document
        .querySelectorAll(".header, [class*='header'], [class*='Header']")
        .forEach((el) => {
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          if (rect.top <= 100 && rect.height > 20) {
            candidates.push(htmlEl);
          }
        });

      // 3. Check for header tag
      document.querySelectorAll("header").forEach((el) => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.top <= 100 && rect.height > 20) {
          candidates.push(htmlEl);
        }
      });

      // Sort by top position (closest to top wins)
      candidates.sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      );

      // Get background color from the topmost candidate
      for (const headerElement of candidates) {
        const bgColor = window.getComputedStyle(headerElement).backgroundColor;
        // Check if it's not transparent and not the default
        if (
          bgColor &&
          bgColor !== "rgba(0, 0, 0, 0)" &&
          bgColor !== "transparent" &&
          bgColor !== "rgb(255, 255, 255)"
        ) {
          // Convert rgb/rgba to hex if needed
          if (bgColor.startsWith("rgb")) {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]);
              const g = parseInt(rgb[1]);
              const b = parseInt(rgb[2]);
              finalColor = `#${[r, g, b]
                .map((x) => {
                  const hex = x.toString(16);
                  return hex.length === 1 ? "0" + hex : hex;
                })
                .join("")}`;
              break;
            }
          } else if (bgColor.startsWith("#")) {
            finalColor = bgColor;
            break;
          }
        }
      }

      // Fallback to a neutral dark gray (so it doesn't look like a bug)
      return finalColor || "#111827"; // slate-900
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
  }, [color]);
}
