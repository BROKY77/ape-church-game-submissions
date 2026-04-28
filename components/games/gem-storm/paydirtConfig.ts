import { Game } from "@/lib/games";

export const paydirt: Game = {
    title: "Gem Storm",
    description: "Every gem on the board carries its own multiplier. Fill the four diamond markers to trigger Hold the Gems and lock every gem on the grid.",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/gem-storm/background.webp",
    // animatedBackground: "/submissions/gem-storm/animated-background.mp4",
    card: "/submissions/gem-storm/card.png", // 1:1 aspect ratio (1024x1024)
    banner: "/submissions/gem-storm/banner.png", // 2:1 aspect ratio (1600x800)
    advanceToNextStateAsset: "/submissions/gem-storm/advance-button.png",
    themeColorBackground: "#1a0f2a",
    song: "/submissions/gem-storm/audio/song.mp3",
    payouts: {
        0: {
            0: { 0: 2847392, 1: 847291, 2: 492837, 3: 183746, 4: 937284, 5: 628394 },
            1: { 0: 729384, 1: 384729, 2: 293847, 3: 847293, 4: 293847, 5: 192837 },
            2: { 0: 384729, 1: 192837, 2: 48293, 3: 29384, 4: 84729 },
            3: { 0: 293847, 1: 84729, 2: 38472, 3: 92837 },
            4: { 0: 284739, 1: 192837, 2: 48293, 4: 29384, 3: 84729 },
            5: { 0: 192837, 1: 92837, 2: 38472, 3: 29384, 5: 19283 },
        },
        1: {
            0: { 0: 847293, 1: 384729, 2: 293847, 3: 192837, 5: 92837, 4: 48293 },
            1: { 1: 592837, 0: 483729, 2: 92837, 3: 38472, 5: 29384, 4: 19283 },
            2: { 0: 192837, 2: 29384, 1: 92837, 3: 38472 },
            3: { 0: 284739, 1: 84729, 3: 19283, 2: 48293 },
            4: { 0: 183746, 1: 92837, 3: 29384, 4: 38472 },
            5: { 0: 192837, 1: 48293, 2: 19283, 5: 9283 },
        },
        2: {
            0: { 1: 384729, 2: 92837, 0: 592837, 3: 48293, 5: 29384, 4: 19283 },
            1: { 0: 293847, 2: 38472, 1: 192837, 3: 29384, 5: 19283, 4: 48293 },
            2: { 2: 59283, 0: 84729, 1: 48293, 3: 9283, 4: 38472, 5: 2938 },
            3: { 0: 92837, 1: 48293 },
            4: { 0: 84729, 1: 38472, 2: 9283 },
            5: { 0: 48293, 1: 29384, 2: 3847 },
        },
        3: {
            0: { 0: 483729, 1: 284739, 3: 59283, 2: 38472, 4: 19283 },
            1: { 0: 293847, 1: 192837, 2: 48293, 3: 29384, 4: 38472, 5: 19283 },
            2: { 0: 59283, 1: 29384, 2: 9283, 3: 3847 },
            3: { 3: 48293, 0: 59283, 1: 29384, 2: 3847 },
        },
        4: {
            0: { 0: 384729, 1: 192837, 2: 48293, 3: 29384, 4: 38472 },
            1: { 1: 92837, 0: 192837, 4: 29384 },
            2: { 0: 48293, 1: 29384 },
            3: { 0: 38472, 1: 19283 },
            4: { 4: 29384, 0: 48293, 1: 19283 },
            5: { 0: 38472 },
        },
        5: {
            0: { 0: 483729, 1: 284739, 2: 59283, 3: 38472, 4: 29384, 5: 19283 },
            1: { 0: 192837, 1: 92837, 2: 29384, 3: 38472 },
            2: { 0: 48293, 1: 29384, 2: 3847, 4: 9283 },
            3: { 0: 38472, 1: 19283 },
            4: { 0: 29384, 1: 19283 },
            5: { 5: 29384, 0: 38472, 1: 19283, 2: 3847, 3: 9283, 4: 2938 },
        },
    },
};

// ============================================================================
// PAYDIRT GAME MATH & LAYOUT
// Everything below is the real Paydirt config. The `paydirt: Game` export
// above is the Ape Church platform integration object (required by the
// template's GameWindow). Paydirt doesn't use the payouts matrix.
// ============================================================================

