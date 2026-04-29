"use client";

/* ============================================================================
 * ON-CHAIN INTEGRATION SEAMS
 * ----------------------------------------------------------------------------
 * The game is fully deterministic from a single seed. Whatever randomness
 * source the platform plugs in (VRF, commit-reveal, chain entropy), the
 * integration surface is small:
 *
 *   1. Seed source — `playGame(forcedSeed?, outcomeOverride?)` (~L1354).
 *      Pass a `Hex` seed from chain entropy and the entire spin (base reels,
 *      marker landings, every respin step, every chest multiplier) is fully
 *      determined. Without `forcedSeed`, `generateSeed()` produces a local
 *      pseudo-random fallback for offline/dev play.
 *
 *   2. Outcome resolver — `resolveOutcome(seed, jackpotPools)` in
 *      `paydirtMath.ts`. Pure function, no React, no DOM. Swap or wrap as
 *      needed if outcomes should be computed by a contract instead.
 *
 *   3. Balance — local React state (`state.balance`). The bet debit happens
 *      inside `playGame` via `setState`; replace with an on-chain balance
 *      query + bet transaction when integrating.
 *
 *   4. Jackpot pools — local React state (`state.jackpotPools`). Reads are
 *      pure; the pools only feed `resolveOutcome` and the JackpotBar HUD.
 *      Replace with whatever on-chain pool state the platform provides.
 *
 *   5. Replay — `outcomeOverride` argument to `playGame` lets the same
 *      outcome be re-played without re-rolling. Used by the in-game Rewatch
 *      button; useful for replay-from-tx-hash if needed.
 *
 * Everything else (animations, audio, particles, info modal) is presentation
 * and shouldn't need integration changes.
 * ============================================================================ */

import React, {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Hex } from "viem";
import { Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";

import {
    GAME_CONFIG,
    pickCelebrationTier,
    isMarker,
    paydirt,
    type SymbolType,
} from "./paydirtConfig";
import {
    initialState,
    makeEmptyGrid,
    type PaydirtState,
    type CellState,
    type GameOutcome,
    type RespinStep,
} from "./paydirtState";
import {
    resolveOutcome,
    generateSeed,
    canFillMarker,
    isGoldSymbol,
} from "./paydirtMath";
import { AudioEngine } from "./paydirtAudio";
import { ParticleEngine, mountAmbientDust } from "./paydirtParticles";

import PaydirtWindow from "./PaydirtWindow";
import PaydirtSetupCard from "./PaydirtSetupCard";

interface PaydirtComponentProps {
    /** Optional Game manifest. The local template's app/page.tsx passes
     *  this explicitly. The submissions-repo dynamic route renders the
     *  default export with NO props (`<Game />` from the auto-generated
     *  registry), so we fall back to the in-file `paydirt` config import
     *  when missing — keeps both integration paths working. */
    game?: Game;
}

/** Derive the live hold total from grid state. Mirrors paydirtMath's payout
 *  formula so the HUD number always equals the payout if the bonus ended
 *  right now: regular gems × chest product (capped) + jackpot-tier gems.
 *  Called whenever gems land or a chest reveals its multiplier. */
const JACKPOT_TIER_SYMBOLS: ReadonlySet<SymbolType> = new Set<SymbolType>([
    "gold-mini",
    "gold-minor",
    "gold-major",
    "gold-grand",
]);
function deriveRunningTotal(grid: CellState[]): number {
    // Chest's contribution is FROZEN at reveal time: its goldValue is
    // already (non-chest non-jackpot sum at reveal) × multiplier. That
    // frozen number is the chest's own "gold" on the board, so the hold
    // total is just a straight sum of every locked cell's goldValue.
    // Gems that land after a chest do NOT get multiplied — RTP stays
    // bounded because each chest only amplifies the board that existed
    // at the instant it dropped.
    let total = 0;
    for (const c of grid) {
        if (!c.isLocked || c.goldValue === null) continue;
        total += c.goldValue;
    }
    return total;
}

// ----------------------------------------------------------------------------
// Constants for the base-spin choreography.
// Reel stop order is 0, 3, 1, 2 — outer columns first, then inner (center-last
// reveal ensures the trigger moment always lands on the final reel).
// ----------------------------------------------------------------------------

// Non-marker cells land first in reading order (L→R, top→bottom) as a fast wave.
// Then the 4 marker cells land one at a time in seed-randomized order with
// wider gaps, building tension as each fills.
const NON_MARKER_LANDING_ORDER = GAME_CONFIG.NON_MARKER_POSITIONS; // [0,1,2,3,4,7,8,11,12,13,14,15]

// Column-major order (col 0 top→bottom, then col 1 top→bottom, etc.).
// Derived from GRID_COLS × GRID_ROWS so this stays correct if the board
// dimensions change. For the current 5×5 paydirt layout this evaluates
// to [0, 5, 10, 15, 20, 1, 6, 11, 16, 21, 2, 7, 12, 17, 22, 3, 8, 13, 18,
// 23, 4, 9, 14, 19, 24]. Used to stagger the spin-start wave so the
// player sees a cascade from top-left to bottom-left and then rightward.
const CELL_ORDER_COLUMN_MAJOR: readonly number[] = (() => {
    const cols = GAME_CONFIG.GRID_COLS;
    const rows = GAME_CONFIG.GRID_ROWS;
    const out: number[] = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            out.push(r * cols + c);
        }
    }
    return out;
})();

// All spin-choreography timings in one place so normal + turbo mode stay
// in lockstep. Turbo target: ~1s per base spin (vs ~4s normal) — keeps
// the beat of the marker-wave drama at a compressed scale but blows
// through base + non-marker landings at near-instant speed. These values
// must stay aligned with the CSS animation durations in
// `paydirt.styles.css` (entry/loop/decel/vblur-fade/land-subtle).
interface SpinTimings {
    /** Stagger between each cell flipping to isSpinning at base-spin start.
     *  Produces the column-major cascade the player sees on every spin. */
    baseWaveGap: number;
    /** ms all cells spin together before any land */
    reelSpinBase: number;
    /** ms between consecutive non-marker cell landings */
    nonMarkerGap: number;
    /** breath between non-marker wave ending and marker wave starting */
    markerWaveGap: number;
    /** ms between consecutive marker cell landings */
    markerGap: number;
    /** extra ms before the 4th marker lands */
    markerFinalDrama: number;
    /** CSS decel duration — must match --pd-spin-decel */
    cellDecelMs: number;
    /** CSS click-into-place bounce — must match --pd-land-subtle */
    cellBounceMs: number;
    /** Respin: cells spin together before first lands */
    respinSpinBase: number;
    /** Respin: gap between cells landing */
    respinLandGap: number;
    /** Delay between respin steps ("tension breather") */
    respinStepGap: number;
    /** Dwell between trigger-sting firing and first respin step starting */
    triggerOverlaySettle: number;
    /** Floor on the post-bonus celebration duration */
    celebrationMin: number;
}
type SpeedMode = "slow" | "fast" | "turbo";

// Original cinematic timings before the "fast" pass. "Slow" preset
// restores this feel — long rev-up, long decel, deliberate marker wave.
const TIMINGS_SLOW: SpinTimings = {
    baseWaveGap: 30,
    reelSpinBase: 1000,
    nonMarkerGap: 90,
    markerWaveGap: 180,
    markerGap: 550,
    markerFinalDrama: 350,
    // cellDecelMs matches --pd-spin-decel exactly. Strip lands flat at
    // translateY(0), THEN the gem bounce fires. Constant gem bounce
    // (280ms) is the only click-in animation — no strip overshoot
    // underneath that would scale with speed.
    cellDecelMs: 1000,
    cellBounceMs: 280,
    respinSpinBase: 900,
    respinLandGap: 160,
    respinStepGap: 800,
    triggerOverlaySettle: 1800,
    celebrationMin: 2500,
};
// Default. Tightened cadence without rushing the marker drama.
const TIMINGS_FAST: SpinTimings = {
    baseWaveGap: 18,
    reelSpinBase: 550,
    nonMarkerGap: 45,
    markerWaveGap: 60,
    markerGap: 200,
    markerFinalDrama: 100,
    cellDecelMs: 800,
    cellBounceMs: 280,
    respinSpinBase: 400,
    respinLandGap: 120,
    respinStepGap: 400,
    triggerOverlaySettle: 1000,
    celebrationMin: 1500,
};
// All cells still animate in turbo — CSS --pd-spin-loop stays at 660ms
// across all three modes so the reel's visible scroll speed never
// changes. Turbo only compresses the CADENCE: gap between cells, marker
// drama, decel, bounce, and post-spin overlays. Note: bonus respins cap
// at "fast" even when base spin is turbo (see bonusSpeedFor) so the
// player can actually see gems land — only base spin uses these values.
const TIMINGS_TURBO: SpinTimings = {
    // 3ms × 24 col-major positions = 72ms wave end. Reel landings start at
    // reelSpinBase=200ms (cell 0) and the latest-flipping right-column cell
    // hits decel at 200+4*nonMarkerGap = 280ms. With baseWaveGap=10 the top-
    // right cell (col-major position 20) flipped at 200ms — same instant
    // landings began — so it never visibly entered the spin loop. At 3ms the
    // last cell flips at 72ms, giving every non-marker ≥208ms of spin loop
    // before its decel — enough for the 660ms strip to scroll a visible
    // gem distance instead of jumping straight to decel from blank.
    baseWaveGap: 3,
    reelSpinBase: 200,
    nonMarkerGap: 20,
    markerWaveGap: 25,
    markerGap: 70,
    markerFinalDrama: 0,
    cellDecelMs: 500,
    cellBounceMs: 280,
    respinSpinBase: 200,
    /* Turbo respin: shorter inter-cell gaps + step gaps so the bonus
       cascade reads fast, but cellDecelMs stays at 700ms (the spin
       animation speed itself isn't sped up — only the cadence of
       cells starting their landings is). */
    respinLandGap: 35,
    respinStepGap: 40,
    triggerOverlaySettle: 200,
    celebrationMin: 400,
};
function timingsFor(speed: SpeedMode): SpinTimings {
    switch (speed) {
        case "slow": return TIMINGS_SLOW;
        case "fast": return TIMINGS_FAST;
        case "turbo": return TIMINGS_TURBO;
    }
}
// Bonus round never runs at turbo — it caps at fast so the player can
// read each respin. Slow and fast pass through unchanged.
function bonusSpeedFor(speed: SpeedMode): SpeedMode {
    return speed === "turbo" ? "fast" : speed;
}

