export const GAME_CONFIG = {
  gridRows: 6,
  gridCols: 5,
  minClusterSize: 5,
  startingBalance: 1000,
  defaultBet: 1,
  betOptions: [0.5, 1, 2, 5, 10, 25],
  // Payout multipliers by cluster size (dummy values)
  clusterPayouts: {
    5: 2,
    6: 3,
    7: 5,
    8: 8,
    9: 12,
    10: 15,
    11: 20,
    12: 30,
    13: 50,
    14: 75,
    15: 100,
  } as Record<number, number>,
  // Animation timing (ms)
  animation: {
    spinDuration: 1200, // Base spin duration before columns start landing
    landStagger: 40,
    clusterHighlight: 800,
    symbolRemove: 200,
    gravityFall: 500,
    newSymbolDrop: 400,
    cascadePause: 150,
    winDisplay: 2000,
  },
  bonus: {
    triggerScatterCount: 3,
    entryFreeSpins: 5,
    retriggerFreeSpins: 3,
    multiplierValues: [2, 3, 5, 10, 25, 50, 100],
    multiplierWeights: [36, 26, 18, 10, 6, 3, 1],
  },
};
