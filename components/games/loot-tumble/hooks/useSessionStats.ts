'use client';

import { useState, useCallback } from 'react';

export interface SessionStats {
  totalSpins: number;
  totalWagered: number;
  totalWon: number;
  biggestWin: number;
  netPnL: number;
}

const INITIAL_STATS: SessionStats = {
  totalSpins: 0,
  totalWagered: 0,
  totalWon: 0,
  biggestWin: 0,
  netPnL: 0,
};

interface UseSessionStatsReturn {
  stats: SessionStats;
  recordSpin: (betAmount: number, winAmount: number) => void;
  resetStats: () => void;
}

export function useSessionStats(): UseSessionStatsReturn {
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);

  const recordSpin = useCallback((betAmount: number, winAmount: number) => {
    setStats((prev) => {
      const totalWagered = prev.totalWagered + betAmount;
      const totalWon = prev.totalWon + winAmount;
      return {
        totalSpins: prev.totalSpins + 1,
        totalWagered,
        totalWon,
        biggestWin: Math.max(prev.biggestWin, winAmount),
        netPnL: totalWon - totalWagered,
      };
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats(INITIAL_STATS);
  }, []);

  return { stats, recordSpin, resetStats };
}