// Dead-spin "look at the board" dwells. Two values per speed:
// `postStopBuffer` is the gap between the last cell stopping and the
// gameOver setState firing; `chainDelay` is the auto-spin gap between
// gameOver and the next playGame. Together they're the "nothing
// happening" window after a dead spin (no markers, no payout). Hit
// spins (triggered) and near-miss spins (3/4 markers) bypass this and
// keep the full 100/150 dwell so those moments still breathe.
const DEAD_SPIN_DWELLS: Record<SpeedMode, { postStopBuffer: number; chainDelay: number }> = {
    slow:  { postStopBuffer: 50, chainDelay: 60 },
    fast:  { postStopBuffer: 20, chainDelay: 30 },
    turbo: { postStopBuffer: 0,  chainDelay: 0  },
};

// Per-tier spark color palettes. Each tier's burst uses the tier's accent
// hue (matching the chest-rope colors and gem halos) layered with a
// brighter highlight + cream-white sparkle so the burst reads as gem-y
// glitter rather than monochrome confetti. Sampled at burst time per
// particle from the array (paydirtParticles picks one at random per spark).
const TIER_BURST_COLORS: Record<string, string[]> = {
    low:   ["#7ddcff", "#bcefff", "#ffffff", "#5ac6ff"],
    mid:   ["#6fe380", "#b8f5c2", "#ffffff", "#3dca54"],
    high:  ["#8aa6ff", "#c4d2ff", "#ffffff", "#5b7fff"],
    mini:  ["#ff6a6a", "#ffb0b0", "#ffffff", "#ff3a3a"],
    minor: ["#d086ff", "#e8b8ff", "#ffffff", "#b04eff"],
    major: ["#ffb070", "#ffd6a8", "#ffffff", "#ff8830"],
    grand: ["#ffe878", "#fff5b8", "#ffffff", "#ffd428"],
};

// Convert resolved symbol for Hold phase display. Starting nuggets carry jackpot tier.
function goldSymbolFor(
    cellIdx: number,
    startingTiers: Map<number, "none" | "mini" | "minor" | "major" | "grand">,
): SymbolType {
    const tier = startingTiers.get(cellIdx);
    if (tier === "mini") return "gold-mini";
    if (tier === "minor") return "gold-minor";
    if (tier === "major") return "gold-major";
    if (tier === "grand") return "gold-grand";
    return "gold";
}

// ----------------------------------------------------------------------------
// Main component.
// ----------------------------------------------------------------------------

