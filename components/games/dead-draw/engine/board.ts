// ============================================================
// Dead Draw — Board Generation & Shot Resolution
// ============================================================

import {
  Board,
  Card,
  CardValue,
  CARD_VALUES,
  Position,
  SHERIFF_VALUE,
  SHERIFFS_PER_LAYER,
  ShotResult,
  TOTAL_POSITIONS,
} from './types';
import { mulberry32, seedFromBigInt } from './prng';

/**
 * Generates a deterministic game board from a chain seed and depth.
 *
 * Card distribution per layer:
 *   - 14 loot cards (values 2-15)
 *   - 2 sheriff cards (value 0)
 *   - Total per layer = 16 cards
 *   - Total = depth * 16 cards
 *
 * Sheriff count = depth * SHERIFFS_PER_LAYER (2 per layer).
 *
 * Cards are shuffled via Fisher-Yates using the seeded PRNG,
 * then dealt into 16 positions with `depth` cards each.
 *
 * @param seed - Chain-provided random seed
 * @param depth - Number of card layers per position (1, 2, or 3)
 * @returns Fully constructed Board
 */
export function generateBoard(seed: bigint, depth: number): Board {
  if (depth < 1 || depth > 3) {
    throw new Error(`Invalid depth: ${depth}. Must be 1, 2, or 3.`);
  }

  const rng = mulberry32(seedFromBigInt(seed));
  const totalCards = depth * TOTAL_POSITIONS; // depth * 16
  const sheriffCount = depth * SHERIFFS_PER_LAYER;

  // Build the card deck
  const deck: Card[] = [];

  for (let layer = 0; layer < depth; layer++) {
    // Add loot cards (14 unique values)
    for (const value of CARD_VALUES) {
      deck.push({ value: value as CardValue, isSheriff: false });
    }
    // Add 2 sheriff cards per layer
    for (let s = 0; s < SHERIFFS_PER_LAYER; s++) {
      deck.push({ value: SHERIFF_VALUE, isSheriff: true });
    }
  }

  // Fisher-Yates shuffle
  for (let i = totalCards - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }

  // Deal cards into positions
  const positions: Position[] = [];
  for (let posIdx = 0; posIdx < TOTAL_POSITIONS; posIdx++) {
    const cards = deck.slice(posIdx * depth, (posIdx + 1) * depth);
    positions.push({
      index: posIdx,
      cards,
      revealed: false,
      containsSheriff: cards.some((c) => c.isSheriff),
      sheriffCount: cards.filter((c) => c.isSheriff).length,
      revealProgress: 0,
    });
  }

  return {
    positions,
    depth,
    sheriffCount,
    seed,
  };
}

/**
 * Resolves a column shot at the given position.
 * All cards in the position's stack are revealed simultaneously.
 *
 * @param board - Current game board
 * @param positionIndex - Index (0-15) of the position to shoot
 * @returns Whether the column is safe and the revealed cards
 * @throws If position is already revealed or index is out of bounds
 */
export function resolveColumnShot(
  board: Board,
  positionIndex: number
): ShotResult {
  if (positionIndex < 0 || positionIndex >= TOTAL_POSITIONS) {
    throw new Error(
      `Invalid position index: ${positionIndex}. Must be 0-${TOTAL_POSITIONS - 1}.`
    );
  }

  const position = board.positions[positionIndex];

  if (position.revealed) {
    throw new Error(
      `Position ${positionIndex} is already revealed.`
    );
  }

  return {
    safe: !position.containsSheriff,
    cards: position.cards,
  };
}

/**
 * Checks whether only sheriff-containing positions remain unrevealed.
 * If so, the round should auto-resolve as a full clear.
 *
 * A position is "done" if it has been revealed (take mode) or destroyed
 * (shoot mode sheriff elimination). Auto-complete triggers when all
 * remaining non-done positions contain a sheriff.
 *
 * @param board - Current game board
 * @param revealedPositions - Indices of positions revealed via take mode
 * @param destroyedPositions - Indices of positions destroyed via shoot mode
 * @returns true if all remaining positions contain a sheriff
 */
export function shouldAutoComplete(
  board: Board,
  revealedPositions: number[],
  destroyedPositions: number[] = []
): boolean {
  const doneSet = new Set([...revealedPositions, ...destroyedPositions]);

  for (const position of board.positions) {
    if (!doneSet.has(position.index) && !position.containsSheriff) {
      return false; // At least one unrevealed safe position remains
    }
  }

  return true;
}
