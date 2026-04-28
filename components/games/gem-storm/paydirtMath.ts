import { keccak256, toBytes, bytesToHex, type Hex } from "viem";
import {
    GAME_CONFIG,
    BASE_SYMBOL_WEIGHTS,
    CHEST_MULTIPLIER_WEIGHTS,
    type SymbolType,
    type JackpotTier,
} from "./paydirtConfig";
import type { GameOutcome, RespinStep, ChestResolution } from "./paydirtState";

// ============================================================================
// Deterministic RNG — every outcome derives from a single seed.
// Matches the on-chain pattern (seed expanded via keccak256(seed, i) for i in 0..N)
// so the client can pre-compute the exact same result the contract will deliver.
// ============================================================================

/** Expand a seed into N pseudo-random 64-bit slices (as Number in [0, 1)). */
export function expandSeed(seed: Hex, n: number): number[] {
    const out: number[] = [];
    const seedBytes = toBytes(seed, { size: 32 });
    for (let i = 0; i < n; i++) {
        // Domain-separate each expansion step.
        const idx = new Uint8Array(32);
        idx[31] = i & 0xff;
        idx[30] = (i >>> 8) & 0xff;
        idx[29] = (i >>> 16) & 0xff;
        idx[28] = (i >>> 24) & 0xff;
        const concat = new Uint8Array(64);
        concat.set(seedBytes, 0);
        concat.set(idx, 32);
        const hash = keccak256(concat, "bytes");
        // Take top 52 bits of the hash → uniform [0, 1).
        // 6 bytes = 48 bits, + top nibble of byte 6 = 4 more bits = 52 total.
        let hi = 0;
        for (let b = 0; b < 6; b++) hi = hi * 256 + hash[b];
        hi = hi * 16 + (hash[6] >> 4);
        out.push(hi / 2 ** 52);
    }
    return out;
}

/** Pick from a weighted list given a uniform random number in [0, 1). */
function weightedPick<T>(weights: ReadonlyArray<readonly [T, number]>, r: number): T {
    let total = 0;
    for (const [, w] of weights) total += w;
    let roll = r * total;
    for (const [item, w] of weights) {
        roll -= w;
        if (roll <= 0) return item;
    }
    return weights[weights.length - 1][0];
}

/** Pick a gold credit value (1x, 2x, ..., 50x) from its weighted distribution. */
function pickGoldValue(r: number): number {
    const pairs: Array<readonly [number, number]> = [];
    for (let i = 0; i < GAME_CONFIG.GOLD_VALUES.length; i++) {
        pairs.push([GAME_CONFIG.GOLD_VALUES[i], GAME_CONFIG.GOLD_VALUE_WEIGHTS[i]]);
    }
    return weightedPick(pairs, r);
}

/** Pick a jackpot tier (rare) — most rolls return 'none'. */
function pickJackpotTier(r: number): JackpotTier {
    const weights: ReadonlyArray<readonly [JackpotTier, number]> = [
        ["none", 1000],
        ["mini", GAME_CONFIG.JACKPOT_MINI_WEIGHT],
        ["minor", GAME_CONFIG.JACKPOT_MINOR_WEIGHT],
        ["major", GAME_CONFIG.JACKPOT_MAJOR_WEIGHT],
        ["grand", GAME_CONFIG.JACKPOT_GRAND_WEIGHT],
    ];
    return weightedPick(weights, r);
}

/** Pick a base-game symbol from the weighted distribution. */
function pickBaseSymbol(r: number): SymbolType {
    return weightedPick(BASE_SYMBOL_WEIGHTS, r);
}

/** Pick a chest multiplier from the exponentially-decaying weighted table. */
function pickChestMultiplier(r: number): number {
    return weightedPick(CHEST_MULTIPLIER_WEIGHTS, r);
}

/** Convert a symbol into a jackpot tier if it's a gold-jackpot variant, else 'none'. */
function tierFromSymbol(sym: SymbolType): JackpotTier {
    if (sym === "gold-mini") return "mini";
    if (sym === "gold-minor") return "minor";
    if (sym === "gold-major") return "major";
    if (sym === "gold-grand") return "grand";
    return "none";
}

