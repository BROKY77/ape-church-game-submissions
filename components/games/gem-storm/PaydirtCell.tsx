"use client";

import React from "react";
import type { CellState } from "./paydirtState";
import { isGoldSymbol } from "./paydirtMath";
import { GAME_CONFIG } from "./paydirtConfig";
import PaydirtGem, { type GemTier } from "./PaydirtGem";

const COL_MAJOR_POSITIONS: readonly number[] = (() => {
    const cols = GAME_CONFIG.GRID_COLS;
    const rows = GAME_CONFIG.GRID_ROWS;
    const arr: number[] = new Array(cols * rows);
    let p = 0;
    for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) arr[r * cols + c] = p++;
    return arr;
})();

interface PaydirtCellProps {
    cell: CellState;
    /** True if this cell is the last unfilled marker (3/4 tension state). */
    isLastEmptyMarker: boolean;
    /** True if outer-cell dimming is active (during 3/4 tension). */
    isDimmed: boolean;
    /** Current bet — used to convert the gem's stored multiplier into the
     *  actual currency payout that gets shown on the gem face. */
    bet: number;
    /** Live bonus pot (raw multiple of bet). Chest cells display this ×
     *  bet so the chest number mirrors the Hold Total readout. */
    runningTotal: number;
}

/** Reel-spin pool: real PaydirtGem so falling reels look identical to
 *  landed ones. Includes rare jackpot tiers so the player occasionally
 *  catches a glimpse of the prize gems flying past — and if one lands
 *  on a marker, that tier carries into the bonus. Pool of 8 keeps the
 *  total strip height (and the SVG filter's input texture) manageable. */
type SpinSlot = { kind: "gem"; tier: GemTier; seed: number } | { kind: "blank" };
// Blanks let each gem read as a distinct object rather than the reel
// looking like one continuous color stripe. The pool is dominated by
// regular tiers (low/mid/high) with just ONE jackpot tease, because
// seeing mini/minor/major/grand fly past constantly would read as
// unrealistic — real slots surface jackpot symbols rarely so each
// glimpse feels like "oh shit, did that one almost land?". Teaser
// picker walks past blanks so they never show up right before a
// target lands.
const SPIN_POOL: SpinSlot[] = [
    { kind: "gem", tier: "high",  seed: 1 },
    { kind: "blank" },
    { kind: "gem", tier: "low",   seed: 2 },
    { kind: "gem", tier: "mid",   seed: 3 },
    { kind: "gem", tier: "high",  seed: 4 },
    { kind: "blank" },
    { kind: "gem", tier: "low",   seed: 5 },
    { kind: "gem", tier: "mid",   seed: 6 },
    { kind: "gem", tier: "major", seed: 12 }, // sole jackpot tease (~8%)
    { kind: "gem", tier: "high",  seed: 7 },
    { kind: "blank" },
    { kind: "gem", tier: "low",   seed: 8 },
];

/** PaydirtGem is now image-based (static PNGs in /submissions/gem-storm/gems/), so the
 *  browser decodes each shape once and reuses the bitmap across every
 *  cell and every strip. The old renderToStaticMarkup → data URL cache
 *  isn't needed anymore — just render the real component. */
function renderSpinSlot(slot: SpinSlot, key: number) {
    if (slot.kind === "blank") {
        return (
            <div className="pd-reel-strip__item pd-reel-strip__item--blank" key={key}>
                ·
            </div>
        );
    }
    return (
        <div className="pd-reel-strip__item" key={key}>
            <PaydirtGem tier={slot.tier} label="" labelFontSize={0} seed={slot.seed} simplified />
        </div>
    );
}

