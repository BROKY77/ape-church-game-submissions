export type SymbolId = string;
export type SymbolKind = 'regular' | 'scatter' | 'multiplier';
export type BonusMode = 'BASE' | 'BONUS';

export interface SymbolDef {
  id: SymbolId;
  name: string;
  color: string;
  weight: number; // Higher = more common in the base game
  bonusWeight?: number; // Optional alternate weight for the bonus game
  tier?: number; // 1 = highest value, 8 = lowest
  kind: SymbolKind;
}

export interface GridCell {
  symbolId: SymbolId;
  row: number;
  col: number;
  key: string; // Unique key for animation tracking
  multiplierValue?: number;
}

export type Grid = GridCell[][];

export interface Cluster {
  symbolId: SymbolId;
  cells: { row: number; col: number }[];
  size: number;
}

export interface SpinResult {
  grid: Grid;
  finalGrid: Grid;
  clusters: Cluster[];
  cascades: CascadeStep[];
  totalWin: number;
  totalWinBeforeMultiplier: number;
  scatterCount: number;
  awardedFreeSpins: number;
  multiplierTotal: number;
}

export interface CascadeStep {
  removedCells: { row: number; col: number }[];
  fallenCells: { from: { row: number; col: number }; to: { row: number; col: number }; symbolId: SymbolId }[];
  newCells: GridCell[];
  newClusters: Cluster[];
  stepWin: number;
}

export type SlotState = 'IDLE' | 'SPINNING' | 'LANDING' | 'RESOLVING' | 'CASCADING' | 'WIN_DISPLAY';

export interface FallenCellInfo {
  key: string;
  rowsDropped: number;
}

export interface GameState {
  state: SlotState;
  mode: BonusMode;
  grid: Grid;
  balance: number;
  betAmount: number; // Session buy-in configured by the player
  spinBetAmount: number; // Per-spin wager used by the engine
  currentWin: number;
  totalWin: number;
  totalWinBeforeMultiplier: number;
  cascadeDepth: number;
  activeClusters: Cluster[];
  /** Keys of cells that just dropped in from top during a cascade */
  cascadeNewCellKeys: string[];
  /** Cells that fell during a cascade, with distance info */
  cascadeFallenCells: FallenCellInfo[];
  scatterCount: number;
  awardedFreeSpins: number;
  bonusSpinsRemaining: number;
  spinMultiplierTotal: number;
  lastSpinFailed: boolean;
}
