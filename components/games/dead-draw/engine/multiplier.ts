// ============================================================
// Dead Draw — Multiplier Calculations (Fixed-Point BPS)
// ============================================================
// All internal math uses integer basis points (1x = 10000 bps).
// This avoids floating-point precision errors in payout calculations.

import { BPS_PRECISION, DISCOUNT_BPS, SHERIFFS_PER_LAYER, TOTAL_POSITIONS } from './types';

/**
 * Computes the binomial coefficient C(n, k) = n! / (k! * (n-k)!).
 * Used for hypergeometric probability in depth 2+ games.
 *
 * @param n - Total items
 * @param k - Items to choose
 * @returns C(n, k) as an integer
 */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  // Optimize by using the smaller k
  const kOpt = Math.min(k, n - k);
  let result = 1;

  for (let i = 0; i < kOpt; i++) {
    result = (result * (n - i)) / (i + 1);
  }

  return Math.round(result);
}

/**
 * Calculates the cumulative multiplier in basis points after `shotsTaken` safe shots.
 *
 * Depth 1 formula (per shot):
 *   fair_odds = remaining_total / remaining_safe
 *   discounted = fair_odds * DISCOUNT_BPS / BPS_PRECISION
 *   cumulative = product of all per-shot discounted odds
 *
 * Depth 2+ formula (per shot, hypergeometric):
 *   P(column safe) = C(safe_remaining, depth) / C(total_remaining, depth)
 *   fair_odds = 1 / P(column safe)
 *   discounted = fair_odds * DISCOUNT_BPS / BPS_PRECISION
 *   cumulative = product of all per-shot discounted odds
 *
 * @param shotsTaken - Number of safe shots completed (0 = no shots yet)
 * @param depth - Card depth per position (1, 2, or 3)
 * @returns Cumulative multiplier in basis points (e.g., 17350 = 1.735x)
 */
export function calculateCumulativeMultiplierBps(
  shotsTaken: number,
  depth: number
): number {
  if (shotsTaken <= 0) return BPS_PRECISION; // 1.00x

  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  const totalCards = depth * TOTAL_POSITIONS;
  // Max safe positions = 14 at all depths. Sheriffs can share positions
  // (max sheriffs per stack = depth), so minimum sheriff positions = ceil(sheriffCount/depth) = 2.
  const maxSafeShots = TOTAL_POSITIONS - SHERIFFS_PER_LAYER;

  if (shotsTaken > maxSafeShots) {
    throw new Error(
      `Cannot take ${shotsTaken} shots. Max safe shots is ${maxSafeShots}.`
    );
  }

  // Use high-precision float accumulation, then round to BPS at the end.
  // This is acceptable because the intermediate values are ratios, not currency.
  // The final BPS value is the authoritative integer result.
  let multiplier = 1.0;

  for (let shot = 0; shot < shotsTaken; shot++) {
    const cardsRevealed = shot * depth;
    const totalRemaining = totalCards - cardsRevealed;
    const safeRemaining = totalRemaining - sheriffCount;

    if (depth === 1) {
      // Simple ratio: totalRemaining / safeRemaining
      const fairOdds = totalRemaining / safeRemaining;
      multiplier *= fairOdds * (DISCOUNT_BPS / BPS_PRECISION);
    } else {
      // Hypergeometric: C(safeRemaining, depth) / C(totalRemaining, depth)
      const pSafe =
        combinations(safeRemaining, depth) /
        combinations(totalRemaining, depth);
      const fairOdds = 1 / pSafe;
      multiplier *= fairOdds * (DISCOUNT_BPS / BPS_PRECISION);
    }
  }

  return Math.round(multiplier * BPS_PRECISION);
}

/**
 * Returns the guaranteed full-clear multiplier in basis points for a given depth.
 * This assumes worst-case sheriff distribution (each sheriff in a unique position),
 * giving the minimum number of safe positions: TOTAL_POSITIONS - sheriffCount.
 * If sheriffs cluster into fewer positions, the actual full-clear multiplier
 * will be higher (see payout table for shots beyond this minimum).
 *
 * @param depth - Card depth per position (1, 2, or 3)
 * @returns Guaranteed full-clear multiplier in BPS
 */
export function getFullClearMultiplierBps(depth: number): number {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  const guaranteedSafeShots = TOTAL_POSITIONS - sheriffCount;
  return calculateCumulativeMultiplierBps(guaranteedSafeShots, depth);
}

/**
 * Converts a basis-point multiplier to a display-friendly float.
 * Rounds to 2 decimal places.
 *
 * @param bps - Multiplier in basis points
 * @returns Display value (e.g., 17350 → 1.74)
 */
export function bpsToDisplay(bps: number): number {
  return Math.round(bps / (BPS_PRECISION / 100)) / 100;
}