/** Single unified reel strip — same DOM for spinning AND decelerating phases.
 *  Layout (top→bottom):
 *    idx 0:    target (the actual gem/empty that will land)
 *    idx 1-2:  two teaser gems (visible during decel scroll-back)
 *    idx 3+:   pool items doubled (visible during spin loop, item N == item N+poolLen
 *              for seamless wrap)
 *
 *  CSS `pd-reel-strip--spin` cycles the strip's translateY through the pool
 *  area; `pd-reel-strip--decel` continues from the loop's resting Y back to
 *  translateY(0) (target visible). Because the DOM never re-mounts, items
 *  don't pop in/out — only the transform changes. */
function ReelStrip({ cell, bet, mode, runningTotal }: {
    cell: CellState;
    bet: number;
    mode: "spin" | "decel";
    runningTotal: number;
}) {
    const seed = cell.index;

    // Two teasers — picked from non-blank pool entries by seed-driven index.
    // The decel easing is back-loaded (ease-out), so the final couple of
    // items dwell visibly; extra teasers beyond 2 were being blurred past
    // at full-speed and paying paint cost without registering.
    const teasers: Exclude<SpinSlot, { kind: "blank" }>[] = [];
    const mults = [3, 11];
    for (let i = 0; i < mults.length; i++) {
        let idx = (seed * mults[i] + i * 2) % SPIN_POOL.length;
        while (SPIN_POOL[idx].kind === "blank") idx = (idx + 1) % SPIN_POOL.length;
        teasers.push(SPIN_POOL[idx] as Exclude<SpinSlot, { kind: "blank" }>);
    }

    // On mobile we halve the pool (12 → 6). Each strip's DOM child count
    // drops from 27 → 15 and at 25 simultaneous strips that's ~300 nodes
    // less to animate. Paired with narrow-variant keyframes below that
    // use smaller translateY distances so the loop still wraps seamlessly.
    const isNarrow = typeof window !== "undefined" && window.innerWidth < 1024;
    const pool = isNarrow ? SPIN_POOL.slice(0, 6) : SPIN_POOL;

    // Pool items: rotated for per-cell variety, doubled so the spin loop's
    // wrap (translateY end == translateY start) lands on the same item visually.
    const offset = seed % pool.length;
    const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
    const doubled = [...rotated, ...rotated];

    return (
        <div className={`pd-reel-strip pd-reel-strip--${mode}`}>
            <div className="pd-reel-strip__item pd-reel-strip__item--target">
                {isGoldSymbol(cell.symbol) ? (
                    <NuggetContent cell={cell} bet={bet} />
                ) : (
                    <EmptyCell />
                )}
            </div>
            {/* Teasers render as real PaydirtGem — they're seen during the
                decel slowdown. Simplified (no halo/shimmer) since they
                fly past too fast for those effects to register. */}
            {[...teasers].reverse().map((slot, i) => (
                <div className="pd-reel-strip__item" key={i}>
                    <PaydirtGem
                        tier={slot.tier}
                        label=""
                        labelFontSize={0}
                        seed={slot.seed}
                        simplified
                    />
                </div>
            ))}
            {doubled.map((slot, i) => renderSpinSlot(slot, 100 + i))}
        </div>
    );
}


/** Tier thresholds calibrated to the actual GOLD_VALUES set
 *  [0.25, 0.5, 0.75, 1.25, 2, 3, 5, 10] in paydirtConfig.ts so each tier
 *  is actually used:
 *    0.25 / 0.5 / 0.75  → low   (small diamond)
 *    1.25 / 2 / 3       → mid   (medium hexagon)
 *    5 / 10 / 25+       → high  (larger octagon, top non-jackpot)
 *  Jackpot tiers (mini/minor/major/grand) bypass this — they're set by
 *  symbol type, not value. */
function gemTierForValue(v: number): GemTier {
    if (v >= 5) return "high";
    if (v >= 1) return "mid";
    return "low";
}

/** Format a payout number for display on the small gem face. Integers stay
 *  integers; small decimals show 1 decimal place; very small show 2. Font
 *  size is CONSTANT across all numbers so "10" and "100" look consistent —
 *  previously each digit-count got its own size, which made different
 *  values on the same board visually mismatched. 18px fits 4 chars comfortably
 *  on the gem's flat table at standard cell size. */
