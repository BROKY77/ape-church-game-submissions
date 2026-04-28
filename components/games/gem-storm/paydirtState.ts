import type {
    SymbolType,
    JackpotTier,
    CelebrationTier,
} from "./paydirtConfig";
import { GAME_CONFIG } from "./paydirtConfig";

export type View = 0 | 1 | 2;

export type Phase =
    | "idle"
    | "spinning"
    | "tensionBuilding"
    | "evaluating"
    | "holdTrigger"
    | "holdRespin"
    | "holdComplete"
    | "celebrating"
    | "gameOver";

export interface CellState {
    index: number;
    symbol: SymbolType;
    goldValue: number | null;
    isLocked: boolean;
    isSpinning: boolean;
    /** True during the ~500ms visible deceleration phase — strip slows through tease items to the target. */
    isDecelerating: boolean;
    /** True during the brief (~450ms) bounce-into-place animation after a reel stops. */
    isStopping: boolean;
    isMarker: boolean;
    isLit: boolean;
    justLocked: boolean;
    isHardSpot: boolean;
    /** Only set on chest cells: the multiplier that produced this chest's
     *  value. Displayed as a ×N badge so players can see what rolled,
     *  because the coin-flip overlay is ephemeral. */
    chestMultiplier?: number;
}

export interface ChestResolution {
    /** Cell where the chest landed. Locks in place like a normal gem but
     *  pays 0 on its own — its contribution is the multiplier it applies
     *  to the rest of the board at payout time. */
    cellIdx: number;
    /** Multiplier rolled from CHEST_MULTIPLIER_WEIGHTS (2+ after dropping
     *  1× so every chest is guaranteed to do something). */
    multiplier: number;
}

export interface RespinStep {
    /** Indices in the grid (0-15) that land gold on this respin step. */
    hits: number[];
    /** Credit multipliers for each hit, parallel to `hits`. */
    values: number[];
    /** Jackpot tiers for each hit (most are 'none'), parallel to `hits`. */
    tiers: JackpotTier[];
    counterBefore: number;
    counterAfter: number;
    /** Set when a chest landed this step — board-clear + pot consolidation
     *  happens as a single event. When present, `hits` will contain only
     *  the chest's cell (no other cells land this step). */
    chest?: ChestResolution;
}

export interface GameOutcome {
    seed: string;
    /** Pre-resolved base-spin symbols for each of the 16 cells. */
    baseReelStops: SymbolType[];
    /** Which of the 4 marker positions filled on the base spin. */
    markerFills: boolean[];
    /** Randomized landing order for the 4 markers (derived from seed for replay determinism). */
    markerLandOrder: number[];
    /** Index (0-15) of the hard spot for this round. */
    hardSpotIndex: number;
    /** Starting nugget values when Hold phase begins (parallel to cell indices that have gold at trigger time). */
    startingNuggetValues: Map<number, number>;
    /** Starting nugget jackpot tiers (same parallel mapping). */
    startingNuggetTiers: Map<number, JackpotTier>;
    respinSequence: RespinStep[];
    jackpotTier: JackpotTier;
    /** Total payout as a multiple of bet. */
    totalPayoutMultiplier: number;
    /** Base-game scatter pay (regular symbol wins), in bet-multiples. */
    basePayoutMultiplier: number;
    /** Per-symbol breakdown of base-game scatter wins. */
    basePayoutBreakdown: Array<{ symbol: SymbolType; count: number; mult: number }>;
    /** Whether Hold the Gold triggered (4/4 markers filled). */
    triggered: boolean;
}

export interface JackpotPools {
    mini: number;
    minor: number;
    major: number;
    grand: number;
}

export interface PaydirtState {
    view: View;
    phase: Phase;
    bet: number;
    balance: number;
    grid: CellState[];
    outcome: GameOutcome | null;
    /** Marker fill count — drives tension tier (0..4). */
    tensionLevel: 0 | 1 | 2 | 3 | 4;
    /** Consecutive marker hits starting from the FIRST marker to land.
     *  A single miss breaks the streak permanently for the spin (stays at
     *  0 from that point). Drives the progressive zoom-in on the grid as
     *  the streak builds. */
    markerStreakZoom: 0 | 1 | 2 | 3;
    respinsRemaining: number;
    respinStepIndex: number;
    /** Consecutive bonus-round missed respins (steps with zero hits). Each
     *  miss pushes the camera deeper in for rising tension; any hit (or
     *  chest) resets to 0. Cleared on bonus end / reset. */
    respinMissStreak: number;
    runningTotal: number;
    lastWin: number;
    jackpotPools: JackpotPools;
    celebrationTier: CelebrationTier | null;
    /** True when playGame is in-flight (transaction pending or replaying). */
    isLoading: boolean;
    /** True for Rewatch mode — no balance deduction, no new seed. */
    inReplayMode: boolean;
    /** Number of auto-spins still queued. 0 = not in auto-spin mode. The
     *  game watches this counter — when it reaches gameOver it decrements
     *  and chains the next spin. */
    autoSpinsRemaining: number;
    /** Spin-speed preset. "slow" = original cinematic timings, "fast" =
     *  default tightened timings, "turbo" = maximally compressed (base
     *  spin only — bonus round caps at fast for legibility). */
    speed: "slow" | "fast" | "turbo";
}

export function makeEmptyGrid(): CellState[] {
    const grid: CellState[] = [];
    for (let i = 0; i < GAME_CONFIG.TOTAL_POSITIONS; i++) {
        grid.push({
            index: i,
            symbol: "empty-pan",
            goldValue: null,
            isLocked: false,
            isSpinning: false,
            isDecelerating: false,
            isStopping: false,
            isMarker: (GAME_CONFIG.MARKER_POSITIONS as readonly number[]).includes(i),
            isLit: false,
            justLocked: false,
            isHardSpot: false,
        });
    }
    return grid;
}

export const initialState: PaydirtState = {
    view: 0,
    phase: "idle",
    bet: GAME_CONFIG.DEFAULT_BET,
    balance: GAME_CONFIG.STARTING_BALANCE,
    grid: makeEmptyGrid(),
    outcome: null,
    tensionLevel: 0,
    markerStreakZoom: 0,
    respinsRemaining: 0,
    respinStepIndex: 0,
    respinMissStreak: 0,
    runningTotal: 0,
    lastWin: 0,
    jackpotPools: {
        mini: GAME_CONFIG.JACKPOT_MINI,
        minor: GAME_CONFIG.JACKPOT_MINOR,
        major: GAME_CONFIG.JACKPOT_MAJOR_START,
        grand: GAME_CONFIG.JACKPOT_GRAND_START,
    },
    celebrationTier: null,
    autoSpinsRemaining: 0,
    isLoading: false,
    inReplayMode: false,
    speed: "fast",
};
