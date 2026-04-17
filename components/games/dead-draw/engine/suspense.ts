// ============================================================
// Dead Draw — Suspense & Tension Utility Functions
// ============================================================
// Pure functions for UX tension scaling. No side effects, no DOM, no React.
// These drive the psychological layer: timing, visuals, and retention info.

import { TOTAL_POSITIONS, SHERIFFS_PER_LAYER, GameOutcome } from './types';
import { combinations } from './multiplier';

// --- Flip Delay ---

/**
 * Returns the delay (ms) before a card flip starts, scaling with multiplier.
 * Low multiplier = snappy (150ms). High multiplier = gut-wrenching (700ms).
 * Shoot mode adds 100ms extra tension.
 */
export function getFlipDelay(currentMultiplier: number, isShootMode: boolean): number {
  const BASE_DELAY = 150;
  const MAX_DELAY = 700;
  const scaleFactor = Math.min(currentMultiplier / 20, 1);
  const delay = BASE_DELAY + (MAX_DELAY - BASE_DELAY) * scaleFactor;
  return Math.round(isShootMode ? delay + 100 : delay);
}

/**
 * Returns additional delay (ms) for cards within a stack (depth 2+).
 * Each subsequent card in the stack gets a longer pause.
 */
export function getStackCardDelay(cardIndexInStack: number): number {
  return cardIndexInStack * 100;
}

// --- Visual Tension ---

/**
 * Returns vignette opacity (0–0.4) based on multiplier.
 * Continuous curve — no visible steps.
 * Starts at 2x, maxes out around 30x.
 */
export function getVignetteOpacity(currentMultiplier: number): number {
  if (currentMultiplier < 2) return 0;
  // Smooth curve from 0 at 2x to 0.4 at ~30x
  const t = Math.min((currentMultiplier - 2) / 28, 1);
  return Math.round(t * 0.4 * 1000) / 1000; // 3 decimal precision
}

/**
 * Returns a multiplier tier (0–3) for hover/visual intensification and flip speed.
 *   0 = < 2x (normal)
 *   1 = 2–15x (glow + tremble)
 *   2 = 15–30x (brighter glow)
 *   3 = 30x+ (spotlight — other cards dim)
 */
export function getMultiplierTier(currentMultiplier: number): number {
  if (currentMultiplier < 2) return 0;
  if (currentMultiplier < 15) return 1;
  if (currentMultiplier < 30) return 2;
  return 3;
}

/**
 * Returns a cash-out button font tier (0–4) based on how few safe positions remain.
 * Higher tier = bigger, more urgent font.
 *   0 = more than half safe (base size)
 *   1 = 25–50% safe remaining
 *   2 = 10–25% safe remaining
 *   3 = 5–10% safe remaining
 *   4 = under 5% safe remaining (+ glow)
 */
export function getCashOutFontTier(
  shotsTaken: number,
  depth: number,
): number {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  const maxSafeShots = TOTAL_POSITIONS - sheriffCount;
  if (maxSafeShots <= 0 || shotsTaken <= 0) return 0;

  const fractionRevealed = shotsTaken / maxSafeShots;
  if (fractionRevealed < 0.5) return 0;
  if (fractionRevealed < 0.75) return 1;
  if (fractionRevealed < 0.9) return 2;
  if (fractionRevealed < 0.95) return 3;
  return 4;
}

// --- Audio ---

/**
 * Returns BGM volume multiplier (0–1.0) based on remaining unrevealed cards.
 * Silent when 4 or fewer cards remain. Full volume when 12+ remain.
 */
export function getBGMVolume(remainingCards: number): number {
  if (remainingCards <= 4) return 0;
  if (remainingCards <= 6) return 0.1;
  if (remainingCards <= 8) return 0.25;
  if (remainingCards <= 10) return 0.45;
  if (remainingCards <= 12) return 0.65;
  if (remainingCards <= 14) return 0.85;
  return 1.0;
}

/**
 * Returns flip sound pitch (playbackRate) that ascends with shot count.
 * Starts low (0.8x), climbs to high (~1.4x).
 */
export function getFlipSoundPitch(shotNumber: number): number {
  return Math.min(0.8 + shotNumber * 0.06, 1.5);
}

// --- Heartbeat Interval ---

/**
 * Returns the heartbeat interval (ms) and volume based on the current multiplier.
 * Silent below 10x. Progressively louder and faster from 10x to 100x+.
 *
 * Uses a smooth curve — no discrete tiers.
 *   t = (mult - 10) / 90, clamped 0–1
 *   BPM: 45 → 140 (interval 1333ms → 428ms)
 *   Volume: 0.02 → 0.18
 *
 * @param currentMultiplier - Display multiplier (e.g. 15.2)
 * @returns { intervalMs, volume } or null if silent
 */
