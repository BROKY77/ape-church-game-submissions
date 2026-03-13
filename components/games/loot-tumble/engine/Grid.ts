import { BonusMode, Grid, GridCell, SymbolId } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { createRandomCell } from './SymbolGenerator';

let cellKeyCounter = 0;
export function nextCellKey(): string {
  return `cell-${++cellKeyCounter}`;
}

export function resetCellKeys(): void {
  cellKeyCounter = 0;
}

/**
 * Create an empty grid filled with random symbols
 */
export function createGrid(rows?: number, cols?: number, mode: BonusMode = 'BASE'): Grid {
  const r = rows ?? GAME_CONFIG.gridRows;
  const c = cols ?? GAME_CONFIG.gridCols;
  const grid: Grid = [];

  for (let row = 0; row < r; row++) {
    const gridRow: GridCell[] = [];
    for (let col = 0; col < c; col++) {
      gridRow.push(createRandomCell(row, col, nextCellKey(), mode));
    }
    grid.push(gridRow);
  }
  return grid;
}

/**
 * Get a cell from the grid safely
 */
export function getCell(grid: Grid, row: number, col: number): GridCell | null {
  if (row < 0 || row >= grid.length) return null;
  if (col < 0 || col >= grid[0].length) return null;
  return grid[row][col];
}

/**
 * Clone a grid (deep copy)
 */
export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

/**
 * Set a cell's symbol in the grid (returns new grid)
 */
export function setCell(grid: Grid, row: number, col: number, symbolId: SymbolId): Grid {
  const newGrid = cloneGrid(grid);
  newGrid[row][col] = { ...newGrid[row][col], symbolId };
  return newGrid;
}

/**
 * Get all cells as flat array
 */
export function flatCells(grid: Grid): GridCell[] {
  return grid.flat();
}

/**
 * Get grid dimensions
 */
export function gridSize(grid: Grid): { rows: number; cols: number } {
  return { rows: grid.length, cols: grid[0]?.length ?? 0 };
}