/** True if this symbol counts toward Hold-phase nuggets (any gold variant
 *  or chest). Chest is a live pot-holding symbol and should behave like
 *  a gold cell for "is this position locked" purposes. */
export function isGoldSymbol(sym: SymbolType): boolean {
    return (
        sym === "gold" ||
        sym === "gold-mini" ||
        sym === "gold-minor" ||
        sym === "gold-major" ||
        sym === "gold-grand" ||
        sym === "chest"
    );
}

/** True if this symbol can fill a claim marker (anything except empty-pan). */
export function canFillMarker(sym: SymbolType): boolean {
    return sym !== "empty-pan";
}

/** Resolve the jackpot value (× bet) from a tier, using current pools. */
export function jackpotValueFromTier(
    tier: JackpotTier,
    pools: { mini: number; minor: number; major: number; grand: number },
): number {
    switch (tier) {
        case "mini":
            return pools.mini;
        case "minor":
            return pools.minor;
        case "major":
            return pools.major;
        case "grand":
            return pools.grand;
        default:
            return 0;
    }
}

// ============================================================================
// (Scatter pay removed — Gem Storm has no base-game payouts. Every visible
//  gem is a "preview" that only realizes its value if the bonus triggers.)
// ============================================================================

// ============================================================================
// Outcome resolver — single entry point.
// Takes a seed + current jackpot pools, returns the full GameOutcome.
// ============================================================================

/**
 * Resolve a full game outcome from a seed.
 *
 * Seed expansion layout (512 slots; modulo-wrapped for respin overflow):
 *   0..TOTAL_POSITIONS-1:  base-spin symbol rolls (one per grid position)
 *   TOTAL_POSITIONS..N:    gold-value / jackpot-tier rolls (one pair per starting nugget)
 *   N (==150):             hard-spot index roll
 *   151..199:              respin outcomes (3 rolls per non-locked cell per step)
 *   200..(200+MARKERS-1):  marker landing-order shuffle
 */
