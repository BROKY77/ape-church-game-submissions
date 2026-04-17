// Foxy Shooter - Game Constants

// House edge: 2%
export const HOUSE_EDGE = 0.02;
export const PAYOUT_FACTOR = 1 - HOUSE_EDGE; // 0.98

// Ways to roll each sum (out of 36 total combinations)
export const WAYS: Record<number, number> = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1,
};

export const TOTAL_WAYS = 36;

// Model A: combined bet multiplier based on selected zones
// Combined probability p = sum of (WAYS[sum] / 36) for all selected sums
// Multiplier = 0.98 / p
// Payout on any hit = betAmount * multiplier
export function getCombinedProbability(selectedSums: number[]): number {
    let totalWays = 0;
    for (const sum of selectedSums) {
        totalWays += WAYS[sum] ?? 0;
    }
    return totalWays / TOTAL_WAYS;
}

export function getMultiplier(selectedSums: number[]): number {
    const p = getCombinedProbability(selectedSums);
    if (p <= 0) return 0;
    return PAYOUT_FACTOR / p;
}

// Legacy static multiplier map (single zone selection)
// Used only for display in setup card
export const MULTIPLIERS: Record<number, number> = Object.fromEntries(
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((sum) => [
        sum,
        Math.round((PAYOUT_FACTOR / (WAYS[sum] / TOTAL_WAYS)) * 100) / 100,
    ])
);

// All possible dice sums
export const DICE_SUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// Dice face dot positions for rendering CSS dice
// Each face maps to an array of (row, col) positions for dots in a 3x3 grid
export const DICE_FACES: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// Balloon pastel colors
export const BALLOON_COLORS = [
    "#FF6B8A", // pink
    "#4AADE8", // sky blue
    "#7ED957", // green
    "#FFD93D", // yellow
    "#C084FC", // purple
    "#FF8C42", // orange
] as const;

// Type for selected zones
export type SelectedZones = Map<number, number>; // sum -> bet amount
