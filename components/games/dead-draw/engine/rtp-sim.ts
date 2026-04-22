// ============================================================
// Dead Draw — RTP Simulation (Per-Action Verification)
// Run with: npx tsx components/dead-draw/engine/rtp-sim.ts
//
// Verifies that per-action EV = 0.991 for take, shoot, and mixed strategies.
// Measures unweighted average return ratio per action:
//   return_ratio = step (if survive) or 0 (if bust)
//   E[return_ratio] = P(survive) × step = P × (1/P) × 0.991 = 0.991
// ============================================================

import { generateBoard } from './board';
import { TOTAL_POSITIONS, SHERIFFS_PER_LAYER, BPS_PRECISION, DISCOUNT_BPS } from './types';

const ROUNDS = 200_000;

interface SimResult {
  perActionRtp: number;
  totalActions: number;
  bustRate: number;
  rampageRate: number;
}

/**
 * P(all depth cards are safe) for the current board state.
 */
function pSafeStack(totalCards: number, sheriffs: number, depth: number): number {
  const safe = totalCards - sheriffs;
  if (depth === 1) return safe / totalCards;
  let p = 1;
  for (let k = 0; k < depth; k++) {
    p *= (safe - k) / (totalCards - k);
  }
  return p;
}

// --- Strategy 1: Take-only ---