export function resolveOutcome(
    seed: Hex,
    pools: { mini: number; minor: number; major: number; grand: number },
): GameOutcome {
    const rolls = expandSeed(seed, 512);

    // --- Base spin ---
    // For each grid position, roll a symbol. Markers use MARKER_FILL_RATE_PER_SPIN
    // (55% empty-pan, 45% any other). Non-marker cells use the full base weights.
    const baseReelStops: SymbolType[] = [];
    for (let i = 0; i < GAME_CONFIG.TOTAL_POSITIONS; i++) {
        const r = rolls[i];
        if ((GAME_CONFIG.MARKER_POSITIONS as readonly number[]).includes(i)) {
            // Marker cells: either empty-pan (unfilled marker) or a weighted non-empty symbol.
            if (r < GAME_CONFIG.EMPTY_PAN_RATE) {
                baseReelStops.push("empty-pan");
            } else {
                // Remap r to [0,1) across the non-empty weights.
                const r2 = (r - GAME_CONFIG.EMPTY_PAN_RATE) / (1 - GAME_CONFIG.EMPTY_PAN_RATE);
                const nonEmpty = BASE_SYMBOL_WEIGHTS.filter(([s]) => s !== "empty-pan");
                baseReelStops.push(weightedPick(nonEmpty, r2));
            }
        } else {
            baseReelStops.push(pickBaseSymbol(r));
        }
    }

    // --- Marker fills ---
    const markerFills = (GAME_CONFIG.MARKER_POSITIONS as readonly number[]).map(
        (pos) => canFillMarker(baseReelStops[pos]),
    );
    const triggered = markerFills.every(Boolean);

    // --- Marker landing order (shuffled via seed, so Rewatch is deterministic) ---
    const markerLandOrder = [...GAME_CONFIG.MARKER_POSITIONS];
    for (let i = markerLandOrder.length - 1; i > 0; i--) {
        const j = Math.floor(rolls[200 + i] * (i + 1));
        [markerLandOrder[i], markerLandOrder[j]] = [markerLandOrder[j], markerLandOrder[i]];
    }

    // --- Hard spot ---
    const hardSpotRoll = rolls[150];
    const nonMarkers = GAME_CONFIG.NON_MARKER_POSITIONS;
    const hardSpotIndex = nonMarkers[Math.floor(hardSpotRoll * nonMarkers.length)];

    // --- Pre-roll values for every gem on the board ---
    // Every cell that rolled "gold" gets a multiplier value from the moment
    // it lands, regardless of whether the bonus triggers. If trigger fires,
    // these values become the starting nuggets that pay out. If not, the
    // gems are visible "previews" — the player sees what they would have won.
    const startingNuggetValues = new Map<number, number>();
    const startingNuggetTiers = new Map<number, JackpotTier>();
    let goldRollIdx = GAME_CONFIG.TOTAL_POSITIONS;

    for (let i = 0; i < baseReelStops.length; i++) {
        if (!isGoldSymbol(baseReelStops[i])) continue;
        const valueRoll = rolls[goldRollIdx++] ?? 0.5;
        const tierRoll = rolls[goldRollIdx++] ?? 0.99;
        const baseTier = tierFromSymbol(baseReelStops[i]);
        // If a jackpot-tier gem landed naturally from the base spin pool,
        // honor it — the player saw it cycle past, so it has to pay out as
        // that tier (no re-rolling to "none"). Plain "gold" still gets the
        // rare upgrade roll for fairness with old-distribution outcomes.
        if (baseTier !== "none") {
            startingNuggetValues.set(i, jackpotValueFromTier(baseTier, pools));
            startingNuggetTiers.set(i, baseTier);
            continue;
        }
        const tier = pickJackpotTier(tierRoll);
        if (tier === "none") {
            startingNuggetValues.set(i, pickGoldValue(valueRoll));
            startingNuggetTiers.set(i, "none");
        } else {
            startingNuggetValues.set(i, jackpotValueFromTier(tier, pools));
            startingNuggetTiers.set(i, tier);
        }
    }

    // --- Respin sequence ---
    const respinSequence: RespinStep[] = [];
    let topJackpot: JackpotTier = "none";

    // Live board state during simulation — every cell that's currently
    // locked maps to its current value. Chests are multiplier tokens now;
    // gems stay in place. Final payout multiplies only the REGULAR gem
    // sum by the chest product — jackpot-tier gems (mini/minor/major/grand)
    // are added as-is so chests can't unboundedly amplify jackpot pools.
    const boardValues = new Map<number, number>(startingNuggetValues);
    const jackpotCells = new Set<number>();
    for (const [idx, tier] of startingNuggetTiers) {
        if (tier !== "none") jackpotCells.add(idx);
    }

    if (triggered) {
        // Simulate respin loop deterministically. Each step: first roll a
        // global chest chance (if a hit would occur). Otherwise, for each
        // empty cell, roll against RESPIN_GOLD_RATE (EASY or HARD if
        // hard-spot cell). If any hit, counter resets to RESPINS_INITIAL;
        // otherwise decrement. Stop at counter=0 or full grid.
        let respinRollIdx = 151;
        let counter: number = GAME_CONFIG.RESPINS_INITIAL;
        const locked = new Set<number>(startingNuggetValues.keys());
        // Chests are "crystallized" — once formed they keep their pot and
        // can't be swept into another chest. Tracked separately so the
        // sweep logic can skip them. Without this, chained chests would
        // compound their multipliers and blow up RTP.
        const chestCells = new Set<number>();
        let chestsThisRound = 0;

        for (let step = 0; step < GAME_CONFIG.MAX_RESPINS_CAP; step++) {
            if (counter <= 0) break;
            if (locked.size >= GAME_CONFIG.TOTAL_POSITIONS) break;

            // Step-level chest decision: rolled ONCE up-front so a chest
            // step doesn't mix with normal hits (which would create the
            // ugly "gem lands then immediately gets swept" UX). If this
            // roll wants a chest, the FIRST cell that hits becomes the
            // chest and no other cells land this step. Requires at least
            // one non-chest cell on the board — otherwise the sweep sum
            // is zero and the chest would land as a dud.
            const stepChestRoll = rolls[respinRollIdx++ % rolls.length];
            // Chest can fire as long as we haven't hit MAX_CHESTS_PER_ROUND.
            // The old "need at least one sweepable cell" gate is gone —
            // chests are multiplier tokens now, not consolidators, so an
            // empty board is a fine chest target (it'll multiply what
            // later lands).
            const canChest = chestsThisRound < GAME_CONFIG.MAX_CHESTS_PER_ROUND;
            const wantChestThisStep = canChest && stepChestRoll < GAME_CONFIG.CHEST_RATE_PER_HIT;

            const hits: number[] = [];
            const values: number[] = [];
            const tiers: JackpotTier[] = [];
            let chest: ChestResolution | undefined;

            for (let cellIdx = 0; cellIdx < GAME_CONFIG.TOTAL_POSITIONS; cellIdx++) {
                if (locked.has(cellIdx)) continue;
                if (chest) break; // chest already resolved, skip rest
                const hitRoll = rolls[respinRollIdx++ % rolls.length];
                const rate =
                    cellIdx === hardSpotIndex
                        ? GAME_CONFIG.RESPIN_GOLD_RATE_HARD
                        : GAME_CONFIG.RESPIN_GOLD_RATE_EASY;
                if (hitRoll < rate) {
                    const valueRoll = rolls[respinRollIdx++ % rolls.length];
                    const tierRoll = rolls[respinRollIdx++ % rolls.length];
                    if (wantChestThisStep) {
                        // Chest lands on this (first) hit. FROZEN-SNAPSHOT
                        // mechanic: at the moment of landing, sum every
                        // non-chest non-jackpot gem currently on the board
                        // and multiply by the rolled multiplier. That
                        // product becomes the chest's OWN stored gold and
                        // sits on the board like a gem. Future gems land
                        // AFTER the chest and contribute their face value
                        // — they do NOT get re-multiplied. Bounded RTP
                        // because each chest only amplifies the board that
                        // existed at the instant it dropped.
                        const multRoll = rolls[respinRollIdx++ % rolls.length];
                        const multiplier = pickChestMultiplier(multRoll);

                        let snapshot = 0;
                        for (const [bIdx, bVal] of boardValues) {
                            if (chestCells.has(bIdx)) continue;
                            if (jackpotCells.has(bIdx)) continue;
                            snapshot += bVal;
                        }
                        const frozen = snapshot * multiplier;

                        boardValues.set(cellIdx, frozen);
                        locked.add(cellIdx);
                        chestCells.add(cellIdx);

                        chest = { cellIdx, multiplier };
                        hits.push(cellIdx);
                        values.push(frozen);
                        tiers.push("none");
                        chestsThisRound++;
                    } else {
                        const tier = pickJackpotTier(tierRoll);
                        hits.push(cellIdx);
                        let v: number;
                        if (tier === "none") {
                            v = pickGoldValue(valueRoll);
                            values.push(v);
                            tiers.push("none");
                        } else {
                            v = jackpotValueFromTier(tier, pools);
                            values.push(v);
                            tiers.push(tier);
                            if (tierRank(tier) > tierRank(topJackpot)) topJackpot = tier;
                            jackpotCells.add(cellIdx);
                        }
                        boardValues.set(cellIdx, v);
                        locked.add(cellIdx);
                    }
                } else {
                    // Skip value/tier rolls for non-hits — advance two
                    // slots for determinism (value, tier).
                    respinRollIdx += 2;
                }
            }

            const counterBefore = counter;
            const counterAfter = hits.length > 0 ? GAME_CONFIG.RESPINS_INITIAL : counter - 1;
            respinSequence.push({ hits, values, tiers, counterBefore, counterAfter, chest });
            counter = counterAfter;
        }

        // Full-grid → Grand jackpot. Based on live board, so a chest that
        // just swept a nearly-full grid resets this progress (fair — the
        // value was consolidated, grid fills up again from scratch).
        if (locked.size >= GAME_CONFIG.TOTAL_POSITIONS) {
            topJackpot = "grand";
        }
    }

    // --- Base payout (no scatter pay in Gem Storm — gems only pay if trigger fires) ---
    const basePayoutMultiplier = 0;

    // --- Hold payout ---
    // Chest cells carry their FROZEN contribution (snapshot × mult at
    // reveal) as their own boardValue, so the final payout is just a
    // straight sum of every cell on the board. Multipliers don't stack
    // or compound with gems that landed after the chest, which keeps
    // RTP variance bounded.
    let holdPayoutMultiplier = 0;
    if (triggered) {
        for (const v of boardValues.values()) {
            holdPayoutMultiplier += v;
        }

        // Full-grid bonus = Grand jackpot ADDED on top.
        const cellValuesIncludeGrand =
            Array.from(startingNuggetTiers.values()).some((t) => t === "grand") ||
            respinSequence.some((s) => s.tiers.some((t) => t === "grand"));
        if (topJackpot === "grand" && !cellValuesIncludeGrand) {
            holdPayoutMultiplier += pools.grand;
        }
    }

    const totalPayoutMultiplier = basePayoutMultiplier + holdPayoutMultiplier;

    return {
        seed,
        baseReelStops,
        markerFills,
        markerLandOrder,
        hardSpotIndex,
        startingNuggetValues,
        startingNuggetTiers,
        respinSequence,
        jackpotTier: topJackpot,
        totalPayoutMultiplier,
        basePayoutMultiplier,
        basePayoutBreakdown: [],
        triggered,
    };
}

