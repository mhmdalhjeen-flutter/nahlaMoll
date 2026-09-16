'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates numeric changes (e.g. 35 → 52) without polling.
 */
export function useAnimatedNumber(target: number, durationMs = 550): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (Math.abs(from - to) < 0.01) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return display;
}