export function getHeartbeatIntervalMs(
  currentMultiplier: number
): { intervalMs: number; volume: number } | null {
  if (currentMultiplier < 10) return null;

  // Smooth 0–1 ramp from 10x to 80x
  const t = Math.min((currentMultiplier - 10) / 70, 1);

  // Ease-in curve so it starts subtle and ramps up aggressively
  const curved = t * t;

  const minBpm = 45;
  const maxBpm = 140;
  const bpm = minBpm + (maxBpm - minBpm) * curved;
  const intervalMs = Math.round(60000 / bpm);

  const minVol = 0.08;
  const maxVol = 0.5;
  const volume = minVol + (maxVol - minVol) * curved;

  return { intervalMs, volume };
}

// --- Near-Miss Detection ---

/** Multiplier thresholds for near-miss detection */
const MULTIPLIER_THRESHOLDS = [2, 5, 10, 25, 50, 100] as const;

export interface NearMissInfo {
  /** Multiplier the player had when they busted (before bust zeroed it) */
  hadMultiplier: number;
  /** APE amount the player had before bust */
  hadAmount: number;
  /** Full clear multiplier for this depth */
  fullClearMultiplier: number;
  /** Full clear APE amount */
  fullClearAmount: number;
  /** How many safe positions remained when they died/escaped */
  safePositionsRemaining: number;
  /** Next multiplier threshold they almost reached (null if none close) */
  nextThreshold: number | null;
  /** Whether the very next safe take would have crossed a threshold */
  wasOneAway: boolean;
  /** For escaped: how many safe takes were left on the board */
  safeTakesLeft: number;
  /** For shoot mode bust: which unrevealed positions had sheriffs */
  sheriffPositions: number[];
  /** For shoot mode bust: which position they shot */
  shotPosition: number | null;
  /** Number of sheriffs eliminated via shoot mode */
  eliminatedSheriffs: number;
}

/**
 * Detects near-miss scenarios for the game over screen.
 * All parameters come from the game state at the time of outcome.
 */
export function detectNearMiss(params: {
  outcome: GameOutcome;
  /** Multiplier the player had BEFORE bust zeroed it (use pre-bust value) */
  preBustMultiplier: number;
  betAmount: number;
  fullClearMultiplier: number;
  shotsTaken: number;
  depth: number;
  sheriffCount: number;
  eliminatedSheriffs: number;
  revealedPositions: number[];
  destroyedPositions: number[];
  board: { positions: Array<{ index: number; containsSheriff: boolean }> } | null;
  lastShotPosition: number | null;
}): NearMissInfo {
  const {
    outcome, preBustMultiplier, betAmount, fullClearMultiplier,
    shotsTaken, depth, sheriffCount, eliminatedSheriffs,
    revealedPositions, destroyedPositions, board, lastShotPosition,
  } = params;

  const maxSafeShots = TOTAL_POSITIONS - sheriffCount;
  const safePositionsRemaining = maxSafeShots - shotsTaken;
  const safeTakesLeft = safePositionsRemaining;

  // Find next threshold the player was approaching
  let nextThreshold: number | null = null;
  let wasOneAway = false;

  if (outcome === 'busted' || outcome === 'shot_loot') {
    for (const threshold of MULTIPLIER_THRESHOLDS) {
      if (preBustMultiplier < threshold) {
        nextThreshold = threshold;
        break;
      }
    }
    // Rough check: if only 1 safe position away, they were "one more"
    if (nextThreshold !== null && safePositionsRemaining <= 2) {
      wasOneAway = true;
    }
  }

  // Sheriff positions for shoot mode bust
  const sheriffPositions: number[] = [];
  if (board && outcome === 'shot_loot') {
    for (const p of board.positions) {
      if (
        p.containsSheriff &&
        !destroyedPositions.includes(p.index) &&
        !revealedPositions.includes(p.index)
      ) {
        sheriffPositions.push(p.index);
      }
    }
  }

  return {
    hadMultiplier: preBustMultiplier,
    hadAmount: preBustMultiplier * betAmount,
    fullClearMultiplier,
    fullClearAmount: fullClearMultiplier * betAmount,
    safePositionsRemaining,
    nextThreshold,
    wasOneAway,
    safeTakesLeft,
    sheriffPositions,
    shotPosition: lastShotPosition,
    eliminatedSheriffs,
  };
}
