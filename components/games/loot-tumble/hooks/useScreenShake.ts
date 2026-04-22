'use client';

import { useCallback } from 'react';
import { useAnimationControls } from 'framer-motion';

/**
 * Escalating screen shake tied to cascade depth.
 *
 * - cascadeDepth 1: subtle nudge (2px)
 * - cascadeDepth 2: noticeable shake (5px)
 * - cascadeDepth 3+: heavy pumping that scales up (8-16px+)
 *
 * Each successive cascade hit produces a single sharp "hammer" impact,
 * building intensity like a pumping engine.
 */
export function useScreenShake() {
  const shakeControls = useAnimationControls();

  const triggerShake = useCallback(
    (cellCount: number, cascadeDepth: number = 1) => {
      // Base intensity from cells removed (subtle)
      const cellFactor = Math.min(cellCount * 0.3, 4);

      // Cascade depth multiplier: escalates HARD after depth 2
      // depth 1 → 1x, depth 2 → 2x, depth 3 → 3.5x, depth 4 → 5.5x, depth 5+ → 8x+
      const depthMultiplier = cascadeDepth <= 1
        ? 1
        : cascadeDepth <= 2
          ? 2
          : 1 + cascadeDepth * 1.5;

      const intensity = Math.min((1 + cellFactor) * depthMultiplier, 20);

      // Duration gets shorter at high intensity (rapid punchy hits)
      const duration = Math.max(0.35 - cascadeDepth * 0.03, 0.15);

      // At high cascade depth, add vertical "slam" component
      const verticalSlam = cascadeDepth >= 3;

      shakeControls.start({
        x: [
          0,
          -intensity,
          intensity * 0.8,
          -intensity * 0.6,
          intensity * 0.4,
          -intensity * 0.2,
          0,
        ],
        y: verticalSlam
          ? [
            0,
            intensity * 0.7,
            -intensity * 0.5,
            intensity * 0.3,
            -intensity * 0.15,
            0,
          ]
          : [
            0,
            intensity * 0.2,
            -intensity * 0.15,
            intensity * 0.1,
            0,
          ],
        transition: { duration, ease: 'easeOut' },
      });
    },
    [shakeControls],
  );

  return { shakeControls, triggerShake };
}
