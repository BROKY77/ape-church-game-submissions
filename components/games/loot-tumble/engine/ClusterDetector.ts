import { Grid, Cluster } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { SYMBOL_MAP } from '@/components/games/loot-tumble/config/symbols';

/**
 * Find all symbol clusters based on total count across the entire grid.
 * A cluster = 5+ of the same symbol appearing anywhere on the grid,
 * regardless of adjacency. This matches on-chain math used by Reel Pirates
 * and Blizzard Blitz — the chain simply counts symbol occurrences.
 */
export function detectClusters(grid: Grid): Cluster[] {
  const symbolCells = new Map<string, { row: number; col: number }[]>();

  // Tally every regular symbol and record its cell positions
  for (const row of grid) {
    for (const cell of row) {
      const symbol = SYMBOL_MAP[cell.symbolId];
      if (!symbol || symbol.kind !== 'regular') continue;

      if (!symbolCells.has(cell.symbolId)) {
        symbolCells.set(cell.symbolId, []);
      }
      symbolCells.get(cell.symbolId)!.push({ row: cell.row, col: cell.col });
    }
  }

  // Any symbol that meets the minimum count threshold becomes a cluster
  const clusters: Cluster[] = [];
  for (const [symbolId, cells] of symbolCells) {
    if (cells.length >= GAME_CONFIG.minClusterSize) {
      clusters.push({
        symbolId,
        cells,
        size: cells.length,
      });
    }
  }

  return clusters;
}

/**
 * Check if a specific cell is part of any cluster
 */
export function isCellInCluster(clusters: Cluster[], row: number, col: number): boolean {
  return clusters.some(cluster =>
    cluster.cells.some(cell => cell.row === row && cell.col === col)
  );
}

/**
 * Get the cluster a cell belongs to (if any)
 */
export function getCellCluster(clusters: Cluster[], row: number, col: number): Cluster | null {
  return clusters.find(cluster =>
    cluster.cells.some(cell => cell.row === row && cell.col === col)
  ) ?? null;
}

/**
 * Get all unique cell positions across all clusters
 */
export function getAllClusterCells(clusters: Cluster[]): { row: number; col: number }[] {
  const seen = new Set<string>();
  const cells: { row: number; col: number }[] = [];

  for (const cluster of clusters) {
    for (const cell of cluster.cells) {
      const key = `${cell.row},${cell.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        cells.push(cell);
      }
    }
  }

  return cells;
}