/**
 * Computes the next multiplier after one additional safe take-mode shot,
 * given the current board state. Used when sheriffs have been eliminated
 * and the static cumulative formula no longer applies.
 *
 * @param currentBps - Current multiplier in basis points
 * @param totalCardsRemaining - Total cards still in play (not revealed/destroyed)
 * @param sheriffsRemaining - Sheriff cards still in play
 * @param depth - Cards per position
 * @returns New multiplier in basis points after one safe take
 */
export function calculateNextShotMultiplierBps(
  currentBps: number,
  totalCardsRemaining: number,
  sheriffsRemaining: number,
  depth: number
): number {
  const safeRemaining = totalCardsRemaining - sheriffsRemaining;

  if (depth === 1) {
    const fairOdds = totalCardsRemaining / safeRemaining;
    return Math.round(currentBps * fairOdds * DISCOUNT_BPS / BPS_PRECISION);
  }

  const pSafe =
    combinations(safeRemaining, depth) /
    combinations(totalCardsRemaining, depth);
  const fairOdds = 1 / pSafe;
  return Math.round(currentBps * fairOdds * DISCOUNT_BPS / BPS_PRECISION);
}

/**
 * Calculates the multiplier step for a successful shoot-mode action.
 * shoot_step = (1 / P(sheriff_stack)) × discount
 *
 * P(sheriff_stack) = 1 - P(safe_stack)
 * P(safe_stack)    = C(safeRemaining, depth) / C(totalRemaining, depth)
 *
 * The house edge is identical to take mode: P(sheriff) × (1/P(sheriff)) × 0.991 = 0.991
 *
 * @param totalCardsRemaining - Total cards still in play
 * @param sheriffsRemaining   - Sheriff cards still in play
 * @param depth               - Cards per position
 * @returns Shoot step multiplier in basis points (e.g., 79280 = 7.93x)
 */
export function calculateShootStepBps(
  totalCardsRemaining: number,
  sheriffsRemaining: number,
  depth: number
): number {
  const safeRemaining = totalCardsRemaining - sheriffsRemaining;

  let pSafe: number;
  if (depth === 1) {
    pSafe = safeRemaining / totalCardsRemaining;
  } else {
    pSafe =
      combinations(safeRemaining, depth) /
      combinations(totalCardsRemaining, depth);
  }

  const pSheriff = 1 - pSafe;
  // fairOdds = 1 / pSheriff, then apply discount
  // stepBps = fairOdds × DISCOUNT_BPS
  return Math.floor(DISCOUNT_BPS / pSheriff);
}

/**
 * Generates a shoot-only payout table for a given depth.
 * Each entry is the cumulative multiplier after N consecutive successful shoots.
 * Assumes typical board layout (1 sheriff per stack).
 *
 * @param depth - Card depth per position (1, 2, or 3)
 * @returns Array of { shots, multiplierBps, multiplierDisplay }
 */
export function generateShootPayoutTable(
  depth: number
): Array<{ shots: number; multiplierBps: number; multiplierDisplay: number }> {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  const table: Array<{
    shots: number;
    multiplierBps: number;
    multiplierDisplay: number;
  }> = [];
  let cumBps = BPS_PRECISION; // 1.00x

  for (let s = 0; s < sheriffCount; s++) {
    // Board state: s sheriffs eliminated, s positions destroyed (1 per stack)
    const positionsGone = s;
    const totalRemaining = (TOTAL_POSITIONS - positionsGone) * depth;
    const sheriffsRemaining = sheriffCount - s;
    const stepBps = calculateShootStepBps(totalRemaining, sheriffsRemaining, depth);
    cumBps = Math.floor(cumBps * stepBps / BPS_PRECISION);
    table.push({
      shots: s + 1,
      multiplierBps: cumBps,
      multiplierDisplay: bpsToDisplay(cumBps),
    });
  }

  return table;
}

/**
 * Generates the full payout table for a given depth.
 * Returns an array where index i = multiplier after i safe shots.
 *
 * @param depth - Card depth per position (1, 2, or 3)
 * @returns Array of { shots, multiplierBps, multiplierDisplay }
 */
export function generatePayoutTable(
  depth: number
): Array<{ shots: number; multiplierBps: number; multiplierDisplay: number }> {
  // Max safe positions = 14 at all depths (sheriffs can share positions)
  const maxSafeShots = TOTAL_POSITIONS - SHERIFFS_PER_LAYER;
  const table: Array<{
    shots: number;
    multiplierBps: number;
    multiplierDisplay: number;
  }> = [];

  for (let shots = 1; shots <= maxSafeShots; shots++) {
    const bps = calculateCumulativeMultiplierBps(shots, depth);
    table.push({
      shots,
      multiplierBps: bps,
      multiplierDisplay: bpsToDisplay(bps),
    });
  }

  return table;
}