function simulateTakeOnly(depth: number): SimResult {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  let returnRatioSum = 0;
  let totalActions = 0;
  let busts = 0;

  for (let round = 0; round < ROUNDS; round++) {
    const seed = BigInt(round * 104729 + 7919);
    const board = generateBoard(seed, depth);

    const maxSafe = board.positions.filter((p) => !p.containsSheriff).length;
    if (maxSafe === 0) { busts++; continue; }
    const cashOutAfter = 1 + (round * 31337) % maxSafe;

    const allPositions = [...Array(TOTAL_POSITIONS).keys()];
    let allSeed = round * 69069 + 1;
    for (let i = allPositions.length - 1; i > 0; i--) {
      allSeed = (allSeed * 16807) % 2147483647;
      const j = allSeed % (i + 1);
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    let positionsDone = 0;
    let actionCount = 0;

    for (const posIdx of allPositions) {
      if (actionCount >= cashOutAfter) break;

      const totalCards = (TOTAL_POSITIONS - positionsDone) * depth;
      const pSafe = pSafeStack(totalCards, sheriffCount, depth);
      const takeStep = (1 / pSafe) * (DISCOUNT_BPS / BPS_PRECISION);

      totalActions++;

      if (!board.positions[posIdx].containsSheriff) {
        returnRatioSum += takeStep;
        positionsDone++;
        actionCount++;
      } else {
        returnRatioSum += 0;
        busts++;
        break;
      }
    }
  }

  return {
    perActionRtp: (returnRatioSum / totalActions) * 100,
    totalActions,
    bustRate: (busts / ROUNDS) * 100,
    rampageRate: 0,
  };
}

// --- Strategy 2: Shoot-only ---

function simulateShootOnly(depth: number): SimResult {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  let returnRatioSum = 0;
  let totalActions = 0;
  let busts = 0;
  let rampages = 0;

  for (let round = 0; round < ROUNDS; round++) {
    const seed = BigInt(round * 104729 + 7919);
    const board = generateBoard(seed, depth);

    const allPositions = [...Array(TOTAL_POSITIONS).keys()];
    let allSeed = round * 48271 + 3;
    for (let i = allPositions.length - 1; i > 0; i--) {
      allSeed = (allSeed * 16807) % 2147483647;
      const j = allSeed % (i + 1);
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    let positionsGone = 0;
    let sheriffsLeft = sheriffCount;

    for (const posIdx of allPositions) {
      if (sheriffsLeft <= 0) break;

      const totalCards = (TOTAL_POSITIONS - positionsGone) * depth;
      const pSafe = pSafeStack(totalCards, sheriffsLeft, depth);
      const pSheriff = 1 - pSafe;
      const shootStep = (1 / pSheriff) * (DISCOUNT_BPS / BPS_PRECISION);

      totalActions++;

      if (board.positions[posIdx].containsSheriff) {
        returnRatioSum += shootStep;
        sheriffsLeft -= board.positions[posIdx].sheriffCount;
        positionsGone++;
      } else {
        returnRatioSum += 0;
        busts++;
        break;
      }
    }

    if (sheriffsLeft <= 0) rampages++;
  }

  return {
    perActionRtp: (returnRatioSum / totalActions) * 100,
    totalActions,
    bustRate: (busts / ROUNDS) * 100,
    rampageRate: (rampages / ROUNDS) * 100,
  };
}

// --- Strategy 3: Mixed ---

function simulateMixed(depth: number): SimResult {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  let returnRatioSum = 0;
  let totalActions = 0;
  let busts = 0;
  let rampages = 0;

  for (let round = 0; round < ROUNDS; round++) {
    const seed = BigInt(round * 104729 + 7919);
    const board = generateBoard(seed, depth);

    const allPositions = [...Array(TOTAL_POSITIONS).keys()];
    let allSeed = round * 69069 + 1;
    for (let i = allPositions.length - 1; i > 0; i--) {
      allSeed = (allSeed * 16807) % 2147483647;
      const j = allSeed % (i + 1);
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    let positionsRevealed = 0;
    let positionsDestroyed = 0;
    let sheriffsLeft = sheriffCount;
    let modeSeed = round * 31337;
    const cashOutAfter = 3 + (round * 7919) % 10;
    let actionCount = 0;

    for (const posIdx of allPositions) {
      if (actionCount >= cashOutAfter) break;
      if (sheriffsLeft <= 0) break;

      const totalDone = positionsRevealed + positionsDestroyed;
      const totalCards = (TOTAL_POSITIONS - totalDone) * depth;

      modeSeed = (modeSeed * 16807) % 2147483647;
      const isShoot = modeSeed % 2 === 0;

      totalActions++;

      if (isShoot) {
        const pSafe = pSafeStack(totalCards, sheriffsLeft, depth);
        const pSheriff = 1 - pSafe;
        const shootStep = (1 / pSheriff) * (DISCOUNT_BPS / BPS_PRECISION);

        if (board.positions[posIdx].containsSheriff) {
          returnRatioSum += shootStep;
          sheriffsLeft -= board.positions[posIdx].sheriffCount;
          positionsDestroyed++;
        } else {
          returnRatioSum += 0;
          busts++;
          break;
        }
      } else {
        const pSafe = pSafeStack(totalCards, sheriffsLeft, depth);
        const takeStep = (1 / pSafe) * (DISCOUNT_BPS / BPS_PRECISION);

        if (!board.positions[posIdx].containsSheriff) {
          returnRatioSum += takeStep;
          positionsRevealed++;
        } else {
          returnRatioSum += 0;
          busts++;
          break;
        }
      }

      actionCount++;
    }

    if (sheriffsLeft <= 0) rampages++;
  }

  return {
    perActionRtp: (returnRatioSum / totalActions) * 100,
    totalActions,
    bustRate: (busts / ROUNDS) * 100,
    rampageRate: (rampages / ROUNDS) * 100,
  };
}

// --- Run All ---

console.log('=== Dead Draw Per-Action RTP Verification ===');
console.log(`Rounds per strategy: ${ROUNDS.toLocaleString()}`);
console.log(`Expected per-action RTP: ${(DISCOUNT_BPS / BPS_PRECISION * 100).toFixed(1)}%\n`);

for (const depth of [1, 2, 3]) {
  const sc = depth * SHERIFFS_PER_LAYER;
  console.log(`--- Depth ${depth} (${sc} sheriffs) ---`);

  const take = simulateTakeOnly(depth);
  console.log(`  Take-only:  per-action RTP=${take.perActionRtp.toFixed(3)}%  actions=${take.totalActions}`);

  const shoot = simulateShootOnly(depth);
  console.log(`  Shoot-only: per-action RTP=${shoot.perActionRtp.toFixed(3)}%  actions=${shoot.totalActions}  rampage=${shoot.rampageRate.toFixed(2)}%`);

  const mixed = simulateMixed(depth);
  console.log(`  Mixed:      per-action RTP=${mixed.perActionRtp.toFixed(3)}%  actions=${mixed.totalActions}  rampage=${mixed.rampageRate.toFixed(2)}%`);

  const expected = DISCOUNT_BPS / BPS_PRECISION * 100;
  const all = [take, shoot, mixed];
  const allPass = all.every(r => Math.abs(r.perActionRtp - expected) < 0.8);
  console.log(allPass
    ? `  ✅  All strategies converge to ~${expected.toFixed(1)}% per-action RTP`
    : `  ⚠️  Per-action RTP divergence — check formulas`
  );
  console.log();
}

// --- Mathematical Identity Check ---
console.log('--- Mathematical Identity: P(outcome) × step = 0.991 ---');
const discount = DISCOUNT_BPS / BPS_PRECISION;
for (const depth of [1, 2, 3]) {
  const sheriffCount = depth * SHERIFFS_PER_LAYER;
  const totalCards = depth * TOTAL_POSITIONS;
  const pSafe = pSafeStack(totalCards, sheriffCount, depth);
  const pSheriff = 1 - pSafe;
  const takeStep = (1 / pSafe) * discount;
  const shootStep = (1 / pSheriff) * discount;

  console.log(`  Depth ${depth}: P(safe)=${pSafe.toFixed(4)}  takeEV=${(pSafe * takeStep).toFixed(4)}  P(sheriff)=${pSheriff.toFixed(4)}  shootEV=${(pSheriff * shootStep).toFixed(4)}`);
}
