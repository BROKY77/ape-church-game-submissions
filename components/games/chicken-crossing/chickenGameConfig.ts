import { Game } from "@/lib/games";

export const CHICKEN_MAX_SAFE_LANES = 19;
export const CHICKEN_FINISH_LANE = CHICKEN_MAX_SAFE_LANES + 1;
const CHICKEN_HOUSE_EDGE_FACTOR = 0.99;

export const chickenGame: Game = {
    title: "Chicken Crossing",
    description: "Cross the road to increase your multiplier. Cash out before you get hit!",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/chicken-crossing/road_background.png",
    card: "/submissions/chicken-crossing/card.png",
    banner: "/submissions/chicken-crossing/banner.png",
    // Use an MP3 track for template-level song playback; in-game component also handles layered audio.
    song: "/submissions/chicken-crossing/audio/chicken-street-music.mp3",
    themeColorBackground: "#00E701",
    payouts: {
        0: {
            0: { 0: 0 },
        },
    },
};

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

// Calibrated multiplier ladders (2dp display values) aligned to observed Stake-style
// progressions for the available lane counts on each difficulty.
// Easy goes to 19 lanes, Medium to 17, Hard to 15, Expert to 10.
const CHICKEN_MULTIPLIER_LADDERS: Record<Difficulty, readonly number[]> = {
    Easy: [
        1.03, 1.09, 1.15, 1.23, 1.31, 1.40, 1.51, 1.63, 1.78, 1.96,
        2.18, 2.45, 2.80, 3.27, 3.92, 4.90, 6.53, 9.80, 19.60,
    ],
    Medium: [
        1.15, 1.37, 1.64, 2.00, 2.46, 3.07, 3.91, 5.08, 6.77, 9.31,
        13.30, 19.95, 31.92, 55.86, 111.72, 279.30, 1117.20,
    ],
    Hard: [
        1.31, 1.77, 2.46, 3.48, 5.06, 7.59, 11.81, 19.18, 32.89, 60.29,
        120.59, 271.32, 723.52, 2532.32, 15193.92,
    ],
    Expert: [
        1.96, 4.14, 9.31, 22.61, 60.29, 180.88, 633.08, 2743.35, 16460.08, 181060.88,
    ],
} as const;

const getDifficultyLadder = (difficulty: Difficulty): readonly number[] =>
    CHICKEN_MULTIPLIER_LADDERS[difficulty];

export const getDifficultyMaxSafeLanes = (difficulty: Difficulty): number =>
    getDifficultyLadder(difficulty).length;

export const getDifficultyFinishLane = (difficulty: Difficulty): number =>
    getDifficultyMaxSafeLanes(difficulty) + 1;

const createSeededRandom = (seed: string) => {
    let state = 2166136261 >>> 0;

    for (let i = 0; i < seed.length; i += 1) {
        state ^= seed.charCodeAt(i);
        state = Math.imul(state, 16777619);
    }

    return () => {
        state += 0x6d2b79f5;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const getChickenMultiplier = (stepsPassed: number, difficulty: Difficulty): number => {
    if (stepsPassed === 0) return 0;
    const ladder = getDifficultyLadder(difficulty);
    const clampedStep = Math.min(Math.max(1, stepsPassed), ladder.length);
    return ladder[clampedStep - 1];
};

export const getCrashProbability = (difficulty: Difficulty): number => {
    const ladder = getDifficultyLadder(difficulty);
    if (ladder.length === 0) return 0;

    // Lane 1 includes the global house edge factor.
    const firstStepSurvival = Math.min(1, Math.max(0, CHICKEN_HOUSE_EDGE_FACTOR / ladder[0]));
    return 1 - firstStepSurvival;
};

const getStepSurvivalProbability = (difficulty: Difficulty, stepIndex: number): number => {
    const ladder = getDifficultyLadder(difficulty);
    if (stepIndex < 1 || stepIndex > ladder.length) {
        return 0;
    }

    if (stepIndex === 1) {
        return Math.min(1, Math.max(0, CHICKEN_HOUSE_EDGE_FACTOR / ladder[0]));
    }

    const prev = ladder[stepIndex - 2];
    const current = ladder[stepIndex - 1];
    return Math.min(1, Math.max(0, prev / current));
};

export const resolveMaxSafeLanes = (
    gameId: bigint,
    difficulty: Difficulty,
    maxSafeLanes = getDifficultyMaxSafeLanes(difficulty)
): number => {
    const random = createSeededRandom(
        `chicken-crossing:${gameId.toString(16)}:${difficulty}`
    );
    const laneCap = Math.min(maxSafeLanes, getDifficultyMaxSafeLanes(difficulty));

    let safeLanes = 0;
    while (safeLanes < laneCap) {
        const nextStep = safeLanes + 1;
        const survivalProb = getStepSurvivalProbability(difficulty, nextStep);

        if (random() > survivalProb) {
            break;
        }

        safeLanes += 1;
    }

    return safeLanes;
};
