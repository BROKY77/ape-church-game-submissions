// ============================================================
// Dead Draw — Sheriff Call (Draw) Resolution
// ============================================================

import { Board, TOTAL_POSITIONS } from './types';

interface SheriffCallResult {
  correct: boolean;
  sheriffPositions: number[];
}

/**
 * Resolves a Sheriff Call ("Draw").
 *
 * The player selects positions they believe contain the REMAINING sheriffs
 * (excluding any already eliminated via shoot mode). If every remaining
 * sheriff is in one of the called positions, the call is correct and pays
 * the full-clear multiplier.
 *
 * @param board - Current game board
 * @param calledPositions - Position indices the player identified as sheriffs
 * @param destroyedPositions - Positions already destroyed via shoot mode
 * @returns Whether the call was correct, plus the actual sheriff positions
 * @throws If wrong number of positions selected or positions are invalid
 */
export function resolveSheriffCall(
  board: Board,
  calledPositions: number[],
  destroyedPositions: number[] = []
): SheriffCallResult {
  const destroyedSet = new Set(destroyedPositions);

  // Find remaining (non-destroyed, non-revealed) sheriff positions
  const remainingSheriffPositions = board.positions
    .filter((p) => p.containsSheriff && !p.revealed && !destroyedSet.has(p.index))
    .map((p) => p.index);

  const requiredCount = remainingSheriffPositions.length;

  // Validate selection count
  if (calledPositions.length !== requiredCount) {
    throw new Error(
      `Sheriff call requires exactly ${requiredCount} position(s), got ${calledPositions.length}.`
    );
  }

  // Validate position indices
  for (const pos of calledPositions) {
    if (pos < 0 || pos >= TOTAL_POSITIONS) {
      throw new Error(
        `Invalid position index: ${pos}. Must be 0-${TOTAL_POSITIONS - 1}.`
      );
    }
    if (board.positions[pos].revealed) {
      throw new Error(
        `Position ${pos} is already revealed. Cannot call sheriff on a revealed position.`
      );
    }
    if (destroyedSet.has(pos)) {
      throw new Error(
        `Position ${pos} is already destroyed. Cannot call sheriff on a destroyed position.`
      );
    }
  }

  // Check for duplicate selections
  const uniqueSelections = new Set(calledPositions);
  if (uniqueSelections.size !== calledPositions.length) {
    throw new Error('Duplicate positions in sheriff call.');
  }

  // Check if all remaining sheriffs are in the called positions
  const calledSet = new Set(calledPositions);
  const correct = remainingSheriffPositions.every((sp) => calledSet.has(sp));

  return { correct, sheriffPositions: remainingSheriffPositions };
}
