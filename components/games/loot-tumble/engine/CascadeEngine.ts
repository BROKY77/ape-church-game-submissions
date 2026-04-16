import { BonusMode, Grid, Cluster, CascadeStep, GridCell } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { detectClusters, getAllClusterCells } from './ClusterDetector';
import { cloneGrid, nextCellKey } from './Grid';
import { createRandomCell } from './SymbolGenerator';
import { SYMBOL_MAP } from '@/components/games/loot-tumble/config/symbols';

/**
 * Calculate win amount for clusters
 */
export function calculateClusterWin(clusters: Cluster[], betAmount: number): number {
  let total = 0;
  for (const cluster of clusters) {
    const symbol = SYMBOL_MAP[cluster.symbolId];
    const sizePayout = GAME_CONFIG.clusterPayouts[Math.min(cluster.size, 15)] ?? 
                       GAME_CONFIG.clusterPayouts[15] ?? 100;
    // Higher tier symbols (lower tier number) pay more
    const tierMultiplier = (9 - (symbol?.tier ?? 8));
    total += betAmount * sizePayout * tierMultiplier;
  }
  return total;
}

/**
 * Remove cluster cells from grid, apply gravity, fill new symbols
 * Returns the cascade step data for animation
 */
export function performCascade(
  grid: Grid,
  clusters: Cluster[],
  mode: BonusMode,
): { newGrid: Grid; step: CascadeStep } {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = cloneGrid(grid);

  // 1. Get all cells to remove
  const removedCells = getAllClusterCells(clusters);
  const removedSet = new Set(removedCells.map(c => `${c.row},${c.col}`));

  // 2. Process each column for gravity
  const fallenCells: CascadeStep['fallenCells'] = [];
  const newCells: GridCell[] = [];

  for (let col = 0; col < cols; col++) {
    // Collect non-removed symbols from bottom to top
    const surviving: GridCell[] = [];
    for (let row = rows - 1; row >= 0; row--) {
      if (!removedSet.has(`${row},${col}`)) {
        surviving.push(newGrid[row][col]);
      }
    }

    // Place surviving symbols at bottom, track movements
    let writeRow = rows - 1;
    for (const cell of surviving) {
      if (cell.row !== writeRow) {
        fallenCells.push({
          from: { row: cell.row, col: cell.col },
          to: { row: writeRow, col },
          symbolId: cell.symbolId,
        });
      }
      newGrid[writeRow][col] = {
        ...cell,
        row: writeRow,
        col,
      };
      writeRow--;
    }

    // Fill remaining top rows with new symbols
    for (let row = writeRow; row >= 0; row--) {
      const newCell: GridCell = createRandomCell(row, col, nextCellKey(), mode);
      newGrid[row][col] = newCell;
      newCells.push(newCell);
    }
  }

  // 3. Detect new clusters in the cascaded grid
  const newClusters = detectClusters(newGrid);

  return {
    newGrid,
    step: {
      removedCells,
      fallenCells,
      newCells,
      newClusters,
      stepWin: 0, // Calculated by caller
    },
  };
}

/**
 * Run the full cascade chain until no more clusters form
 * Returns all cascade steps for animation sequencing
 */
export function runFullCascade(
  initialGrid: Grid,
  initialClusters: Cluster[],
  betAmount: number,
  mode: BonusMode,
): { finalGrid: Grid; cascades: CascadeStep[]; totalWin: number } {
  const cascades: CascadeStep[] = [];
  let currentGrid = initialGrid;
  let currentClusters = initialClusters;
  let totalWin = 0;

  while (currentClusters.length > 0) {
    // Calculate win for current clusters
    const stepWin = calculateClusterWin(currentClusters, betAmount);
    totalWin += stepWin;

    // Perform cascade
    const { newGrid, step } = performCascade(currentGrid, currentClusters, mode);
    step.stepWin = stepWin;
    cascades.push(step);

    // Update for next iteration
    currentGrid = newGrid;
    currentClusters = step.newClusters;
  }

  return { finalGrid: currentGrid, cascades, totalWin };
}
