import { Grid, Cluster } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { SYMBOL_MAP } from '@/components/games/loot-tumble/config/symbols';

/**
 * Find all connected clusters of matching symbols using BFS flood fill
 * A cluster = connected group of same symbol (4-directional: up/down/left/right)
 */
export function detectClusters(grid: Grid): Cluster[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false));
  const clusters: Cluster[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (visited[row][col]) continue;

      const symbolId = grid[row][col].symbolId;
      const symbol = SYMBOL_MAP[symbolId];

      if (!symbol || symbol.kind !== 'regular') {
        visited[row][col] = true;
        continue;
      }

      const cells: { row: number; col: number }[] = [];
      
      // BFS flood fill
      const queue: { row: number; col: number }[] = [{ row, col }];
      visited[row][col] = true;

      while (queue.length > 0) {
        const current = queue.shift()!;
        cells.push(current);

        // Check 4 neighbors
        const neighbors = [
          { row: current.row - 1, col: current.col }, // up
          { row: current.row + 1, col: current.col }, // down
          { row: current.row, col: current.col - 1 }, // left
          { row: current.row, col: current.col + 1 }, // right
        ];

        for (const neighbor of neighbors) {
          if (
            neighbor.row >= 0 && neighbor.row < rows &&
            neighbor.col >= 0 && neighbor.col < cols &&
            !visited[neighbor.row][neighbor.col] &&
            grid[neighbor.row][neighbor.col].symbolId === symbolId
          ) {
            visited[neighbor.row][neighbor.col] = true;
            queue.push(neighbor);
          }
        }
      }

      // Only count as cluster if meets minimum size
      if (cells.length >= GAME_CONFIG.minClusterSize) {
        clusters.push({
          symbolId,
          cells,
          size: cells.length,
        });
      }
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

