// ============================================================
// Dead Draw — Type Definitions & Constants
// ============================================================

// --- Constants ---

export const GRID_SIZE = 4;
export const TOTAL_POSITIONS = 16; // GRID_SIZE * GRID_SIZE
export const HOUSE_EDGE_BPS = 90; // 0.9% = 90 basis points
export const DISCOUNT_BPS = 9910; // 10000 - 90
export const BPS_PRECISION = 10000;
export const MAX_DEPTH = 3;
export const MIN_DEPTH = 1;

export const CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const SHERIFF_VALUE = 0 as const;

/** Number of sheriff cards per depth layer */
export const SHERIFFS_PER_LAYER = 2;

// --- Card Types ---

export type CardValue = typeof SHERIFF_VALUE | (typeof CARD_VALUES)[number];

export interface Card {
  value: CardValue;
  isSheriff: boolean;
}

// --- Board Types ---

export interface Position {
  index: number;
  cards: Card[];
  revealed: boolean;
  containsSheriff: boolean;
  /** Number of sheriff cards in this stack (0, 1, 2, or 3) */
  sheriffCount: number;
  /** How many cards in this stack have been revealed (0 = none, depth = all) */
  revealProgress: number;
}

export interface Board {
  positions: Position[];
  depth: number;
  sheriffCount: number;
  seed: bigint;
}

// --- Game State ---

export type GameOutcome =
  | 'escaped'
  | 'busted'
  | 'full_clear'
  | 'shot_loot'
  | 'rampage';

export interface GameState {
  board: Board | null;
  currentView: 0 | 1 | 2;
  shotsTaken: number;
  revealedPositions: number[];
  currentMultiplier: number;
  currentMultiplierBps: number;
  selectedDepth: number;
  outcome: GameOutcome | null;
  isRewatch: boolean;
  rewatchActions: GameAction[];
  actionHistory: GameAction[];
  lastSeed: bigint | null;
  lastDepth: number;
  /** Position index currently mid-reveal (sequential card animation), or null */
  revealingPosition: number | null;
  /** True while sequential card reveal animation is playing — blocks input */
  isRevealing: boolean;
  /** Outcome waiting to be shown after reveal animation completes */
  pendingOutcome: GameOutcome | null;
  /** Current interaction mode — take (grab loot) or shoot (target sheriffs) */
  currentMode: 'take' | 'shoot';
  /** Mode locked during mid-stack reveal — cannot switch until stack resolves */
  lockedMode: 'take' | 'shoot' | null;
  /** True when the shard animation has finished and player can click to advance */
  canAdvanceReveal: boolean;
  /** Number of sheriffs eliminated via shoot mode */
  eliminatedSheriffs: number;
  /** Position indices destroyed via successful shoot-mode sheriff kills */
  destroyedPositions: number[];
  /** Number of sheriffs killed in the last completed shoot-mode stack (for multi-kill UI) */
  lastKillCount: number;
  /** Take mode card phase: ready (? showing), flipped (face showing), dismissing (sliding away) */
  cardPhase: 'ready' | 'flipped' | 'dismissing' | null;
  /** Multiplier the player had before a bust zeroed it (for near-miss display) */
  preBustMultiplier: number;
  /** Last position the player shot/took (for near-miss display) */
  lastShotPosition: number | null;
  /** Whether shoot mode was used at any point during the round */
  usedShootMode: boolean;
  /** Pre-computed shoot step for the current action (calculated from board state before reveal) */
  pendingShootStepBps: number | null;
}

// --- Reducer Actions ---

export type GameAction =
  | { type: 'PLAY_GAME'; seed: bigint; depth: number }
  | { type: 'SHOOT_POSITION'; positionIndex: number }
  | { type: 'CASH_OUT' }
  | { type: 'RESET' }
  | { type: 'SET_DEPTH'; depth: number }
  | { type: 'REWATCH_STEP'; action: GameAction }
  | { type: 'REVEAL_NEXT_CARD' }
  | { type: 'ENABLE_ADVANCE' }
  | { type: 'FLIP_CARD' }
  | { type: 'DISMISS_CARD' }
  | { type: 'CARD_DISMISSED' }
  | { type: 'COMPLETE_POSITION_REVEAL'; positionIndex: number }
  | { type: 'SET_REWATCH'; isRewatch: boolean }
  | { type: 'RESOLVE_PENDING_OUTCOME' }
  | { type: 'SWITCH_MODE'; mode: 'take' | 'shoot' }
  | { type: 'RAMPAGE_FLIP_START'; positionIndex: number }
  | { type: 'RAMPAGE_FLIP_DONE'; positionIndex: number }
  | { type: 'COMPLETE_RAMPAGE' };

// --- Shot Resolution ---

export interface ShotResult {
  safe: boolean;
  cards: Card[];
}

// --- Loot Card Metadata ---

export const LOOT_NAMES: Record<number, string> = {
  2: 'Rusty Spurs',
  3: 'Deck of Cards',
  4: 'Whiskey Bottle',
  5: 'Revolver',
  6: 'Silver Coins',
  7: 'Dynamite',
  8: 'Gold Bars',
  9: 'Mine Deed',
  10: 'Pocket Watch',
  11: 'Bowie Knife',
  12: 'Saddlebag',
  13: 'Rattlesnake Venom',
  14: 'Wanted Poster',
  15: 'Sheriff\'s Key',
};