function tierRank(t: JackpotTier): number {
    switch (t) {
        case "grand":
            return 4;
        case "major":
            return 3;
        case "minor":
            return 2;
        case "mini":
            return 1;
        default:
            return 0;
    }
}

// ============================================================================
// Seed generation helpers.
// ============================================================================

/** Generate a fresh 32-byte seed (client-side mock for VRF). */
export function generateSeed(): Hex {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytesToHex(bytes);
}

// ============================================================================
// Diagnostic: simulate many spins to verify RTP (used by Wave 7 verification).
// ============================================================================

export function simulateRTP(spins: number): {
    totalBet: number;
    totalPayout: number;
    rtp: number;
    triggerRate: number;
    fullGridRate: number;
    chestsPerTriggered: number;
    chestMultDist: Record<number, number>;
    avgChestMult: number;
    percentiles: { p50: number; p90: number; p99: number; p999: number; max: number };
} {
    let totalBet = 0;
    let totalPayout = 0;
    let triggers = 0;
    let fullGrids = 0;
    let chestCount = 0;
    let chestValueSum = 0;
    const chestMultDist: Record<number, number> = {};
    const payouts: number[] = [];
    const pools = {
        mini: GAME_CONFIG.JACKPOT_MINI,
        minor: GAME_CONFIG.JACKPOT_MINOR,
        major: GAME_CONFIG.JACKPOT_MAJOR_START,
        grand: GAME_CONFIG.JACKPOT_GRAND_START,
    };
    for (let i = 0; i < spins; i++) {
        const seed = generateSeed();
        const outcome = resolveOutcome(seed, pools);
        totalBet += 1;
        totalPayout += outcome.totalPayoutMultiplier;
        payouts.push(outcome.totalPayoutMultiplier);
        if (outcome.triggered) triggers++;
        if (outcome.jackpotTier === "grand") fullGrids++;
        for (const step of outcome.respinSequence) {
            if (step.chest) {
                chestCount++;
                chestValueSum += step.chest.multiplier; // track multiplier distribution
                chestMultDist[step.chest.multiplier] = (chestMultDist[step.chest.multiplier] ?? 0) + 1;
            }
        }
    }
    payouts.sort((a, b) => a - b);
    const pct = (q: number): number => payouts[Math.min(payouts.length - 1, Math.floor(q * payouts.length))];
    return {
        totalBet,
        totalPayout,
        rtp: totalPayout / totalBet,
        triggerRate: triggers / spins,
        fullGridRate: fullGrids / spins,
        chestsPerTriggered: triggers > 0 ? chestCount / triggers : 0,
        chestMultDist,
        avgChestMult: chestCount > 0 ? chestValueSum / chestCount : 0,
        percentiles: {
            p50: pct(0.5),
            p90: pct(0.9),
            p99: pct(0.99),
            p999: pct(0.999),
            max: payouts[payouts.length - 1] ?? 0,
        },
    };
}