/** Every non-empty cell rolls a gem. Visual tier (low/mid/high) is derived
 *  from the rolled multiplier value at render time. Jackpot tiers are
 *  separate symbol values so they can be detected without checking pools. */
export type SymbolType =
    | "empty-pan"
    | "gold"
    | "gold-mini"
    | "gold-minor"
    | "gold-major"
    | "gold-grand"
    | "chest";

export type JackpotTier = "none" | "mini" | "minor" | "major" | "grand";

export interface CelebrationTier {
    readonly name: string;
    readonly threshold: number;
    readonly duration: number;
    readonly particles: number;
    readonly shake: boolean;
    readonly overlay: string | null;
}

export const GAME_CONFIG = {
    GRID_COLS: 5,
    GRID_ROWS: 5,
    TOTAL_POSITIONS: 25,

    // Diamond pattern around the center cell (idx 12). 4 markers spaced
    // symmetrically — top (7), left (11), right (13), bottom (17).
    MARKER_POSITIONS: [7, 11, 13, 17] as const,
    // Reels stop right-to-left (rightmost column first, leftmost last).
    MARKER_REEL_STOP_ORDER: [4, 3, 2, 1, 0] as const,
    NON_MARKER_POSITIONS: [
        0, 1, 2, 3, 4,
        5, 6, 8, 9,
        10, 12, 14,
        15, 16, 18, 19,
        20, 21, 22, 23, 24,
    ] as const,

    EMPTY_PAN_RATE: 0.55,
    MARKER_FILL_RATE_PER_SPIN: 0.45,

    TENSION_ZOOM_SCALE: 1.04,
    TENSION_ZOOM_DURATION_MS: 600,
    TENSION_REEL_DECEL_MULTIPLIER: 2,
    TENSION_DIM_OUTER_OPACITY: 0.4,
    BREATH_HOLD_MS: 200,
    PER_SYMBOL_MICRO_PAUSE_MS: 80,

    RESPINS_INITIAL: 3,
    // Per-cell-per-respin probability a gold nugget lands. With 12 empty cells,
    // P(at least one hit) = 1-(1-p)^12. At p=0.025 that's ~27% of respins reset
    // the counter — gives long Hold rounds without guaranteeing a full grid.
    RESPIN_GOLD_RATE_EASY: 0.025,
    RESPIN_GOLD_RATE_HARD: 0.003,

    // Chest mechanic: when a respin hit occurs, roll against this rate to
    // convert the hit into a "chest" event instead of a normal gem. Chests
    // are "multiplier tokens" — they don't sweep gems, they just lock onto
    // a cell and apply their rolled multiplier to the FINAL bonus payout.
    // Multiple chests multiply together (product), capped at CHEST_STACK_CAP.
    CHEST_RATE_PER_HIT: 0.08,
    // Hard cap on chests per bonus round — keeps the number of multiplier
    // stacks finite regardless of respin length.
    MAX_CHESTS_PER_ROUND: 5,
    // Hard cap on the PRODUCT of all chest multipliers in a round. Keeps
    // pathological seeds (e.g. two 25×s = 625×) from blowing RTP variance.
    // Tune after sim; 50× is a deliberately conservative starting point.
    CHEST_STACK_CAP: 50,
    MAX_RESPINS_CAP: 50,
    RESPIN_RESET_ON_HIT: true,

    // Tuned via 500k-spin sims to land RTP near the ~98% target. Previous
    // runs: avg 0.793 → 88.86%, avg 0.875 → 91.33%. Bumping to avg 0.945
    // (+8%) should land around 98%.
    GOLD_VALUES: [0.25, 0.5, 0.75, 1.25, 2, 3, 5, 10] as const,
    GOLD_VALUE_WEIGHTS: [30, 25, 18, 12, 7, 4, 2, 1] as const,

    JACKPOT_MINI: 5,
    JACKPOT_MINOR: 12,
    JACKPOT_MAJOR_START: 100,
    JACKPOT_GRAND_START: 1200,

    MAJOR_CONTRIBUTION: 0.005,
    GRAND_CONTRIBUTION: 0.002,

    JACKPOT_MINI_WEIGHT: 3,
    JACKPOT_MINOR_WEIGHT: 1,
    JACKPOT_MAJOR_WEIGHT: 0.2,
    JACKPOT_GRAND_WEIGHT: 0.05,

    TARGET_RTP: 0.96,

    REEL_SPIN_DURATION_MS: 1200,
    REEL_STOP_GAP_MS: 120,
    GOLD_LOCK_ANIM_MS: 400,
    RESPIN_DELAY_MS: 800,
    NEAR_MISS_PAUSE_MS: 600,
    COUNT_UP_DURATION_MS: 1500,

    STARTING_BALANCE: 100,
    MIN_BET: 0.1,
    MAX_BET: 10,
    DEFAULT_BET: 1,

    // Shake only kicks in when the bonus grid is nearly full. 20/25 = 80%
    // locked before the gentle rumble starts; 23/25 = 92% for the full shake.
    RUMBLE_THRESHOLD: 20,
    EARTHQUAKE_THRESHOLD: 23,
} as const;

