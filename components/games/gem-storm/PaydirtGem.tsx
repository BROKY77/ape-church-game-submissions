"use client";

import React from "react";

export type GemTier =
    | "low"
    | "mid"
    | "high"
    | "mini"
    | "minor"
    | "major"
    | "grand";

/** Shape variant selector. Octagon = table cut. Hexagon = step cut.
 *  Diamond = princess cut (rotated 45° to look like a literal diamond).
 *  Star = sunburst cut — 8 dramatic peaks/valleys around an octagonal
 *  flat table; used for jackpot tiers so they read as visually "extra". */
type GemShape = "octagon" | "hexagon" | "diamond" | "star";

interface GemVariant {
    /** Brightest highlight on top-left facets. */
    light: string;
    /** Mid tone for diagonally-lit facets. */
    mid: string;
    /** Deep shadow on bottom-right facets. */
    dark: string;
    /** Outer rim / table outline color. */
    rim: string;
    /** Outer glow color. */
    glow: string;
    /** Multiplier text color (high contrast against table). */
    text: string;
    /** Shape paired with this color — each variant has a fixed cut so
     *  the same color always renders as the same shape (e.g. diamond
     *  is always the 4-sided cut, emerald is always octagon, etc.). */
    shape: GemShape;
}
type GemPalette = GemVariant; // backwards-compat alias

/** Shape signals value at a glance: sides-count ascends with tier so
 *  players can read "how much is this worth" without parsing the label.
 *  Diamond (4) → Hexagon (6) → Octagon (8) → Star (jackpot). One variant
 *  per tier — tier color comes from CSS hue-rotate per .pd-gem--{tier}
 *  rather than the old per-variant palette. The `glow` field is still
 *  used for the pulsing halo behind high and jackpot tiers. */
const TIER_VARIANTS: Record<GemTier, GemVariant[]> = {
    low:   [{ light: "#b3ecff", mid: "#4a90e2", dark: "#1f4d80", rim: "#0a3d80", glow: "rgba(125, 220, 255, 0.9)", text: "#001a3a", shape: "diamond" }],
    mid:   [{ light: "#c4f5b1", mid: "#4caf50", dark: "#1f5f1f", rim: "#003a1a", glow: "rgba(0, 214, 120, 0.9)",   text: "#002010", shape: "hexagon" }],
    high:  [{ light: "#90c4ff", mid: "#0066ff", dark: "#003088", rim: "#001844", glow: "rgba(0, 102, 255, 0.9)",   text: "#000a2a", shape: "octagon" }],
    mini:  [{ light: "#ffa0a0", mid: "#ff0000", dark: "#900000", rim: "#3a0000", glow: "rgba(255, 0, 0, 0.95)",    text: "#2a0000", shape: "star" }],
    minor: [{ light: "#e898ff", mid: "#b800ff", dark: "#5a0088", rim: "#280040", glow: "rgba(184, 0, 255, 0.95)",  text: "#1a0028", shape: "star" }],
    major: [{ light: "#ffc070", mid: "#ff5500", dark: "#a83000", rim: "#3a1000", glow: "rgba(255, 85, 0, 0.95)",   text: "#2a0a00", shape: "star" }],
    grand: [{ light: "#ffffff", mid: "#fff200", dark: "#d49000", rim: "#5a3e00", glow: "rgba(255, 242, 0, 0.95)",  text: "#2a1c00", shape: "star" }],
};

interface GemProps {
    tier: GemTier;
    /** Center text — usually the multiplier ("2×") or jackpot label ("MINI"). */
    label: React.ReactNode;
    /** Optional override font size for the label. */
    labelFontSize?: number;
    /** Deterministic seed used to pick a color variant + shape variant.
     *  Same seed always produces the same gem — pass cell.index. */
    seed?: number;
    /** Skip halo + shimmer pseudo-elements. Use for gems rendered inside
     *  a spinning reel strip: they fly past too fast for those effects to
     *  register, and rendering ~20 animated shimmers per cell × 16 cells
     *  during a spin is a paint hotspot. The landed target gem should
     *  stay un-simplified so it reads at full fidelity once it stops. */
    simplified?: boolean;
}