function PaydirtComponentInner({ game = paydirt }: PaydirtComponentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");

    // ---- Refs: runtime-only resources, never re-renders ----
    const audioRef = useRef<AudioEngine | null>(null);
    const particleRef = useRef<ParticleEngine | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const timerIdsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const ambientDisposeRef = useRef<(() => void) | null>(null);

    // ---- State: single source of truth ----
    const [state, setState] = useState<PaydirtState>(initialState);
    // Mirror state into a ref so callbacks (esp. playGame closure) can read
    // the latest values without re-creating themselves on every state change.
    const stateRef = useRef(state);
    stateRef.current = state;

    const [justResetFlash, setJustResetFlash] = useState(false);
    const [currentGameId, setCurrentGameId] = useState<Hex>(generateSeed());

    // ---- Memoized derived values ----
    const canReplay = !state.inReplayMode;

    const lastEmptyMarkerIdx = useMemo(() => {
        if (state.tensionLevel !== 3) return null;
        for (const pos of GAME_CONFIG.MARKER_POSITIONS) {
            if (!state.grid[pos].isLit) return pos;
        }
        return null;
    }, [state.tensionLevel, state.grid]);

    const filledCellCount = useMemo(
        () => state.grid.filter((c) => c.isLocked).length,
        [state.grid],
    );

    const rumble =
        state.phase === "holdRespin" &&
        filledCellCount >= GAME_CONFIG.RUMBLE_THRESHOLD &&
        filledCellCount < GAME_CONFIG.EARTHQUAKE_THRESHOLD;
    const earthquake =
        state.phase === "holdRespin" && filledCellCount >= GAME_CONFIG.EARTHQUAKE_THRESHOLD;

    // ---- Timer management ----
    const scheduleTimeout = useCallback((cb: () => void, delay: number) => {
        const id = setTimeout(() => {
            timerIdsRef.current = timerIdsRef.current.filter((t) => t !== id);
            cb();
        }, delay);
        timerIdsRef.current.push(id);
        return id;
    }, []);

    const clearAllTimers = useCallback(() => {
        for (const id of timerIdsRef.current) clearTimeout(id);
        timerIdsRef.current = [];
    }, []);

    // ---- Mount: audio, particles, ambient dust, session meter ----
    useEffect(() => {
        const audio = new AudioEngine();
        // Pre-register every file-backed SFX so the next user tap can
        // unlock them all in one resume() call. iOS Safari will otherwise
        // silently block any sound that first plays outside a gesture
        // handler (mid-spin nearMiss, in-bonus markerChime, etc).
        audio.preload();
        audioRef.current = audio;
        return () => {
            audio.dispose();
            audioRef.current = null;
            clearAllTimers();
            if (ambientDisposeRef.current) {
                ambientDisposeRef.current();
                ambientDisposeRef.current = null;
            }
        };
    }, [clearAllTimers]);

    // ---- Attach particle engine once the root ref mounts ----
    // Ambient dust removed — it ran 14 animated specks constantly across
    // every frame even when the player wasn't doing anything. The dark
    // velvet backdrop reads cleaner without it.
    useEffect(() => {
        if (!rootRef.current || particleRef.current) return;
        particleRef.current = new ParticleEngine(rootRef.current);
    });

    // ---- Animation primitives ----
    const shakeRoot = useCallback((durationMs: number) => {
        const el = rootRef.current;
        if (!el) return;
        el.style.animation = `pd-screen-shake ${durationMs}ms ease-in-out`;
        scheduleTimeout(() => {
            if (el) el.style.animation = "";
        }, durationMs + 30);
    }, [scheduleTimeout]);

    const burstOnCell = useCallback(
        (cellIdx: number, count = 20, opts: { behind?: boolean } = {}) => {
            const engine = particleRef.current;
            const grid = gridRef.current;
            if (!engine || !grid) return;
            const cellEl = grid.querySelector<HTMLElement>(`.pd-cell[data-idx="${cellIdx}"]`);
            if (!cellEl) return;
            // Detect gem tier so spark colors match the gem (low=blue,
            // grand=gold, etc.) — same hue family as the chest-rope
            // tier colors so the spark feels visually paired with the
            // gem it erupts around. Falls back to default gold blend
            // if no tier class is found (e.g. chest cells, which don't
            // carry a tier).
            const gemEl = cellEl.querySelector<HTMLElement>(".pd-gem");
            let tierColors: string[] | undefined;
            if (gemEl) {
                for (const cls of gemEl.classList) {
                    const m = cls.match(/^pd-gem--(low|mid|high|mini|minor|major|grand)$/);
                    if (m) {
                        tierColors = TIER_BURST_COLORS[m[1] as keyof typeof TIER_BURST_COLORS];
                        break;
                    }
                }
            }
            // Only spread `colors` if defined — passing `colors: undefined`
            // would override the engine's DEFAULT_COLORS fallback and crash
            // on cfg.colors.length. Cells without a tier match (chests,
            // empty cells) just get the default gold blend.
            const burstOpts = tierColors ? { ...opts, colors: tierColors } : opts;
            engine.burstAtElement(cellEl, count, burstOpts);
        },
        [],
    );

    /** Ghost-number vacuum: for each locked gem cell, clone its label text
     *  into a floating element and animate it flying toward the chest via
     *  a thick rope-like gold line. Gems themselves stay put — the ghosts
     *  are pure visual candy suggesting "your values are being absorbed"
     *  before the multiplier coin flip.
     *
     *  Elements are appended INSIDE the grid with absolute positioning so
     *  they inherit the grid's stacking context and can sit beneath cells
     *  (cell z-index: 2, ghosts at 1) — rope + numbers pass BEHIND gems
     *  and chests instead of painting over them. */
    const animateGhostNumbersToChest = useCallback(
        (chestCellIdx: number) => {
            const grid = gridRef.current;
            if (!grid) return;
            const chestEl = grid.querySelector<HTMLElement>(
                `.pd-cell[data-idx="${chestCellIdx}"]`,
            );
            if (!chestEl) return;
            // offsetLeft/offsetTop are intrinsic (unscaled) coords inside the
            // grid's local layout, so they stay correct even if the grid has
            // a `scale` transform active (miss-zoom).
            const chestCx = chestEl.offsetLeft + chestEl.offsetWidth / 2;
            const chestCy = chestEl.offsetTop + chestEl.offsetHeight / 2;

            // Three-phase sequence per gem, all gems animate in parallel:
            //   Phase 1 (0–260ms):   lightning extends from chest to gem
            //   Phase 2 (260–460ms): gem number pulses big-then-back ("shock hit")
            //   Phase 3 (460–1020ms): rope retracts + ghost flies to chest (the original suck-in)
            // Cleanup buffer pushes total to 1080ms — the calling code's
            // GHOST_DURATION must match so the coin flip waits.
            const PHASE1_EXTEND = 260;
            const PHASE2_PULSE  = 200;
            const PHASE3_SUCK   = 560;
            const TOTAL_DUR     = PHASE1_EXTEND + PHASE2_PULSE + PHASE3_SUCK; // 1020
            const PHASE3_START  = PHASE1_EXTEND + PHASE2_PULSE;               // 460

            const cells = grid.querySelectorAll<HTMLElement>(
                ".pd-cell.pd-cell--locked:not(.pd-cell--has-chest)",
            );
            cells.forEach((cellEl) => {
                const labelEl = cellEl.querySelector<HTMLElement>(".pd-gem__label");
                const text = labelEl?.textContent ?? "";
                if (!text || !labelEl) return;
                const gemEl = cellEl.querySelector<HTMLElement>(".pd-gem");
                // Detect tier class so the rope picks up the gem's accent color.
                let tier = "low";
                if (gemEl) {
                    for (const cls of gemEl.classList) {
                        const m = cls.match(/^pd-gem--(low|mid|high|mini|minor|major|grand)$/);
                        if (m) {
                            tier = m[1];
                            break;
                        }
                    }
                }
                const startCx = cellEl.offsetLeft + cellEl.offsetWidth / 2;
                const startCy = cellEl.offsetTop + cellEl.offsetHeight / 2;
                const dx = chestCx - startCx;
                const dy = chestCy - startCy;
                const dist = Math.hypot(dx, dy);
                if (dist === 0) return;

                // Rope anchored at chest, rotated to face the gem's starting
                // position. scaleX 0→1 in phase 1 (extend), holds at 1 in
                // phase 2 (the shock pulse), then 1→0 in phase 3 (retract
                // synced with ghost). Chest endpoint always anchored.
                const angleFromChestToGemDeg =
                    (Math.atan2(startCy - chestCy, startCx - chestCx) * 180) / Math.PI;
                const rope = document.createElement("div");
                rope.className = "pd-chest-rope";
                rope.dataset.tier = tier;
                rope.style.left = `${chestCx}px`;
                rope.style.top = `${chestCy}px`;
                rope.style.width = `${dist}px`;
                rope.style.transform = `rotate(${angleFromChestToGemDeg}deg) scaleX(0)`;
                rope.style.setProperty("--pd-bolt-delay", `-${Math.floor(Math.random() * 200)}ms`);
                grid.appendChild(rope);

                // Phase 1: extend. Forward-fill keeps scaleX(1) during
                // phase 2 so the bolt visibly stays touching the gem
                // while the number pulses.
                const ropeExtend = rope.animate(
                    [
                        { transform: `rotate(${angleFromChestToGemDeg}deg) scaleX(0)`, opacity: 1 },
                        { transform: `rotate(${angleFromChestToGemDeg}deg) scaleX(1)`, opacity: 1 },
                    ],
                    {
                        duration: PHASE1_EXTEND,
                        easing: "cubic-bezier(0.5, 0, 0.2, 1)",
                        fill: "forwards",
                    },
                );

                // Phase 3: retract. Starts at PHASE3_START — overrides the
                // phase-1 forward-fill. Same shape as the original suck-in.
                const ropeRetract = rope.animate(
                    [
                        { transform: `rotate(${angleFromChestToGemDeg}deg) scaleX(1)`, opacity: 1 },
                        { transform: `rotate(${angleFromChestToGemDeg}deg) scaleX(0.5)`, opacity: 1, offset: 0.4 },
                        { transform: `rotate(${angleFromChestToGemDeg}deg) scaleX(0)`,   opacity: 0 },
                    ],
                    {
                        duration: PHASE3_SUCK,
                        delay: PHASE3_START,
                        easing: "cubic-bezier(0.55, 0, 0.3, 1)",
                        fill: "forwards",
                    },
                );

                // Phase 2: pulse the actual gem label (the visible number)
                // big-then-back. fill:none so transform reverts cleanly.
                const labelPulse = labelEl.animate(
                    [
                        { transform: "scale(1)" },
                        { transform: "scale(1.7)", offset: 0.5 },
                        { transform: "scale(1)" },
                    ],
                    {
                        duration: PHASE2_PULSE,
                        delay: PHASE1_EXTEND,
                        easing: "ease-out",
                        fill: "none",
                    },
                );

                // Phase 3 prep: hide the label right when the ghost takes
                // over so we don't see two numbers (label + ghost) at the
                // same gem position.
                const labelHide = labelEl.animate(
                    [{ opacity: 1 }, { opacity: 0 }],
                    {
                        duration: 60,
                        delay: PHASE3_START,
                        fill: "forwards",
                    },
                );

                // Ghost number — created up front (so layout/measurement
                // happens early), held invisible inline until phase 3
                // start when its WAAPI animation kicks in and flies it
                // to the chest. Same translate/scale curve as the
                // original suck-in.
                const ghost = document.createElement("div");
                ghost.className = "pd-chest-ghost-number";
                ghost.dataset.tier = tier;
                ghost.textContent = text;
                grid.appendChild(ghost);
                const gw = ghost.offsetWidth;
                const gh = ghost.offsetHeight;
                ghost.style.left = `${startCx - gw / 2}px`;
                ghost.style.top = `${startCy - gh / 2}px`;
                ghost.style.opacity = "0";
                const ghostAnim = ghost.animate(
                    [
                        { transform: "translate(0, 0) scale(1)", opacity: 1 },
                        { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.2)`, opacity: 1, offset: 0.4 },
                        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
                    ],
                    {
                        duration: PHASE3_SUCK,
                        delay: PHASE3_START,
                        easing: "cubic-bezier(0.55, 0, 0.3, 1)",
                        fill: "forwards",
                    },
                );

                const removeAt = TOTAL_DUR + 60;
                scheduleTimeout(() => {
                    ghost.remove();
                    rope.remove();
                    // Cancel ALL prior label animations FIRST so nothing
                    // competes for transform/opacity when the pop-in
                    // starts. labelPulse and labelHide both target
                    // labelEl; ropeExtend/Retract/ghostAnim are on
                    // other elements but their animations are over too.
                    [ropeExtend, ropeRetract, labelPulse, labelHide, ghostAnim].forEach((a) => {
                        try { a.cancel(); } catch { /* ignore */ }
                    });
                    // Re-query the live label element. The captured
                    // labelEl ref could be stale if React replaced the
                    // DOM node during the chest sequence (any state
                    // change that re-renders the gem can swap the span).
                    // Fall back to the captured ref if the re-query
                    // misses for any reason.
                    const liveLabelEl =
                        cellEl.querySelector<HTMLElement>(".pd-gem__label") ?? labelEl;
                    // Big jelly bounce: 1800ms, 5 keyframes, deep
                    // overshoot/undershoot. Long enough that you see
                    // the full arc through the chest coin-flip
                    // distraction. fill:forwards holds the final scale(1)
                    // so even if a setState briefly disturbs the cascade,
                    // the label stays visible at rest.
                    liveLabelEl.animate(
                        [
                            { transform: "scale(0)",    opacity: 0 },
                            { transform: "scale(1.55)", opacity: 1, offset: 0.32 },
                            { transform: "scale(0.72)", opacity: 1, offset: 0.5  },
                            { transform: "scale(1.2)",  opacity: 1, offset: 0.66 },
                            { transform: "scale(0.92)", opacity: 1, offset: 0.82 },
                            { transform: "scale(1)",    opacity: 1 },
                        ],
                        {
                            duration: 1800,
                            easing: "cubic-bezier(0.34, 1.4, 0.5, 1)",
                            fill: "forwards",
                        },
                    );
                }, removeAt);
            });
        },
        [scheduleTimeout],
    );

    /** Coin-flip animation: overlays a rotating "coin" on the chest cell
     *  that cycles through multiplier values via setInterval, then settles
     *  on the final rolled multiplier. Uses direct DOM injection so we
     *  don't need new React state for a transient visual effect. */
    const startChestCoinFlip = useCallback(
        (chestCellIdx: number, finalMultiplier: number, onComplete: () => void) => {
            const grid = gridRef.current;
            if (!grid) return;
            const cellEl = grid.querySelector<HTMLElement>(
                `.pd-cell[data-idx="${chestCellIdx}"]`,
            );
            if (!cellEl) return;

            const flip = document.createElement("div");
            flip.className = "pd-chest-flip";
            const face = document.createElement("div");
            face.className = "pd-chest-flip__face";
            const gem = document.createElement("img");
            gem.className = "pd-chest-flip__gem";
            gem.src = "/submissions/gem-storm/gems/gem-octagon.webp";
            gem.alt = "";
            gem.setAttribute("aria-hidden", "true");
            gem.draggable = false;
            const label = document.createElement("span");
            label.className = "pd-chest-flip__label";
            face.appendChild(gem);
            face.appendChild(label);
            flip.appendChild(face);
            cellEl.appendChild(flip);

            // Cycle through candidate multipliers for dramatic effect. The
            // final settled value is the real one — earlier frames are
            // purely for suspense.
            const cycle = [1, 2, 3, 5, 10, 25, 100];
            let cycleIdx = 0;
            label.textContent = `${cycle[cycleIdx]}×`;
            const intervalId = setInterval(() => {
                cycleIdx = (cycleIdx + 1) % cycle.length;
                label.textContent = `${cycle[cycleIdx]}×`;
            }, 95);

            const SPIN_MS = 900;
            const SETTLE_MS = 400;
            setTimeout(() => {
                clearInterval(intervalId);
                label.textContent = `${finalMultiplier}×`;
                flip.classList.add("pd-chest-flip--settled");
            }, SPIN_MS);

            setTimeout(() => {
                flip.classList.add("pd-chest-flip--fade");
            }, SPIN_MS + SETTLE_MS);

            setTimeout(() => {
                flip.remove();
                onComplete();
            }, SPIN_MS + SETTLE_MS + 200);
        },
        [],
    );

    // ---- Core choreography: play an outcome start to finish ----
    const runOutcomeAnimation = useCallback(
        (outcome: GameOutcome, originalBet: number) => {
            const audio = audioRef.current;
            const T = timingsFor(stateRef.current.speed);

            // Desktop keeps the original per-cell setTimeout wave (cells
            // flip to isSpinning in column-major order, JS-driven cascade).
            // Mobile uses a single bulk setState because the per-cell
            // setTimeout fanout was racy on iOS — setTimeout throttling +
            // React batching could leave right-side cells un-flipped when
            // their landCell fired, so they jumped blank → decel without
            // ever showing the spin loop. Mobile's visual cascade comes
            // from CSS animation-delay on .pd-narrow .pd-reel-strip--spin
            // (driven by --pd-cell-wave-pos set inline per cell).
            const isNarrowVP =
                typeof window !== "undefined" && window.innerWidth < 1024;
            setState((s) => ({
                ...s,
                isLoading: false,
                phase: "spinning",
                grid: s.grid.map((c) => ({
                    ...c,
                    ...(isNarrowVP ? { isSpinning: true } : null),
                    isLocked: false,
                    isLit: false,
                    justLocked: false,
                })),
                tensionLevel: 0,
                markerStreakZoom: 0,
                respinsRemaining: 0,
                respinMissStreak: 0,
                runningTotal: 0,
            }));

            if (!isNarrowVP) {
                // Per-cell wave: each cell flips to isSpinning at its
                // column-major × baseWaveGap offset. Symbol is preserved
                // so the strip's target slot shows the previous gem until
                // landCell replaces it.
                CELL_ORDER_COLUMN_MAJOR.forEach((cellIdx, waveIdx) => {
                    scheduleTimeout(() => {
                        setState((s) => ({
                            ...s,
                            grid: s.grid.map((c) =>
                                c.index === cellIdx
                                    ? { ...c, isSpinning: true }
                                    : c,
                            ),
                        }));
                    }, waveIdx * T.baseWaveGap);
                });
            }
            // Pre-compute the consecutive-hit streak per marker landing. First
            // miss kills the streak permanently (even if later markers hit),
            // matching the "if it gets broken at any point it doesn't zoom"
            // behavior. Parallel to outcome.markerLandOrder.
            // Raw consecutive-streak count (0..4) for each marker. The visual
            // zoom caps at 3 (set into state), but the audio step uses the raw
            // number so marker 4 chimes a step higher than marker 3.
            const markerStreaks: number[] = [];
            {
                let streak = 0;
                let broken = false;
                for (const cellIdx of outcome.markerLandOrder) {
                    const sym = outcome.baseReelStops[cellIdx];
                    const isHit = canFillMarker(sym);
                    if (broken || !isHit) {
                        broken = true;
                        markerStreaks.push(0);
                    } else {
                        streak++;
                        // Store raw count (can reach 4). landCell caps it at
                        // 3 when setting state.markerStreakZoom for CSS, but
                        // passes the raw value to markerChime so the 4th
                        // marker chimes a step higher than the 3rd.
                        markerStreaks.push(streak);
                    }
                }
            }

            // Cell landing is a 3-phase animation per cell:
            //   Phase 1 (spinning, infinite): strip loops fast with heavy
            //     vertical motion blur.
            //   Phase 2 (decelerating): strip switches to a one-shot ease-out
            //     that crawls through the last 2 items with lighter blur —
            //     user sees individual symbols slow past, creating real
            //     anticipation (near-miss tease).
            //   Phase 3 (stopping): strip hides, final target symbol renders
            //     with the pd-cell-land overshoot-bounce.
            // Timings come from turbo-aware table (see TIMINGS_NORMAL /
            // TIMINGS_TURBO at top of file) so base-spin + turbo stay in
            // lockstep with the CSS --pd-* duration variables.
            const landCell = (cellIdx: number, streakZoom?: number) => {
                const targetSym = outcome.baseReelStops[cellIdx];
                // Begin deceleration. Set the target symbol NOW so DecelStrip
                // can render it at its last position. DO NOT set isLit yet
                // — that's what drives tensionLevel + markerChime and we
                // want those to fire at the click-in moment, not 550ms early.
                setState((s) => ({
                    ...s,
                    grid: s.grid.map((cell) =>
                        cell.index === cellIdx
                            ? {
                                  ...cell,
                                  isSpinning: false,
                                  isDecelerating: true,
                                  symbol: targetSym,
                                  // Set the target gem's value NOW (decel start)
                                  // so the DecelStrip target shows the exact gem
                                  // that will land — no pop-swap at click-in.
                                  goldValue: outcome.startingNuggetValues.get(cellIdx) ?? null,
                              }
                            : cell,
                    ),
                }));

                // After deceleration, click into place: strip hides, static
                // symbol renders, marker lights up, tension level updates
                // (drives rising noise on 3/4), chime plays with pitch
                // tied to the consecutive-streak count.
                scheduleTimeout(() => {
                    const isMarkerCell = (GAME_CONFIG.MARKER_POSITIONS as readonly number[]).includes(cellIdx);
                    const markerHit = isMarkerCell && canFillMarker(targetSym);
                    // Marker hits play ONLY the markerChime (no click-into-
                    // place thud underneath) so the pitched chime reads
                    // cleanly. Non-marker landings still get the reelStop.
                    if (markerHit) {
                        // 3 semitones per consecutive marker (minor-third climb)
                        // so the ascent is instantly audible on a sampled loop
                        // — 1-semitone steps get lost in the file's own harmonic
                        // content. Clamps at the 4th marker (step = 9 = tritone).
                        const raw = streakZoom && streakZoom > 0 ? streakZoom - 1 : 0;
                        const step = raw * 3;
                        audio?.play("markerChime", step);
                    } else if (stateRef.current.speed !== "turbo") {
                        // Suppress non-marker click-into-place in turbo: 21
                        // cells × ~30ms cadence in turbo means the reelStop
                        // drum reads as a machine-gun stutter rather than
                        // discrete landings. Markers still chime so the
                        // marker wave drama is preserved.
                        audio?.play("reelStop");
                    }
                    setState((s) => {
                        const grid = s.grid.map((cell) => {
                            if (cell.index !== cellIdx) return cell;
                            return {
                                ...cell,
                                isDecelerating: false,
                                isStopping: true,
                                isLit: cell.isMarker && canFillMarker(targetSym),
                                isLocked: false,
                                // Pre-rolled gem value is shown from the moment a gem lands,
                                // even in base game (no trigger). On trigger, the same value
                                // is what becomes the locked-in starting nugget payout.
                                goldValue: outcome.startingNuggetValues.get(cellIdx) ?? null,
                                justLocked: false,
                            };
                        });
                        let lit = 0;
                        for (const p of GAME_CONFIG.MARKER_POSITIONS) if (grid[p].isLit) lit++;
                        const newTension = Math.min(4, lit) as 0 | 1 | 2 | 3 | 4;
                        // Apply streak zoom only on marker cells — non-marker
                        // landings don't touch it. A marker miss resolves to
                        // streakZoom=0 here, which breaks any prior zoom.
                        // Cap at 3 for the CSS class (pd-streak-0..3).
                        const rawStreak = streakZoom ?? s.markerStreakZoom;
                        const nextStreak = Math.min(rawStreak, 3) as 0 | 1 | 2 | 3;
                        return { ...s, grid, tensionLevel: newTension, markerStreakZoom: nextStreak };
                    });

                    // After the bounce finishes, clear isStopping so the cell settles.
                    scheduleTimeout(() => {
                        setState((s) => ({
                            ...s,
                            grid: s.grid.map((cell) =>
                                cell.index === cellIdx
                                    ? { ...cell, isStopping: false }
                                    : cell,
                            ),
                        }));
                    }, T.cellBounceMs);
                }, T.cellDecelMs);
            };

            NON_MARKER_LANDING_ORDER.forEach((cellIdx, i) => {
                scheduleTimeout(() => landCell(cellIdx), T.reelSpinBase + i * T.nonMarkerGap);
            });

            // Step 2b: Marker wave. Starts after the non-marker wave finishes.
            // Each of the 4 markers lands in seed-randomized order with wider
            // gaps, and the final marker gets extra drama delay.
            const markerWaveStart =
                T.reelSpinBase + NON_MARKER_LANDING_ORDER.length * T.nonMarkerGap + T.markerWaveGap;

            outcome.markerLandOrder.forEach((cellIdx, i) => {
                const isLast = i === outcome.markerLandOrder.length - 1;
                const atMs =
                    markerWaveStart + i * T.markerGap + (isLast ? T.markerFinalDrama : 0);
                const streakForThis = markerStreaks[i];
                scheduleTimeout(() => landCell(cellIdx, streakForThis), atMs);
            });

            // Step 3: after all cells have landed, decide: trigger or no trigger.
            // landCell starts the decelerate phase at its scheduled time; the
            // cell finishes its full animation T.cellDecelMs + T.cellBounceMs
            // later — add that buffer before evaluating the trigger.
            const lastStartMs =
                markerWaveStart +
                (outcome.markerLandOrder.length - 1) * T.markerGap +
                T.markerFinalDrama;
            const lastStopMs = lastStartMs + T.cellDecelMs + T.cellBounceMs;
            // Dead spin = no trigger, no near-miss, no base-game payout.
            // Compress the post-stop "look at the board" buffer for these;
            // hit/near-miss keep the full 100ms so the moment still settles.
            const markersHit = outcome.markerFills.filter(Boolean).length;
            const isNearMiss = markersHit === 3;
            const isDeadSpin =
                !outcome.triggered && !isNearMiss && outcome.basePayoutMultiplier === 0;
            const postStopBuffer = isDeadSpin
                ? DEAD_SPIN_DWELLS[stateRef.current.speed].postStopBuffer
                : 100;
            scheduleTimeout(() => {
                if (outcome.triggered) {
                    audio?.play("triggerSting");
                    shakeRoot(300);
                    // Transform markers + any gold cells into locked nuggets with values.
                    setState((s) => {
                        const grid = s.grid.map((c) => {
                            if (outcome.startingNuggetValues.has(c.index)) {
                                return {
                                    ...c,
                                    isLocked: true,
                                    justLocked: true,
                                    isLit: true,
                                    goldValue: outcome.startingNuggetValues.get(c.index) ?? 0,
                                    symbol: goldSymbolFor(c.index, outcome.startingNuggetTiers),
                                    isSpinning: false,
                                };
                            }
                            // Non-nugget cells dissolve to empty (non-gold, non-marker).
                            return {
                                ...c,
                                symbol: "empty-pan" as SymbolType,
                                isLocked: false,
                                justLocked: false,
                                goldValue: null,
                                isLit: false,
                                isSpinning: false,
                            };
                        });
                        let startTotal = 0;
                        for (const v of outcome.startingNuggetValues.values()) startTotal += v;
                        return {
                            ...s,
                            grid,
                            phase: "holdTrigger",
                            respinsRemaining: GAME_CONFIG.RESPINS_INITIAL,
                            respinStepIndex: 0,
                            respinMissStreak: 0,
                            runningTotal: startTotal,
                            tensionLevel: 4,
                            // Screen shake + bonus round take over — drop the
                            // streak zoom so the scene isn't stacked up.
                            markerStreakZoom: 0,
                        };
                    });

                    // Emit bursts on each starting nugget. No clank SFX here
                    // — playing one simultaneous clank per base-game gem
                    // carried into the bonus sounded like a piano dropping.
                    // The pitch counter stays at 0 so the first NEW gem
                    // that lands during the bonus chimes at the base pitch.
                    bonusHitCountRef.current = 0;
                    scheduleTimeout(() => {
                        for (const idx of outcome.startingNuggetValues.keys()) {
                            burstOnCell(idx, 16, { behind: true });
                        }
                    }, 200);

                    // Begin Hold phase respin loop after the trigger overlay
                    // settles. Dwell belongs to the bonus experience so it
                    // follows the bonus-speed cap (turbo → fast).
                    scheduleTimeout(() => {
                        setState((s) => ({ ...s, phase: "holdRespin" }));
                        runRespinStep(outcome, 0, originalBet);
                    }, timingsFor(bonusSpeedFor(stateRef.current.speed)).triggerOverlaySettle);
                } else {
                    // No trigger — resolve base-game scatter payout.
                    const payout = outcome.basePayoutMultiplier * originalBet;
                    if (outcome.markerFills.filter(Boolean).length === 3) {
                        // Confirmed 3/4 near-miss — 4th marker has locked
                        // in as a miss. Fire the sting here (not earlier
                        // on tension-level transition) so it never plays
                        // before a coming 4/4 hit.
                        audio?.play("nearMiss");
                    }
                    setState((s) => ({
                        ...s,
                        phase: "gameOver",
                        view: 2,
                        isLoading: false,
                        lastWin: payout,
                        balance: s.balance + payout,
                        celebrationTier:
                            payout > 0 ? pickCelebrationTier(outcome.basePayoutMultiplier) : null,
                        markerStreakZoom: 0,
                    }));
                    if (payout > 0) audio?.play("smallWin");
                }
            }, lastStopMs + postStopBuffer);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [burstOnCell, scheduleTimeout, shakeRoot],
    );

    // ---- Hold-phase respin loop ----
    const runRespinStep = useCallback(
        (outcome: GameOutcome, stepIdx: number, originalBet: number) => {
            const audio = audioRef.current;
            const step: RespinStep | undefined = outcome.respinSequence[stepIdx];

            if (!step) {
                // Hold phase ended — emit final celebration.
                finalizeHold(outcome, originalBet);
                return;
            }

            // Bonus follows base-speed except turbo, which caps at fast so
            // gems are legible. Slow stays slow through the whole bonus,
            // fast stays fast, turbo bonus plays at fast.
            const T = timingsFor(bonusSpeedFor(stateRef.current.speed));

            // Snapshot non-locked cell indices BEFORE setState so we don't
            // rely on side effects in the updater (React strict mode would
            // call it twice and double-stage each cell). Read from stateRef
            // which mirrors the current state.
            // Column-major order: top-left → bottom of col 0 first, then
            // col 1 top-to-bottom, etc. Each column appears as a vertical
            // wave, and the whole grid reads left-to-right rather than the
            // older reading-order stagger that felt like "everything at
            // once" across rows. Uses GRID_COLS so it stays correct on
            // the 5×5 board (was previously hardcoded to %4 / 4 for a
            // 4×4 layout — that scattered the wave diagonally).
            const cols = GAME_CONFIG.GRID_COLS;
            const empties = stateRef.current.grid
                .filter((c) => !c.isLocked)
                .map((c) => c.index)
                .sort((a, b) => {
                    const colA = a % cols;
                    const colB = b % cols;
                    if (colA !== colB) return colA - colB;
                    return Math.floor(a / cols) - Math.floor(b / cols);
                });

            // (Intentionally no bulk "all cells spinning" setState here —
            // cells are flipped to isSpinning individually in the wave
            // loop below. That's what produces the visible top-left →
            // bottom-left column cascade the player sees; a single batch
            // setState would read as "everything started at once".)

            // Build a hit lookup for fast access during sequential land.
            const hitMap = new Map<number, { value: number; tier: typeof step.tiers[number] }>();
            step.hits.forEach((idx, i) => hitMap.set(idx, { value: step.values[i], tier: step.tiers[i] }));
            const chest = step.chest;

            const goldSymbolForTier = (tier: typeof step.tiers[number]): SymbolType => {
                if (tier === "grand") return "gold-grand";
                if (tier === "major") return "gold-major";
                if (tier === "minor") return "gold-minor";
                if (tier === "mini") return "gold-mini";
                return "gold";
            };

            // Land one cell: spin → decel (with target visible) → click into place.
            const landRespinCell = (cellIdx: number) => {
                const hit = hitMap.get(cellIdx);
                const isChestLanding = chest !== undefined && cellIdx === chest.cellIdx;
                const targetSym: SymbolType = isChestLanding
                    ? "chest"
                    : hit
                        ? goldSymbolForTier(hit.tier)
                        : "empty-pan";
                // For chest landings, defer the value reveal — it shows 0
                // (rendered as blank by ChestTile) until the coin-flip
                // animation settles, at which point state updates to the
                // real chest.newValue.
                const targetValue = isChestLanding ? 0 : hit ? hit.value : null;

                // Begin deceleration with the target gem already set so the
                // strip's last item shows the exact gem that lands.
                setState((s) => ({
                    ...s,
                    grid: s.grid.map((c) =>
                        c.index === cellIdx
                            ? { ...c, isSpinning: false, isDecelerating: true, symbol: targetSym, goldValue: targetValue }
                            : c,
                    ),
                }));

                // Click into place after decel finishes.
                scheduleTimeout(() => {
                    audio?.play("reelStop");
                    // Running total is derived from the updated grid so it
                    // always reflects the true live payout (regular sum ×
                    // chest product + jackpot sum). Chest landings don't
                    // tick the total yet — the chest hasn't revealed its
                    // multiplier, and its goldValue stays null until Phase
                    // 3. So on chest land the derive returns the same number.
                    setState((s) => {
                        const newGrid = s.grid.map((c) => {
                            if (c.index !== cellIdx) return c;
                            return {
                                ...c,
                                isDecelerating: false,
                                isStopping: true,
                                isLocked: !!hit,
                                justLocked: !!hit,
                            };
                        });
                        return {
                            ...s,
                            grid: newGrid,
                            runningTotal: hit ? deriveRunningTotal(newGrid) : s.runningTotal,
                        };
                    });
                    if (hit) {
                        burstOnCell(cellIdx, 18, { behind: true });
                        audio?.play("goldClank", bonusHitCountRef.current);
                        bonusHitCountRef.current += 1;
                    }
                    // Clear isStopping after the bounce.
                    scheduleTimeout(() => {
                        setState((s) => ({
                            ...s,
                            grid: s.grid.map((c) => (c.index === cellIdx ? { ...c, isStopping: false } : c)),
                        }));

                        // --- Chest resolution sequence ---
                        //
                        // Phase 1 (ghost vacuum): each locked gem's label text
                        //   floats to the chest as a ghost number. Gems themselves
                        //   stay put — it's pure flavor suggesting "your values
                        //   are being absorbed" before the multiplier lands.
                        // Phase 2 (coin flip): overlay cycles through multipliers,
                        //   settles on the rolled one.
                        // Phase 3 (reveal): chest face shows the computed dollar
                        //   value (sum-of-regular-gems × multiplier).
                        //
                        // Final math is unchanged — this is all visual storytelling.
                        if (isChestLanding && chest) {
                            const GHOST_DWELL = 100;
                            // Three-phase lightning sequence: extend (260)
                            // + pulse (200) + suck-in (560) + 60ms cleanup
                            // buffer = 1080ms before the coin flip fires.
                            const GHOST_DURATION = 1080;
                            scheduleTimeout(() => {
                                animateGhostNumbersToChest(chest.cellIdx);
                                audio?.play("chestVacuum");
                            }, GHOST_DWELL);
                            scheduleTimeout(() => {
                                startChestCoinFlip(chest.cellIdx, chest.multiplier, () => {
                                    audio?.play("counterReset");
                                    setState((s) => {
                                        // Snapshot for the chest face: regular
                                        // gem sum × this chest's multiplier (so
                                        // the number on the chest mirrors what
                                        // this chest is contributing, even if
                                        // later chests add more product).
                                        let regSum = 0;
                                        for (const c of s.grid) {
                                            if (c.symbol === "chest") continue;
                                            if (JACKPOT_TIER_SYMBOLS.has(c.symbol)) continue;
                                            if (c.goldValue !== null) regSum += c.goldValue;
                                        }
                                        const revealValue = regSum * chest.multiplier;
                                        // Don't re-set justLocked here. The
                                        // chest cell already fired its slam
                                        // when it first landed; re-triggering
                                        // gold-slam at the reveal moment jolts
                                        // the card (translateY -40→0, scale
                                        // 1.3→1) which read as a "whole-board
                                        // shift" right after the coin flip
                                        // finishes. The coin-flip-pop settle
                                        // animation is the only reveal motion
                                        // we want here.
                                        const newGrid = s.grid.map((c) =>
                                            c.index === chest.cellIdx
                                                ? {
                                                      ...c,
                                                      goldValue: revealValue,
                                                      chestMultiplier: chest.multiplier,
                                                  }
                                                : c,
                                        );
                                        return {
                                            ...s,
                                            grid: newGrid,
                                            // Recompute Hold Total now that the
                                            // chest multiplier is live — regular
                                            // gems × (all chest mults, capped) +
                                            // jackpot gems.
                                            runningTotal: deriveRunningTotal(newGrid),
                                        };
                                    });
                                    burstOnCell(chest.cellIdx, 30);
                                });
                            }, GHOST_DWELL + GHOST_DURATION);
                        }
                    }, T.cellBounceMs);
                }, T.cellDecelMs);
            };

            // Column-major wave: each cell flips to `isSpinning` at its
            // own wave-delay offset, then lands one full spin-base later.
            // Top-left starts first, bottom-left last in column 0, then
            // column 1 top-to-bottom, etc. Between waveDelay and the
            // land, the cell renders its reel strip (entry + loop); the
            // land call transitions it to decel → stopping as usual.
            // Respins skip the spin-up entirely: each cell drops directly
            // into its target via the decel keyframe (CSS scopes a shorter
            // pd-strip-respin-drop animation to .pd-phase-holdRespin so it
            // reads as "next gem falls in" rather than "spin then settle").
            // Wave stagger via respinLandGap is the only inter-cell delay.
            // Mobile gets a 1.5× multiplier so the landings cascade in a
            // visible wave instead of plopping in nearly all at once
            // (T.respinLandGap is tuned for desktop where the cells are
            // physically larger and the eye tracks each one easier).
            const isNarrowVP =
                typeof window !== "undefined" && window.innerWidth < 1024;
            const landGap = isNarrowVP
                ? Math.round(T.respinLandGap * 1.5)
                : T.respinLandGap;
            empties.forEach((cellIdx, i) => {
                const waveDelay = i * landGap;
                scheduleTimeout(() => landRespinCell(cellIdx), waveDelay);
            });

            // After every cell has finished its decel + bounce, update
            // the counter and chain into the next step (or finalize).
            {
                const totalLandTime =
                    (empties.length - 1) * landGap + T.cellDecelMs + T.cellBounceMs + 100;
                // Chest dwell: ghost-vacuum → coin spin → settle → fade → savor.
                // Sized to just cover the chest sequence + minimal savor —
                // the 350ms savor that used to sit at the end was the source
                // of the "long pause before counter resets after coin flip".
                const chestHold = step.chest
                    ? 100   // pre-vacuum dwell (was 180)
                      + 620 // ghost-number vacuum (was 680)
                      + 900 // coin spin (CSS animation duration)
                      + 400 // settle pop (CSS settle animation)
                      + 200 // fade
                      + 80  // brief savor (was 350)
                    : 0;
                // Miss streak: a step with no hits AND no chest is a miss;
                // anything else resets the streak to zero.
                const isMiss = step.hits.length === 0 && !step.chest;
                scheduleTimeout(() => {
                    setState((s) => ({
                        ...s,
                        respinsRemaining: step.counterAfter,
                        respinStepIndex: stepIdx + 1,
                        // Skip the miss-zoom on the final tick (counterAfter === 0)
                        // — bonus is ending, so we snap the camera back to 1 instead
                        // of pushing it in one last time right before the celebration.
                        respinMissStreak:
                            isMiss && step.counterAfter > 0 ? s.respinMissStreak + 1 : 0,
                    }));
                    // Chest steps already play counterReset inside phase 3 of
                    // the chest animation — don't double up here.
                    if (step.chest) {
                        // Reset audio heartbeat too: chest = guaranteed hit,
                        // counter resets above 1, so the final-stretch pulse
                        // should cycle off and re-earn itself.
                        audio?.stopHeartbeat();
                        setJustResetFlash(true);
                        scheduleTimeout(() => setJustResetFlash(false), 600);
                    } else if (step.hits.length > 0) {
                        audio?.play("counterReset");
                        // Hit bounced counter back up — kill the heartbeat so
                        // it can restart fresh the next time counter ticks to 1.
                        if (step.counterAfter > 1) audio?.stopHeartbeat();
                        setJustResetFlash(true);
                        scheduleTimeout(() => setJustResetFlash(false), 600);
                    } else {
                        audio?.play("counterTick");
                        if (step.counterAfter === 1) audio?.startHeartbeat(100);
                    }
                    scheduleTimeout(() => {
                        runRespinStep(outcome, stepIdx + 1, originalBet);
                    }, T.respinStepGap);
                }, totalLandTime + chestHold);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [burstOnCell, scheduleTimeout],
    );

    const finalizeHold = useCallback(
        (outcome: GameOutcome, originalBet: number) => {
            const audio = audioRef.current;
            audio?.stopHeartbeat();
            // Celebration follows the bonus speed cap (turbo → fast).
            const T = timingsFor(bonusSpeedFor(stateRef.current.speed));

            const payout = outcome.totalPayoutMultiplier * originalBet;
            const tier = pickCelebrationTier(outcome.totalPayoutMultiplier);

            setState((s) => ({
                ...s,
                phase: "celebrating",
                celebrationTier: tier,
                lastWin: payout,
                balance: s.balance + payout,
            }));

            // Single bonus-end sting — replaces the previous jackpot /
            // bigWin / smallWin tiered stack at this moment. Payout tier
            // still drives visuals (celebration burst, celebration text),
            // but audio collapses to the one sampled cue.
            if (tier.threshold > 0) audio?.play("bonusWinDisplay");

            // Final big burst at screen center.
            const engine = particleRef.current;
            if (engine && rootRef.current) {
                const rect = rootRef.current.getBoundingClientRect();
                engine.burst(rect.width / 2, rect.height / 2, tier.particles, {
                    spread: 360,
                    maxSpeed: 500,
                    lifetime: tier.duration > 0 ? Math.min(tier.duration, 4000) : 1500,
                });
            }

            if (tier.shake) shakeRoot(300);

            const duration = Math.max(T.celebrationMin, tier.duration);
            scheduleTimeout(() => {
                // Clean grid + bonus state on the gameOver hop. Previously the
                // bonus's locked/lit/gold cells persisted through to the next
                // auto-spin, which — at turbo speed — gave the subsequent
                // spin ~0 frames to reset before its own trigger evaluator
                // ran, producing the "bonus keeps re-triggering with empty
                // markers" state-leak. Explicit reset here means each new
                // spin starts from a known-clean board even if auto-spin
                // chains immediately.
                setState((s) => ({
                    ...s,
                    phase: "gameOver",
                    view: 2,
                    isLoading: false,
                    grid: s.grid.map((c) => ({
                        ...c,
                        isLocked: false,
                        isLit: false,
                        justLocked: false,
                        isSpinning: false,
                        isDecelerating: false,
                        isStopping: false,
                        goldValue: null,
                        symbol: "empty-pan" as SymbolType,
                        chestMultiplier: undefined,
                    })),
                    respinsRemaining: 0,
                    respinStepIndex: 0,
                    respinMissStreak: 0,
                    runningTotal: 0,
                    tensionLevel: 0,
                    markerStreakZoom: 0,
                    outcome: null,
                }));
            }, duration);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [scheduleTimeout, shakeRoot],
    );

    // ---- Lifecycle functions ----

    const playGame = useCallback(async (forcedSeed?: Hex, outcomeOverride?: GameOutcome) => {
        const bet = state.bet;
        if (bet <= 0 || bet > state.balance) {
            toast.error("Invalid bet amount");
            return;
        }

        const audio = audioRef.current;
        audio?.resume();
        // Start the looping BGM on the first spin (user-gesture requirement
        // for autoplay). Idempotent — subsequent calls are no-ops.
        audio?.startBgm();
        if (audio && !ambientDisposeRef.current) {
            ambientDisposeRef.current = () => audio.stopBgm();
        }

        // Reset the bonus-round ascending-pitch counter at every spin start.
        // Guarantees the first goldClank in any bonus round plays at base
        // pitch, independent of the markerChime's ascent during the base spin
        // (which is a separate sound with its own streak-driven counter).
        bonusHitCountRef.current = 0;

        // Seamless spin-again: don't flash to a loading overlay, and don't
        // reset the grid to empty-pans before spinning. Cells keep their
        // previous symbols until the runOutcomeAnimation wave flips them
        // to isSpinning one-by-one in column-major order — when a cell's
        // wave tick hits, its reel strip scrolls over the previous symbol,
        // so the board reads as "scrolling away" into the next spin cell
        // by cell instead of a single simultaneous restart.
        setState((s) => ({
            ...s,
            isLoading: false,
            balance: s.balance - bet,
            view: 1,
            phase: "spinning",
            tensionLevel: 0,
            markerStreakZoom: 0,
            respinsRemaining: 0,
            respinStepIndex: 0,
            respinMissStreak: 0,
            celebrationTier: null,
            runningTotal: 0,
            lastWin: 0,
            inReplayMode: false,
            outcome: null,
            grid: s.grid.map((c) => ({
                ...c,
                isDecelerating: false,
                isStopping: false,
                isLocked: false,
                isLit: false,
                justLocked: false,
            })),
        }));

        // Simulate on-chain VRF. Real integration replaces this with a contract call.
        console.log("[Paydirt] placeBet", { bet, gameId: currentGameId });

        // Dev shortcut: if a hand-crafted outcome was passed, use it as-is
        // and skip the math layer. The animation pipeline (runOutcomeAnimation,
        // runRespinStep, finalizeHold) is data-driven, so any well-formed
        // GameOutcome plays through cleanly — no seed roll required.
        const outcome =
            outcomeOverride ??
            resolveOutcome(forcedSeed ?? generateSeed(), state.jackpotPools);

        setState((s) => ({
            ...s,
            outcome,
        }));

        toast.success("Transaction complete!");

        // Run the animated choreography.
        scheduleTimeout(() => {
            runOutcomeAnimation(outcome, bet);
        }, 200);
    }, [state.bet, state.balance, state.jackpotPools, currentGameId, runOutcomeAnimation, scheduleTimeout]);

    const handleReset = useCallback(
        (keepBalance = true) => {
            clearAllTimers();
            audioRef.current?.stopHeartbeat();
            audioRef.current?.stopRisingNoise();
            particleRef.current?.clear();
            setState((s) => ({
                ...initialState,
                balance: keepBalance ? s.balance : GAME_CONFIG.STARTING_BALANCE,
                bet: s.bet,
                jackpotPools: s.jackpotPools,
                // Preserve auto-spin counter through the reset so bulk-spin
                // chains aren't wiped between rounds. Callers that want to
                // cancel bulk (manual STOP, Change Bet) zero it explicitly.
                autoSpinsRemaining: s.autoSpinsRemaining,
            }));
            setJustResetFlash(false);
            if (replayIdString !== null) {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("id");
                router.replace(`?${params.toString()}`, { scroll: false });
            }
        },
        [clearAllTimers, replayIdString, router, searchParams],
    );

    const handlePlayAgain = useCallback(async () => {
        // No handleReset + 200ms gap anymore — it wiped the grid to empty
        // and stalled before the spin, making every respin feel like the
        // game was booting from scratch. playGame now handles all the per-
        // spin resets inline while preserving the previous grid, so reels
        // scroll right out of the last board.
        clearAllTimers();
        audioRef.current?.stopHeartbeat();
        audioRef.current?.stopRisingNoise();
        particleRef.current?.clear();
        setCurrentGameId(generateSeed());
        void playGame();
    }, [clearAllTimers, playGame]);

    /** Begin auto-spinning N rounds. Sets the counter and kicks off the
     *  first spin; the gameOver effect chains the rest. */
    const handleStartAutoSpin = useCallback((count: number) => {
        if (count < 1) return;
        if (state.balance < state.bet) return;
        setState((s) => ({ ...s, autoSpinsRemaining: count }));
        if (state.phase === "idle" || state.phase === "gameOver") {
            scheduleTimeout(() => void playGame(), 50);
        }
    }, [state.balance, state.bet, state.phase, playGame, scheduleTimeout]);

    /** Effect: when the current spin lands at gameOver and auto-spin is active
     *  (and balance covers the next bet), decrement and chain the next round. */
    useEffect(() => {
        if (state.phase !== "gameOver") return;
        if (state.autoSpinsRemaining <= 0) return;
        if (state.balance < state.bet) {
            setState((s) => ({ ...s, autoSpinsRemaining: 0 }));
            return;
        }
        // Dead spin = no near-miss tension AND no payout. Compress the
        // chain delay aggressively in turbo so dead spins flow into the
        // next one with no perceptible "look at the board" gap. Wins
        // and near-misses keep the full 150ms so they register.
        const wasNearMiss = state.tensionLevel === 3;
        const wasDeadSpin = !wasNearMiss && state.lastWin === 0;
        const chainDelay = wasDeadSpin ? DEAD_SPIN_DWELLS[state.speed].chainDelay : 150;
        const id = setTimeout(() => {
            const nextRemaining = Math.max(0, stateRef.current.autoSpinsRemaining - 1);
            // If the spin that just finished was the last of the bulk purchase,
            // finalize the counter and let the normal gameOver view (Play
            // Again / Change Bet) take over. Don't chain an extra spin.
            if (nextRemaining === 0) {
                setState((s) => ({ ...s, autoSpinsRemaining: 0 }));
                return;
            }
            setState((s) => ({ ...s, autoSpinsRemaining: nextRemaining }));
            // Chain into the next spin without touching view/grid — calling
            // handleReset() would snap view back to 0 and flash the jackpot
            // pre-game UI between each auto-spin. Do only the side-effect
            // cleanup handleReset used to do; playGame handles per-spin
            // state resets inline.
            clearAllTimers();
            audioRef.current?.stopHeartbeat();
            audioRef.current?.stopRisingNoise();
            particleRef.current?.clear();
            setCurrentGameId(generateSeed());
            void playGame();
        }, chainDelay);
        return () => clearTimeout(id);
    }, [state.phase, state.autoSpinsRemaining, state.balance, state.bet, state.lastWin, state.tensionLevel, state.speed, clearAllTimers, playGame]);

    const handleRewatch = useCallback(() => {
        const stored = state.outcome;
        const betForReplay = state.bet;
        if (!stored) return;

        clearAllTimers();
        particleRef.current?.clear();
        setState((s) => ({
            ...s,
            view: 1,
            phase: "spinning",
            lastWin: 0,
            runningTotal: 0,
            celebrationTier: null,
            inReplayMode: true,
            grid: makeEmptyGrid().map((c) => ({ ...c, isSpinning: true })),
        }));
        scheduleTimeout(() => {
            runOutcomeAnimation(stored, betForReplay);
        }, 200);
    }, [state.outcome, state.bet, clearAllTimers, runOutcomeAnimation, scheduleTimeout]);

    const setBet = useCallback((v: number) => {
        setState((s) => ({ ...s, bet: v }));
    }, []);

    // ---- Sound effects for tension transitions ----
    const prevTensionRef = useRef<number>(0);
    // Cumulative count of bonus-round gem landings; passed to the audio
    // engine as a pitch-step so each successive hit climbs in pitch. Reset
    // when a new bonus round begins.
    const bonusHitCountRef = useRef<number>(0);
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const curr = state.tensionLevel;

        if (curr === 3 && state.phase === "spinning") {
            // Rising-noise tension ramps while tension=3, but the nearMiss
            // STING is deliberately NOT fired here — tension=3 can be
            // reached the instant the 3rd marker locks, while the 4th is
            // still spinning. Firing at that point spoils a coming 4/4
            // hit. The sting is now fired at the post-evaluation moment
            // below (see runOutcomeAnimation trigger-decision block),
            // gated on a confirmed 3/4 miss.
            audio.startRisingNoise(900);
        } else {
            audio.stopRisingNoise();
        }

        // (Marker chime itself is now fired from inside landCell, keyed to
        // the consecutive-hit streak — see runOutcomeAnimation. This effect
        // only drives the rising-noise sweep for the 3/4 tension state.)

        prevTensionRef.current = curr;
    }, [state.tensionLevel, state.phase]);

    // Clear justLocked flags after slam animation completes so cells don't re-trigger.
    useEffect(() => {
        if (!state.grid.some((c) => c.justLocked)) return;
        const id = setTimeout(() => {
            setState((s) => ({
                ...s,
                grid: s.grid.map((c) => ({ ...c, justLocked: false })),
            }));
        }, GAME_CONFIG.GOLD_LOCK_ANIM_MS + 100);
        return () => clearTimeout(id);
    }, [state.grid]);

    // ---- Render ----
    const triggerVisible = state.phase === "holdTrigger";
    const autoSpinning = state.autoSpinsRemaining > 0;
    // Suppress GameWindow's "finished" overlay between auto-spins so the
    // result modal doesn't flash up before the next spin starts.
    const isGameFinished = !autoSpinning && (state.phase === "gameOver" || state.phase === "celebrating");
    const showPNL = state.lastWin > state.bet && state.lastWin > 0;

    return (
        <div>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10 lg:items-start">
                <div className="lg:basis-2/3 w-full aspect-square max-w-[720px] [&>*]:h-full [&>*]:w-full">
                <GameWindow
                    game={game}
                    currentGameId={BigInt(currentGameId)}
                    isLoading={state.isLoading}
                    isGameFinished={isGameFinished}
                    onPlayAgain={handlePlayAgain}
                    playAgainText="Spin Again"
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(true)}
                    betAmount={state.bet}
                    payout={state.lastWin > 0 ? state.lastWin : null}
                    inReplayMode={state.inReplayMode}
                    isUserOriginalPlayer={true}
                    showPNL={showPNL}
                    isGamePaused={false}
                    resultModalDelayMs={1500}
                    onSfxMutedChange={(muted) => audioRef.current?.setMuted(muted)}
                    onMusicMutedChange={(muted) => {
                        const audio = audioRef.current;
                        if (!audio) return;
                        if (muted) audio.stopBgm();
                        else audio.startBgm();
                    }}
                    disableBuiltInSong={true}
                >
                    <PaydirtWindow
                        cells={state.grid}
                        tensionLevel={state.tensionLevel}
                        markerStreakZoom={state.markerStreakZoom}
                        phase={state.phase}
                        view={state.view}
                        bet={state.bet}
                        balance={state.balance}
                        pools={state.jackpotPools}
                        respinsRemaining={state.respinsRemaining}
                        respinsJustReset={justResetFlash}
                        respinMissStreak={state.respinMissStreak}
                        runningTotal={state.runningTotal}
                        lastWin={state.lastWin}
                        celebrationTier={state.celebrationTier}
                        triggerVisible={triggerVisible}
                        lastEmptyMarkerIdx={lastEmptyMarkerIdx}
                        rumble={rumble}
                        earthquake={earthquake}
                        speed={state.speed}
                        gridRef={gridRef}
                        rootRef={rootRef}
                    />
                </GameWindow>
                </div>

                <PaydirtSetupCard
                    currentView={state.view}
                    bet={state.bet}
                    setBet={setBet}
                    balance={state.balance}
                    isLoading={state.isLoading}
                    inReplayMode={state.inReplayMode}
                    canReplay={canReplay}
                    onPlay={playGame}
                    onSpin={() => { }}
                    onPlayAgain={handlePlayAgain}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(true)}
                    lastWin={state.lastWin}
                    autoSpinsRemaining={state.autoSpinsRemaining}
                    onStartAutoSpin={handleStartAutoSpin}
                    speed={state.speed}
                    onSetSpeed={(next) => setState((s) => ({ ...s, speed: next }))}
                />
            </div>
        </div>
    );
}

export default function PaydirtComponent(props: PaydirtComponentProps) {
    return (
        <Suspense fallback={null}>
            <PaydirtComponentInner {...props} />
        </Suspense>
    );
}
