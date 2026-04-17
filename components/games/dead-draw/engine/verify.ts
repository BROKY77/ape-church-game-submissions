// @ts-nocheck — this file targets ES2020+ (bigint literals) and runs via tsx, not tsc
// ============================================================
// Dead Draw — Engine Verification Script (4x4 Grid)
// Run with: npx tsx components/dead-draw/engine/verify.ts
// ============================================================

import { generateBoard } from './board';
import {
  bpsToDisplay,
  calculateCumulativeMultiplierBps,
  getFullClearMultiplierBps,
  generatePayoutTable,
} from './multiplier';
import { resolveSheriffCall } from './sheriff-call';
import { SHERIFFS_PER_LAYER, TOTAL_POSITIONS } from './types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string): void {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  PASS: ${message} (actual=${actual}, expected=${expected}, diff=${diff.toFixed(4)})`);
    passed++;
  } else {
    console.error(`  FAIL: ${message} (actual=${actual}, expected=${expected}, diff=${diff.toFixed(4)})`);
    failed++;
  }
}

// --- Test 1: Determinism ---
console.log('\n=== Test 1: Board Determinism ===');
const seed1 = 123456789n;
const board1a = generateBoard(seed1, 1);
const board1b = generateBoard(seed1, 1);

assert(
  JSON.stringify(board1a.positions) === JSON.stringify(board1b.positions),
  'Same seed produces identical board (depth 1)'
);

const board2a = generateBoard(seed1, 2);
const board2b = generateBoard(seed1, 2);
assert(
  JSON.stringify(board2a.positions) === JSON.stringify(board2b.positions),
  'Same seed produces identical board (depth 2)'
);

const board3a = generateBoard(seed1, 3);
const board3b = generateBoard(seed1, 3);
assert(
  JSON.stringify(board3a.positions) === JSON.stringify(board3b.positions),
  'Same seed produces identical board (depth 3)'
);

// Different seeds produce different boards
const boardDiff = generateBoard(987654321n, 1);
assert(
  JSON.stringify(board1a.positions) !== JSON.stringify(boardDiff.positions),
  'Different seeds produce different boards'
);

// --- Test 2: Board Structure (4x4 grid) ---
console.log('\n=== Test 2: Board Structure (4x4) ===');

for (const depth of [1, 2, 3]) {
  const board = generateBoard(42n, depth);
  const expectedSheriffs = depth * SHERIFFS_PER_LAYER;
  const expectedCards = depth * TOTAL_POSITIONS;

  assert(board.positions.length === 16, `Depth ${depth}: 16 positions`);
  assert(board.sheriffCount === expectedSheriffs, `Depth ${depth}: ${expectedSheriffs} sheriff(s)`);

  const totalCards = board.positions.reduce((sum, p) => sum + p.cards.length, 0);
  assert(totalCards === expectedCards, `Depth ${depth}: ${expectedCards} total cards`);

  const totalSheriffs = board.positions.reduce(
    (sum, p) => sum + p.cards.filter((c) => c.isSheriff).length,
    0
  );
  assert(totalSheriffs === expectedSheriffs, `Depth ${depth}: exactly ${expectedSheriffs} sheriff card(s) total`);

  // Each position has `depth` cards
  for (const pos of board.positions) {
    assert(pos.cards.length === depth, `Depth ${depth}: position ${pos.index} has ${depth} card(s)`);
  }
}

// --- Test 3: Multiplier Math (Depth 1) ---
console.log('\n=== Test 3: Multiplier Math (Depth 1) — 14 safe shots ===');

const depth1Table = generatePayoutTable(1);
console.log('  Depth 1 payout table:');
for (const row of depth1Table) {
  console.log(`    Shot ${row.shots}: ${row.multiplierDisplay}x (${row.multiplierBps} bps)`);
}

// --- Test 4: Full Clear Multipliers ---
console.log('\n=== Test 4: Full Clear Multipliers ===');

const fc1 = bpsToDisplay(getFullClearMultiplierBps(1));
const fc2 = bpsToDisplay(getFullClearMultiplierBps(2));
const fc3 = bpsToDisplay(getFullClearMultiplierBps(3));

console.log(`  Depth 1 full clear: ${fc1}x`);
console.log(`  Depth 2 full clear: ${fc2}x`);
console.log(`  Depth 3 full clear: ${fc3}x`);

// Verification targets (mathematically exact, 0.9% house edge compounded):
// Depth 1: C(16,2) * 0.991^14 = ~105.7x
// Depth 2: hypergeometric product * 0.991^12 = ~461x
// Depth 3: hypergeometric product * 0.991^10 = ~604x
assertApprox(fc1, 105.7, 1, 'Depth 1 full clear ≈ 105.7x');
assertApprox(fc2, 461, 5, 'Depth 2 full clear ≈ 461x');
assertApprox(fc3, 604, 5, 'Depth 3 full clear ≈ 604x');

