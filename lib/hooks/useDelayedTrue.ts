"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns `true` only if `condition` stays true for at least `delayMs`.
 * Useful to avoid flashing loading spinners for very fast loads.
 */
export function useDelayedTrue(condition: boolean, delayMs: number) {
  const [delayedTrue, setDelayedTrue] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset immediately when condition turns false
    if (!condition) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDelayedTrue(false);
      return;
    }

    // Condition is true: only flip to true after delay
    if (timeoutRef.current === null) {
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setDelayedTrue(true);
      }, delayMs);
    }

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [condition, delayMs]);

  return delayedTrue;
}

