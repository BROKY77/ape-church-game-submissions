import type { Hex } from "viem";
import { Game } from "@/lib/games";

export type PunchPhase = "idle" | "loading" | "impact" | "reveal" | "resolve";

export interface ResolvedPunchRound {
  gameId: bigint;
  threshold: number;
  roll: number;
  didWin: boolean;
  multiplier: number;
  payout: number;
  buyIn: number;
  randomWord: `0x${string}`;
}

export const MACHINE_THEME = {
  accent: "#ef4f34",
  accentSoft: "#ffb067",
  success: "#6ef29a",
  danger: "#ff6178",
  ink: "#140d17",
  panel: "#1f1725",
  panelBorder: "#503743",
} as const;

const createFramePath = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => {
    const frame = String(index + 1).padStart(4, "0");
    return `${prefix}/f-${frame}.png`;
  });

export const SCENE_FRAMES = {
  machineStatic: "/my-game/boxing-machine/static.png",
  machineImpact: createFramePath("/my-game/boxing-machine/hit", 24),
  boxerIdle: createFramePath("/my-game/boxer/idle", 13),
  boxerPunch: createFramePath("/my-game/boxer/punch", 13),
  boxerWin: createFramePath("/my-game/boxer/win", 8),
  boxerLoss: createFramePath("/my-game/boxer/loss", 13),
  flash: createFramePath("/my-game/camera-flash", 20),
  confetti: createFramePath("/my-game/confetti", 8),
  explosion: createFramePath("/my-game/explosion", 20),
  loseOverlay: "/my-game/lose-overlay.png",
  cheerleaders: {
    idle: [
      createFramePath("/my-game/cheerleader/cheerleader-idle/v1", 11),
      createFramePath("/my-game/cheerleader/cheerleader-idle/v2", 11),
      createFramePath("/my-game/cheerleader/cheerleader-idle/v3", 11),
    ],
    celebration: [
      createFramePath("/my-game/cheerleader/cheerleader-celebration/v1", 10),
      createFramePath("/my-game/cheerleader/cheerleader-celebration/v2", 10),
      createFramePath("/my-game/cheerleader/cheerleader-celebration/v3", 10),
    ],
    disappointed: [
      createFramePath("/my-game/cheerleader/cheerleader-dissapointed/v1", 12),
      createFramePath("/my-game/cheerleader/cheerleader-dissapointed/v2", 12),
      createFramePath("/my-game/cheerleader/cheerleader-dissapointed/v3", 12),
    ],
  },
} as const;

export const PUNCH_MACHINE_COPY = {
  title: "Look Punch",
  subtitle: "Pick a target from 250 to 999 and hope the top roll clears it.",
  description:
    "Choose a buy-in and a target score from 250 to 999. Two random scores are generated, the higher one is used, and you win when it meets or beats your target.",
} as const;

export const PUNCH_MACHINE_LIMITS = {
  minBet: 1,
  maxBet: 250,
  minThreshold: 250,
  maxThreshold: 999,
  loadingDurationMs: 1300,
  impactDurationMs: 1200,
  revealDurationMs: 1000,
  resolveDurationMs: 1400,
  lossExplosionDelayMs: 200,
  resultModalDelayMs: 700,
} as const;

export const THRESHOLD_PRESETS = [250, 500, 750, 900, 975];

const SCORE_MODULUS = BigInt(1000);
const RANDOM_WORD_SHIFT = BigInt(16);
const TOTAL_PAIR_COUNT = BigInt(1000000);
const PAYOUT_DENOMINATOR = BigInt(10000);
const RTP_BPS = BigInt(9750);
const PAYOUT_DISPLAY_PRECISION = 1_000;

export const isThresholdInRange = (threshold: number): boolean =>
  threshold >= PUNCH_MACHINE_LIMITS.minThreshold &&
  threshold <= PUNCH_MACHINE_LIMITS.maxThreshold;

export const getWinningPairCount = (threshold: number): bigint => {
  if (!isThresholdInRange(threshold)) {
    throw new Error("Target out of range");
  }

  return TOTAL_PAIR_COUNT - BigInt(threshold * threshold);
};

export const getWinChanceForThreshold = (threshold: number): number =>
  Number(getWinningPairCount(threshold)) / Number(TOTAL_PAIR_COUNT);

export const getPayoutBpsForThreshold = (threshold: number): number =>
  Number((RTP_BPS * TOTAL_PAIR_COUNT) / getWinningPairCount(threshold));

export const getMultiplierForThreshold = (threshold: number): number =>
  getPayoutBpsForThreshold(threshold) / Number(PAYOUT_DENOMINATOR);

export const getPayoutForRound = (buyIn: number, threshold: number): number => {
  const payoutBps = getPayoutBpsForThreshold(threshold);
  return (
    Math.floor((buyIn * payoutBps * PAYOUT_DISPLAY_PRECISION) / Number(PAYOUT_DENOMINATOR)) /
    PAYOUT_DISPLAY_PRECISION
  );
};

export const getRollFromRandomWord = (randomWord: Hex): number => {
  const word = BigInt(randomWord);
  const firstRoll = Number(word % SCORE_MODULUS);
  const secondRoll = Number((word >> RANDOM_WORD_SHIFT) % SCORE_MODULUS);

  return Math.max(firstRoll, secondRoll);
};

export const resolvePunchRound = (
  buyIn: number,
  threshold: number,
  gameId: bigint,
  randomWord: Hex,
  forcedRoll?: number
): ResolvedPunchRound => {
  if (!isThresholdInRange(threshold)) {
    throw new Error("Target out of range");
  }

  const roll = forcedRoll ?? getRollFromRandomWord(randomWord);
  const didWin = roll >= threshold;
  const multiplier = getMultiplierForThreshold(threshold);
  const payout = didWin ? getPayoutForRound(buyIn, threshold) : 0;

  return {
    gameId,
    threshold,
    roll,
    didWin,
    multiplier,
    payout,
    buyIn,
    randomWord,
  };
};

export const getMachineTierLabel = (roll: number): string => {
  if (roll >= 950) return "Titanic hit";
  if (roll >= 800) return "Street legend";
  if (roll >= 600) return "Heavy hands";
  if (roll >= 400) return "Solid shot";
  return "Light tap";
};

export const myGame: Game = {
  title: PUNCH_MACHINE_COPY.title,
  description: PUNCH_MACHINE_COPY.description,
  gameAddress: "0x1234567890123456789012345678901234567890",
  gameBackground: "/my-game/background.png",
  card: "/my-game/card.jpg",
  banner: "/my-game/banner.jpg",
  themeColorBackground: MACHINE_THEME.accent,
  payouts: {
    0: {
      0: { 0: 0 },
    },
  },
};