// --- Test 5: Max safe shots per depth ---
console.log('\n=== Test 5: Max Safe Shots ===');
assert(TOTAL_POSITIONS - 1 * SHERIFFS_PER_LAYER === 14, 'Depth 1: 14 safe shots');
assert(TOTAL_POSITIONS - 2 * SHERIFFS_PER_LAYER === 12, 'Depth 2: 12 safe shots');
assert(TOTAL_POSITIONS - 3 * SHERIFFS_PER_LAYER === 10, 'Depth 3: 10 safe shots');

// --- Test 6: Depth 2 Payout Table ---
console.log('\n=== Test 6: Depth 2 Payout Table ===');
const depth2Table = generatePayoutTable(2);
for (const row of depth2Table) {
  console.log(`    Shot ${row.shots}: ${row.multiplierDisplay}x (${row.multiplierBps} bps)`);
}

// --- Test 7: Depth 3 Payout Table ---
console.log('\n=== Test 7: Depth 3 Payout Table ===');
const depth3Table = generatePayoutTable(3);
for (const row of depth3Table) {
  console.log(`    Shot ${row.shots}: ${row.multiplierDisplay}x (${row.multiplierBps} bps)`);
}

// --- Test 8: Sheriff Call ---
console.log('\n=== Test 8: Sheriff Call ===');
const callBoard = generateBoard(999n, 1);
const sheriffPos = callBoard.positions.filter((p) => p.containsSheriff).map((p) => p.index);
console.log(`  Sheriff at position(s): ${sheriffPos}`);
assert(sheriffPos.length === 2, 'Depth 1 board has 2 sheriff positions');

const correctCall = resolveSheriffCall(callBoard, sheriffPos);
assert(correctCall.correct === true, 'Correct sheriff call returns true');

// Find non-sheriff positions for incorrect call
const safePosArr = callBoard.positions.filter((p) => !p.containsSheriff);
if (safePosArr.length >= 2) {
  const incorrectCall = resolveSheriffCall(callBoard, [safePosArr[0].index, safePosArr[1].index]);
  assert(incorrectCall.correct === false, 'Incorrect sheriff call returns false');
}

// --- Test 9: Base multiplier is 1x ---
console.log('\n=== Test 9: Edge Cases ===');
assert(
  calculateCumulativeMultiplierBps(0, 1) === 10000,
  '0 shots = 1.00x (10000 bps)'
);

// --- Test 10: Board sheriff positions count ---
console.log('\n=== Test 10: Sheriff Position Counts ===');
for (const depth of [1, 2, 3]) {
  const board = generateBoard(12345n, depth);
  const positionsWithSheriff = board.positions.filter((p) => p.containsSheriff).length;
  console.log(`  Depth ${depth}: ${positionsWithSheriff} positions contain sheriff(s)`);
  // At least sheriffCount positions should contain sheriffs, but some positions
  // might contain multiple sheriffs at higher depths (fewer unique sheriff positions)
  assert(positionsWithSheriff >= 1, `Depth ${depth}: at least 1 position contains a sheriff`);
  assert(positionsWithSheriff <= board.sheriffCount, `Depth ${depth}: sheriff positions <= total sheriff cards`);
}

// --- Test 11: Multi-sheriff stack distribution ---
console.log('\n=== Test 11: Multi-Sheriff Stack Distribution ===');
let multiSheriffBoards = 0;
const sampleCount = 5000;
for (let i = 0; i < sampleCount; i++) {
  const board = generateBoard(BigInt(i * 7919 + 31337), 3); // depth 3, 6 sheriffs
  const hasMultiSheriff = board.positions.some((p) => p.sheriffCount > 1);
  if (hasMultiSheriff) multiSheriffBoards++;
}
const multiPct = ((multiSheriffBoards / sampleCount) * 100).toFixed(1);
console.log(`  ${multiSheriffBoards}/${sampleCount} boards have multi-sheriff stacks (${multiPct}%)`);
assert(multiSheriffBoards > 0, 'Multi-sheriff stacks exist at depth 3');
assert(multiSheriffBoards > sampleCount * 0.1, 'At least 10% of depth-3 boards have multi-sheriff stacks');

// Verify sheriffCount field matches actual card count
for (const depth of [1, 2, 3]) {
  const board = generateBoard(42n, depth);
  for (const pos of board.positions) {
    const actualCount = pos.cards.filter(c => c.isSheriff).length;
    assert(pos.sheriffCount === actualCount, `Depth ${depth} pos ${pos.index}: sheriffCount (${pos.sheriffCount}) matches actual (${actualCount})`);
  }
}

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
