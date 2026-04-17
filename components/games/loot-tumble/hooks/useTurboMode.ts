'use client';

import { useState, useCallback } from 'react';

interface UseTurboModeReturn {
  turboEnabled: boolean;
  toggleTurbo: () => void;
  speedMultiplier: number;
}

export function useTurboMode(): UseTurboModeReturn {
  const [turboEnabled, setTurboEnabled] = useState<boolean>(false);

  const toggleTurbo = useCallback(() => {
    setTurboEnabled((prev) => !prev);
  }, []);

  const speedMultiplier = turboEnabled ? 0.5 : 1.0;

  return {
    turboEnabled,
    toggleTurbo,
    speedMultiplier,
  };
}
