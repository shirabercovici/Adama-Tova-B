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
    // Always try to detect the header's background color first (most accurate)
    // Use passed color only as fallback if detection fails
    let finalColor: string | null = null;
    
    // Try to find the header element at the top of the page and get its background color
    // Priority: elements with inline backgroundColor style > .header class > header tag > elements near top
    const candidates: HTMLElement[] = [];
    
    // 1. Check for elements with inline backgroundColor (like participant-card)
    document.querySelectorAll('[style*="backgroundColor"], [style*="background-color"]').forEach(el => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      // Check if it's near the top (likely a header)
      if (rect.top <= 100 && rect.height > 20) {
        candidates.push(htmlEl);
      }
    });
    
    // 2. Check for .header class elements
    document.querySelectorAll('.header, [class*="header"], [class*="Header"]').forEach(el => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.top <= 100 && rect.height > 20) {
        candidates.push(htmlEl);
      }
    });
    
    // 3. Check for header tag
    document.querySelectorAll('header').forEach(el => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      if (rect.top <= 100 && rect.height > 20) {
        candidates.push(htmlEl);
      }
    });
    
    // Sort by top position (closest to top wins)
    candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    
    // Get background color from the topmost candidate
    for (const headerElement of candidates) {
      const bgColor = window.getComputedStyle(headerElement).backgroundColor;
      // Check if it's not transparent and not the default
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgColor !== 'rgb(255, 255, 255)') {
        // Convert rgb/rgba to hex if needed
        if (bgColor.startsWith('rgb')) {
          const rgb = bgColor.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);
            finalColor = `#${[r, g, b].map(x => {
              const hex = x.toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('')}`;
            break;
          }
        } else if (bgColor.startsWith('#')) {
          finalColor = bgColor;
          break;
        }
      }
    }
    
    // Fallback to passed color, then a neutral dark gray (so it doesn't look like a bug)
    if (!finalColor) {
      finalColor = color || '#111827'; // slate-900
    }
    // IMPORTANT: Next.js can generate multiple theme-color tags (e.g. from `viewport.themeColor`
    // plus any manual tag in layout). Some browsers apply the *last* one.
    // So we must update ALL of them to avoid the status bar getting "stuck" until refresh.
    let themeColorMetas = Array.from(
      document.querySelectorAll("meta[name='theme-color']")
    ) as HTMLMetaElement[];

    // If none exist, create one (should exist from layout, but just in case)
    if (themeColorMetas.length === 0) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
      themeColorMetas = [meta];
    }

    // For PWA: Ensure we have a single, authoritative theme-color meta tag at the end of <head>
    // Some browsers (especially in PWA mode) prefer the last meta tag
    // Remove duplicates and keep only one, placed at the end
    if (themeColorMetas.length > 1) {
      // Keep the first one, remove the rest
      for (let i = 1; i < themeColorMetas.length; i++) {
        themeColorMetas[i].remove();
      }
      themeColorMetas = [themeColorMetas[0]];
      // Move it to the end of head to ensure it's the "last" one
      themeColorMetas[0].remove();
      document.head.appendChild(themeColorMetas[0]);
    }

    // Check if apple-mobile-web-app-status-bar-style exists (should be black-translucent from layout)
    let appleMeta = document.querySelector("meta[name='apple-mobile-web-app-status-bar-style']");
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      appleMeta.setAttribute('content', 'black-translucent');
      document.head.appendChild(appleMeta);
    }

    // Capture previous values for cleanup
    const previousThemeColors = themeColorMetas.map((m) => m.getAttribute("content"));

    // Always update to the new color (update all theme-color metas)
    // Use both setAttribute and direct property assignment for maximum compatibility
    themeColorMetas.forEach((m) => {
      m.setAttribute("content", finalColor);
      // Some browsers read the `.content` property; keep both in sync.
      m.content = finalColor;
    });

    // For PWA: Also update viewport themeColor if it exists (Next.js generates this)
    const viewportMeta = document.querySelector("meta[name='viewport']");
    if (viewportMeta) {
      // Some browsers also check viewport meta for theme color hints
      // We can't modify viewport directly, but we ensure theme-color is correct
    }

    // Also update body/html background color to match (for iOS safe areas/home indicator)
    // This is critical for iOS PWA where black-translucent shows the page background
    document.body.style.backgroundColor = finalColor;
    document.documentElement.style.backgroundColor = finalColor;
    
    // Force a reflow to ensure browsers pick up the change immediately
    void document.documentElement.offsetHeight;

    // Cleanup: revert to the previous color
    return () => {
      themeColorMetas.forEach((m, idx) => {
        const prev = previousThemeColors[idx];
        if (prev) {
          m.setAttribute("content", prev);
          m.content = prev;
        }
        // We generally don't revert body color here to prevent flashing,
        // as the next page's hook will run immediately and set its own color.
      });
    };
  }, [color]);
}