function formatPayout(amount: number): { text: string; fontSize: number } {
    let text: string;
    if (amount >= 100 || Number.isInteger(amount)) text = amount.toFixed(0);
    else if (amount >= 10) text = amount.toFixed(1);
    else text = amount.toFixed(2);
    return { text, fontSize: 18 };
}

/** Chest tile — rendered when a chest has landed during the bonus round.
 *  Face shows the dollar amount revealed at coin-flip-end (snapshot of
 *  sum-of-board × multiplier, in APE). A small ×N badge in the corner
 *  preserves the multiplier context so players see what rolled. */
function ChestTile({ amount, multiplier }: { amount: number; multiplier?: number }) {
    // Chest stores a FROZEN contribution = (non-chest non-jackpot gem sum
    // at reveal) × multiplier. That frozen value is this tile's own gold —
    // it sits on the board like a gem and gets summed directly into Hold
    // Total. Multiplier doesn't apply to gems that land AFTER the chest.
    const text =
        amount <= 0 ? "" :
        amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` :
        amount >= 100  ? amount.toFixed(0) :
        Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
    const showMult = amount > 0 && typeof multiplier === "number" && multiplier > 1;
    return (
        <div className="pd-gem pd-gem--chest" aria-label={text ? `Chest ${text}` : "Chest"}>
            <img
                className="pd-gem__image pd-chest__image"
                src="/submissions/gem-storm/gems/gem-chest.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
            />
            <span className="pd-gem__halo pd-chest__halo" aria-hidden="true" />
            <span key={text} className="pd-gem__label pd-chest__label">
                {text}
            </span>
            {showMult && (
                <span key={`m-${multiplier}`} className="pd-chest__mult" aria-hidden="true">
                    ×{multiplier}
                </span>
            )}
        </div>
    );
}

function NuggetContent({ cell, bet }: { cell: CellState; bet: number }) {
    const sym = cell.symbol;
    // Chest: multiplier token mechanically, but visually shows the reveal
    // dollar value (sum-of-board × mult at coin-flip-end, captured in
    // cell.goldValue). Bet-multiply for APE display to match other gems.
    if (sym === "chest") {
        const amount = (cell.goldValue ?? 0) * bet;
        return <ChestTile amount={amount} multiplier={cell.chestMultiplier} />;
    }
    // Seed by goldValue so the SAME multiplier always renders with the SAME
    // shape — a "10" should always look like a "10", regardless of which
    // cell it lands in. PaydirtGem uses (seed % variants.length) directly
    // (no hash), which for the GOLD_VALUES set hits all three shapes
    // including diamond (previously missed by the hash distribution).
    const seed = cell.goldValue ?? 0;
    // Jackpot tiers display their TIER NAME (GRAND/MAJOR/MINOR/MINI) on the
    // gem face — the actual pool value already shows in the JackpotBar at
    // the top of the screen. Players track "I just hit GRAND", and the
    // single bold word reads cleaner on the small star face than a 4-5
    // digit number would. Font size is per-name length so each fits.
    if (sym === "gold-grand") {
        return <PaydirtGem tier="grand" label="GRAND" labelFontSize={11} seed={seed} />;
    }
    if (sym === "gold-major") {
        return <PaydirtGem tier="major" label="MAJOR" labelFontSize={11} seed={seed} />;
    }
    if (sym === "gold-minor") {
        return <PaydirtGem tier="minor" label="MINOR" labelFontSize={11} seed={seed} />;
    }
    if (sym === "gold-mini") {
        return <PaydirtGem tier="mini" label="MINI" labelFontSize={13} seed={seed} />;
    }
    // Value-less gold slot (v === null | 0) falls through to an unlabeled
    // gem rather than the old ✦ star placeholder. The ✦ was a legacy
    // from the pre-bonus-trigger build where it marked "this is a gold
    // tile without a resolved payout yet" — once the game actually
    // resolves a value at spin time, showing a star instead of that
    // value was just hiding the number from the player.
    const v = cell.goldValue;
    if (v === null || v === 0) {
        return <PaydirtGem tier="low" label="" labelFontSize={0} seed={seed} />;
    }
    const payout = v * bet;
    const f = formatPayout(payout);
    return <PaydirtGem tier={gemTierForValue(v)} label={f.text} labelFontSize={f.fontSize} seed={seed} />;
}

function EmptyCell() {
    return <div className="pd-symbol pd-symbol--empty-pan" aria-hidden="true" />;
}

const PaydirtCell = React.memo(function PaydirtCell({
    cell,
    isLastEmptyMarker,
    isDimmed,
    bet,
    runningTotal,
}: PaydirtCellProps) {
    const classes = ["pd-cell"];
    if (cell.isMarker) classes.push("pd-cell--marker");
    if (!cell.isMarker) classes.push("pd-cell--non-marker");
    if (cell.isSpinning) classes.push("pd-cell--spinning");
    if (cell.isDecelerating) classes.push("pd-cell--decelerating");
    if (cell.isStopping) classes.push("pd-cell--stopping");
    if (cell.isLit) classes.push("pd-cell--lit");
    if (cell.isLocked) classes.push("pd-cell--locked");
    if (cell.justLocked) classes.push("pd-cell--just-locked");
    if (cell.symbol === "chest") classes.push("pd-cell--has-chest");
    if (cell.symbol === "empty-pan" && !cell.isSpinning && !cell.isStopping && !cell.isDecelerating)
        classes.push("pd-cell--empty");
    if (isLastEmptyMarker) classes.push("pd-cell--last-empty");
    if (isDimmed) classes.push("pd-cell--dim");

    const showGold = isGoldSymbol(cell.symbol) || cell.goldValue !== null;

    // Strip is the landing animation's canvas: mounts during spin/decel/
    // stopping, unmounts when settled. Static gem (NuggetContent or
    // EmptyCell) renders ALWAYS based on showGold — its <img> stays
    // mounted across spins, hidden via CSS visibility while the strip
    // is active. When the strip unmounts at settled, the static gem
    // (already mounted, already decoded) becomes visible instantly. No
    // mount/remount of the <img>, no decode hit, no swap-flicker.
    const showStrip = cell.isSpinning || cell.isDecelerating || cell.isStopping;
    const stripMode = cell.isSpinning ? "spin" : "decel";
    // Column-major position drives the cascade-entry animation-delay on the
    // spinning reel strip (mobile only — desktop uses a JS-driven wave). CSS
    // calc multiplies this unitless number by --pd-cascade-wave-gap (a time)
    // to produce the per-cell delay. The value is explicitly stringified to
    // dodge any React quirk around serialising numeric CSS custom properties
    // — a unitless number must reach the DOM as `--pd-cell-wave-pos:20`,
    // never as `20px`, otherwise calc(20px * 12ms) is invalid and the entire
    // mobile cascade collapses to delay=0 (all cells start at once).
    const cellStyle = {
        "--pd-cell-wave-pos": `${COL_MAJOR_POSITIONS[cell.index] ?? 0}`,
    } as React.CSSProperties;
    return (
        <div className={classes.join(" ")} data-idx={cell.index} style={cellStyle}>
            <div className="pd-cell__card" aria-hidden="true" />
            <div className="pd-reel-viewport" aria-hidden="true">
                {showStrip && (
                    <ReelStrip
                        cell={cell}
                        bet={bet}
                        mode={stripMode}
                        runningTotal={runningTotal}
                    />
                )}
            </div>
            {showGold ? <NuggetContent cell={cell} bet={bet} /> : <EmptyCell />}
        </div>
    );
});

export default PaydirtCell;