/** Pick a variant index from a seed. Plain mod (not a hash): the hash was
 *  biased such that the small-integer GOLD_VALUES set {1,2,3,5,10,15,25,50}
 *  never mapped to the diamond index for any tier, so square gems never
 *  landed. Raw mod gives full coverage for integer seeds. Since the current
 *  GOLD_VALUES are decimals (0.25, 0.5...), we scale by 100 and floor to
 *  keep it deterministic and integer — same value still produces the same
 *  shape (0.25 × 100 = 25 is stable across calls). */
function variantIndexFromSeed(seed: number, count: number): number {
    const n = Math.floor(Math.abs(seed) * 100);
    return ((n % count) + count) % count;
}

/** Per-shape image file (PNG from the ChatGPT polish pass — one neutral
 *  silver version of each cut, hue-rotated per tier at render time). */
const SHAPE_IMAGES: Record<GemShape, string> = {
    octagon: "/submissions/gem-storm/gems/gem-octagon.webp",
    hexagon: "/submissions/gem-storm/gems/gem-hexagon.webp",
    diamond: "/submissions/gem-storm/gems/gem-diamond.webp",
    star:    "/submissions/gem-storm/gems/gem-star.webp",
};

const PaydirtGem = React.memo(function PaydirtGem({
    tier,
    label,
    labelFontSize = 14,
    seed = 0,
    simplified = false,
}: GemProps) {
    const variants = TIER_VARIANTS[tier];
    const variantIdx = variantIndexFromSeed(seed, variants.length);
    const p = variants[variantIdx];
    const imageSrc = SHAPE_IMAGES[p.shape];
    const isJackpotTier = tier === "mini" || tier === "minor" || tier === "major" || tier === "grand";
    // Shimmer sweeps across mid/high + jackpot gems. Low-tier gems stay static
    // — they're the most frequent cell in the base game and running shimmer
    // on every one of them during a 21-cell cascade was a perf hotspot.
    // Halo (blurred pulsing glow) is reserved for high-tier + jackpot so only
    // the meaningful hits throb.
    const showShimmer = !simplified && (isJackpotTier || tier === "mid" || tier === "high");
    const showHalo = !simplified && (isJackpotTier || tier === "high");

    // Expose the image path as a CSS custom property so the shimmer can
    // mask itself to the exact gem silhouette (the PNG's alpha channel),
    // otherwise the diagonal sweep bleeds beyond the gem outline.
    const gemStyle = { "--pd-gem-src": `url(${imageSrc})` } as React.CSSProperties;

    return (
        <div className={`pd-gem pd-gem--${tier} pd-gem--shape-${p.shape}`} style={gemStyle}>
            <img
                className="pd-gem__image"
                src={imageSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                /* decoding="sync" forces the browser to decode the image
                   synchronously when the <img> mounts. With async (the
                   default), iOS Safari can take 1-2 frames to render the
                   decoded bitmap of a freshly-mounted <img> even when the
                   src is cached, causing the visible flicker at the end of
                   isStopping where the strip→static swap happens. Sync
                   decode + fetchpriority high ensure the gem appears in
                   the same paint as its mount. Cost: a tiny CPU pause
                   per mount, but for a ~10KB PNG gem it's microseconds. */
                decoding="sync"
                fetchPriority="high"
            />
            {showShimmer && <span className="pd-gem__shimmer" aria-hidden="true" />}
            {showHalo && (
                <span
                    className="pd-gem__halo"
                    style={{ background: `radial-gradient(circle at center, ${p.glow} 0%, transparent 65%)` }}
                />
            )}
            {label !== "" && label !== null && (
                <span
                    className="pd-gem__label"
                    style={{ fontSize: `${labelFontSize}px` }}
                >
                    {label}
                </span>
            )}
        </div>
    );
});

export default PaydirtGem;
