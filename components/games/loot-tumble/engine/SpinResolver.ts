import { BonusMode, Grid, SpinResult } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { createGrid } from './Grid';
import { detectClusters } from './ClusterDetector';
import { runFullCascade } from './CascadeEngine';

function getLargestTouchingScatterCount(grid: Grid): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  let largestClusterSize = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (visited[row][col]) continue;

      visited[row][col] = true;
      if (grid[row][col].symbolId !== 'scatter') {
        continue;
      }

      let clusterSize = 0;
      const queue: { row: number; col: number }[] = [{ row, col }];

      while (queue.length > 0) {
        const current = queue.shift()!;
        clusterSize += 1;

        const neighbors = [
          { row: current.row - 1, col: current.col },
          { row: current.row + 1, col: current.col },
          { row: current.row, col: current.col - 1 },
          { row: current.row, col: current.col + 1 },
        ];

        for (const neighbor of neighbors) {
          if (
            neighbor.row < 0 ||
            neighbor.row >= rows ||
            neighbor.col < 0 ||
            neighbor.col >= cols ||
            visited[neighbor.row][neighbor.col] ||
            grid[neighbor.row][neighbor.col].symbolId !== 'scatter'
          ) {
            continue;
          }

          visited[neighbor.row][neighbor.col] = true;
          queue.push(neighbor);
        }
      }

      largestClusterSize = Math.max(largestClusterSize, clusterSize);
    }
  }

  return largestClusterSize;
}

function sumVisibleMultipliers(grid: Grid): number {
  return grid.flat().reduce((total, cell) => total + (cell.multiplierValue ?? 0), 0);
}

function getAwardedFreeSpins(mode: BonusMode, scatterCount: number): number {
  if (scatterCount < GAME_CONFIG.bonus.triggerScatterCount) {
    return 0;
  }

  return mode === 'BONUS'
    ? GAME_CONFIG.bonus.retriggerFreeSpins
    : GAME_CONFIG.bonus.entryFreeSpins;
}

/**
 * Dummy spin resolver â€” generates a random grid and resolves all cascades.
 * In production, this would call a backend API.
 */
export async function resolveSpin(
  betAmount: number,
  mode: BonusMode = 'BASE',
): Promise<SpinResult> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const grid = createGrid(undefined, undefined, mode);
  const clusters = detectClusters(grid);
  const { finalGrid, cascades, totalWin: totalWinBeforeMultiplier } = runFullCascade(
    grid,
    clusters,
    betAmount,
    mode,
  );

  const scatterCount = getLargestTouchingScatterCount(finalGrid);
  const awardedFreeSpins = getAwardedFreeSpins(mode, scatterCount);
  const multiplierTotal = mode === 'BONUS' ? sumVisibleMultipliers(finalGrid) : 0;
  const totalWin =
    mode === 'BONUS' && totalWinBeforeMultiplier > 0 && multiplierTotal > 0
      ? totalWinBeforeMultiplier * multiplierTotal
      : totalWinBeforeMultiplier;

  return {
    grid,
    finalGrid,
    clusters,
    cascades,
    totalWin,
    totalWinBeforeMultiplier,
    scatterCount,
    awardedFreeSpins,
    multiplierTotal,
  };
}

/**
 * Deterministic spin for testing â€” uses seeded grid.
 */
export async function resolveTestSpin(
  betAmount: number,
  seedGrid: Grid,
  mode: BonusMode = 'BASE',
): Promise<SpinResult> {
  const clusters = detectClusters(seedGrid);
  const { finalGrid, cascades, totalWin: totalWinBeforeMultiplier } = runFullCascade(
    seedGrid,
    clusters,
    betAmount,
    mode,
  );

  const scatterCount = getLargestTouchingScatterCount(finalGrid);
  const awardedFreeSpins = getAwardedFreeSpins(mode, scatterCount);
  const multiplierTotal = mode === 'BONUS' ? sumVisibleMultipliers(finalGrid) : 0;
  const totalWin =
    mode === 'BONUS' && totalWinBeforeMultiplier > 0 && multiplierTotal > 0
      ? totalWinBeforeMultiplier * multiplierTotal
      : totalWinBeforeMultiplier;

  return {
    grid: seedGrid,
    finalGrid,
    clusters,
    cascades,
    totalWin,
    totalWinBeforeMultiplier,
    scatterCount,
    awardedFreeSpins,
    multiplierTotal,
  };
}
