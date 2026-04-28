"use client";

import React from "react";
import PaydirtGem, { type GemTier } from "./PaydirtGem";

// Each item is a fixed deterministic entry so SSR and client render identically.
// Positions expressed as % of the window; the grid sits in the middle so
// items cluster toward the edges where they'll actually be visible.
type TreasureItem = { tier: GemTier; seed: number; x: number; size: number; rot: number; opacity: number };

// Falling-gem spread — no y position; each gem continuously tumbles
// top → bottom at its own pace. x covers the full width so gems don't
// cluster in one vertical column. Sizes vary 16–48 so the scatter has
// visible depth (small ones read as "farther away", big ones as
// "closer"). Rotation amount + direction (via negative rot values) is
// also varied per-item so the spin is lively and non-uniform.
const ITEMS: TreasureItem[] = [
    { tier: "low",   seed: 3,   x: 3,  size: 48, rot: -14, opacity: 0.32 },
    { tier: "mid",   seed: 7,   x: 8,  size: 22, rot: 40,  opacity: 0.22 },
    { tier: "high",  seed: 11,  x: 12, size: 72, rot: 12,  opacity: 0.34 },
    { tier: "mini",  seed: 113, x: 14, size: 30, rot: -10, opacity: 0.26 },
    { tier: "high",  seed: 23,  x: 16, size: 16, rot: -20, opacity: 0.20 },
    { tier: "low",   seed: 17,  x: 21, size: 38, rot: 60,  opacity: 0.28 },
    { tier: "mid",   seed: 41,  x: 25, size: 64, rot: 18,  opacity: 0.36 },
    { tier: "high",  seed: 47,  x: 29, size: 26, rot: -22, opacity: 0.26 },
    { tier: "minor", seed: 127, x: 31, size: 34, rot: 22,  opacity: 0.28 },
    { tier: "mid",   seed: 29,  x: 33, size: 88, rot: -40, opacity: 0.36 },
    { tier: "low",   seed: 43,  x: 38, size: 20, rot: 50,  opacity: 0.22 },
    { tier: "high",  seed: 37,  x: 42, size: 52, rot: 55,  opacity: 0.32 },
    { tier: "low",   seed: 31,  x: 46, size: 30, rot: 25,  opacity: 0.26 },
    { tier: "major", seed: 131, x: 49, size: 40, rot: -14, opacity: 0.32 },
    { tier: "mid",   seed: 53,  x: 50, size: 42, rot: -18, opacity: 0.30 },
    { tier: "high",  seed: 59,  x: 54, size: 80, rot: 10,  opacity: 0.34 },
    { tier: "low",   seed: 61,  x: 58, size: 24, rot: -55, opacity: 0.24 },
    { tier: "mid",   seed: 67,  x: 62, size: 36, rot: 70,  opacity: 0.28 },
    { tier: "grand", seed: 137, x: 65, size: 44, rot: 8,   opacity: 0.34 },
    { tier: "high",  seed: 71,  x: 66, size: 18, rot: -12, opacity: 0.20 },
    { tier: "mid",   seed: 73,  x: 70, size: 68, rot: 30,  opacity: 0.34 },
    { tier: "low",   seed: 79,  x: 74, size: 28, rot: -45, opacity: 0.26 },
    { tier: "high",  seed: 83,  x: 78, size: 46, rot: 65,  opacity: 0.30 },
    { tier: "mini",  seed: 139, x: 80, size: 28, rot: 35,  opacity: 0.26 },
    { tier: "low",   seed: 89,  x: 82, size: 20, rot: -30, opacity: 0.22 },
    { tier: "mid",   seed: 97,  x: 86, size: 56, rot: 50,  opacity: 0.32 },
    { tier: "high",  seed: 101, x: 90, size: 32, rot: -25, opacity: 0.28 },
    { tier: "minor", seed: 149, x: 92, size: 36, rot: -50, opacity: 0.28 },
    { tier: "low",   seed: 103, x: 94, size: 84, rot: 22,  opacity: 0.34 },
    { tier: "mid",   seed: 107, x: 98, size: 22, rot: -60, opacity: 0.22 },
];

function TreasureItemEl({ item }: { item: TreasureItem }) {
    // Deterministic per-item duration + negative delay so gems start the
    // loop at different points — avoids a synchronized drop on mount.
    const duration = 18 + (item.seed % 18); // 18..35s
    const delay = -((item.seed * 7) % duration); // negative → mid-fall start
    // Per-gem spin amount (360–900° per fall) and direction (sign flips on
    // even seeds) so some gems twirl fast, others lazily, some clockwise,
    // some counter — reads as varied "tumble" motion instead of uniform.
    const spinMag = 360 + ((item.seed * 11) % 540);
    const spinDir = item.seed % 2 === 0 ? 1 : -1;
    const spin = spinMag * spinDir;
    const style = {
        left: `${item.x}%`,
        width: item.size,
        height: item.size,
        opacity: item.opacity,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        ["--pd-gem-rot" as string]: `${item.rot}deg`,
        ["--pd-gem-spin" as string]: `${spin}deg`,
    } as React.CSSProperties;
    return (
        <div className="pd-treasure__item pd-treasure__item--fall" style={style}>
            <PaydirtGem tier={item.tier} label="" labelFontSize={0} seed={item.seed} />
        </div>
    );
}

/** Scattered gems + coins behind the grid. Purely decorative, ignores
 *  pointer events, and uses a deterministic layout so SSR doesn't mismatch
 *  the client render.
 *
 *  On narrow viewports we render a sparse subset (~1/3 the count) at 25%
 *  larger size — iOS Safari chokes on 30 simultaneously tumbling gems with
 *  halo/shimmer pseudos but handles ~10 fine. Picking every 3rd item
 *  keeps the spread deterministic and evenly distributed across the
 *  horizontal band so it doesn't cluster on one edge. */
export default function PaydirtTreasureBackground({ narrow = false }: { narrow?: boolean }) {
    const shown = narrow
        ? ITEMS.filter((_, i) => i % 3 === 0).map((it) => ({
              ...it,
              size: Math.round(it.size * 1.25),
          }))
        : ITEMS;
    return (
        <div className="pd-treasure-bg" aria-hidden="true">
            {shown.map((item, i) => (
                <TreasureItemEl key={i} item={item} />
            ))}
        </div>
    );
}