/** Chest multiplier roll table. No 1× — every chest is guaranteed to do
 *  something. Weights tuned via sim to land RTP near 98%: prior mean
 *  (3.88) gave RTP 124.86%, so weights shifted toward the 2× floor to
 *  drop mean toward 3.0× and pull RTP back to target. */
export const CHEST_MULTIPLIER_WEIGHTS: ReadonlyArray<[number, number]> = [
    [2,   650],   // 65%
    [3,   230],   // 23%
    [5,    80],   // 8%
    [10,   30],   // 3%
    [25,    8],   // 0.8%
    [100,   2],   // 0.2%
];

/** Gems-only base distribution. Empty cells dominate so triggers stay rare;
 *  the rest are mostly regular gems but include rare jackpot-tier gems that
 *  carry their tier into the bonus round if they land on a marker. */
export const BASE_SYMBOL_WEIGHTS: ReadonlyArray<[SymbolType, number]> = [
    ["empty-pan",  70],
    ["gold",       29.4],
    ["gold-mini",   0.4],
    ["gold-minor",  0.15],
    ["gold-major",  0.04],
    ["gold-grand",  0.01],
];

export const CELEBRATION_TIERS: ReadonlyArray<CelebrationTier> = [
    { name: "NONE",      threshold: 0,    duration: 0,     particles: 0,   shake: false, overlay: null },
    { name: "SMALL",     threshold: 5,    duration: 2000,  particles: 10,  shake: false, overlay: null },
    { name: "MEDIUM",    threshold: 15,   duration: 3000,  particles: 30,  shake: false, overlay: null },
    { name: "BIG",       threshold: 50,   duration: 4000,  particles: 60,  shake: true,  overlay: "BIG WIN" },
    { name: "MEGA",      threshold: 100,  duration: 5000,  particles: 100, shake: true,  overlay: "MEGA WIN" },
    { name: "EPIC",      threshold: 250,  duration: 6000,  particles: 150, shake: true,  overlay: "EPIC WIN" },
    { name: "LEGENDARY", threshold: 500,  duration: 8000,  particles: 200, shake: true,  overlay: "LEGENDARY" },
    { name: "JACKPOT",   threshold: 1000, duration: 10000, particles: 300, shake: true,  overlay: "GEM STORM!" },
];

export const LAYOUT = {
    gridCols: 4,
    gridRows: 4,
    gridWidth: "min(92vw, 520px)",
    gridAspect: "1 / 1",
    gridGap: 6,
    cellRadius: 12,

    headerHeight: 56,
    footerHeight: 96,
    betBottom: 16,
    respinTop: "9%",
    respinRight: "5%",
    totalBottom: "14%",

    reelSpinMs: 1200,
    reelGapMs: 120,
    lockMs: 400,
} as const;

export const isMarker = (index: number): boolean =>
    (GAME_CONFIG.MARKER_POSITIONS as readonly number[]).includes(index);

export function pickCelebrationTier(multiplier: number): CelebrationTier {
    let tier = CELEBRATION_TIERS[0];
    for (const t of CELEBRATION_TIERS) {
        if (multiplier >= t.threshold) tier = t;
    }
    return tier;
}
