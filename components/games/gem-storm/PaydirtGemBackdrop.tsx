"use client";

import React from "react";

/** Elongated "emerald-cut" gem rendered as an inline SVG — same faceted
 *  silhouette as the real PaydirtGem tiles (outer rim + crown facets +
 *  inner table gradient), just stretched horizontally to sit behind big
 *  overlay text. Pulse + shimmer animations are driven from CSS classes,
 *  not SVG attributes, so this component stays stateless. Originally
 *  lived inside PaydirtCelebration.tsx; lifted out so the info modal
 *  can reuse the exact same gem language. */
export function LongCutGemBackdrop({ palette = "amethyst" }: { palette?: "amethyst" | "gold" }) {
    const p =
        palette === "gold"
            ? { rim: "#3a1c00", dark: "#6a4810", mid: "#d4902a", light: "#ffeaa0" }
            : { rim: "#1a0838", dark: "#3a1668", mid: "#6a30a8", light: "#d8a0ff" };
    const tableGradientId = `pd-gem-bd-table-${palette}`;
    return (
        <svg
            className="pd-gem-backdrop__svg"
            viewBox="0 0 400 120"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={tableGradientId} x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%"   stopColor={p.light} stopOpacity="0.95" />
                    <stop offset="50%"  stopColor={p.mid}   stopOpacity="0.95" />
                    <stop offset="100%" stopColor={p.dark}  stopOpacity="0.95" />
                </linearGradient>
            </defs>
            <polygon points="0,60 50,0 350,0 400,60 350,120 50,120" fill={p.rim} />
            <polygon points="0,60 50,0 85,30 60,60"       fill={p.mid}  />
            <polygon points="50,0 350,0 315,30 85,30"     fill={p.light} />
            <polygon points="350,0 400,60 340,60 315,30"  fill={p.mid}  />
            <polygon points="400,60 350,120 315,90 340,60" fill={p.dark} />
            <polygon points="350,120 50,120 85,90 315,90" fill={p.dark} opacity="0.9" />
            <polygon points="50,120 0,60 60,60 85,90"     fill={p.dark} />
            <polygon points="60,60 85,30 315,30 340,60 315,90 85,90" fill={`url(#${tableGradientId})`} />
            <polygon
                points="0,60 50,0 350,0 400,60 350,120 50,120"
                fill="none"
                stroke="rgba(255, 215, 130, 0.85)"
                strokeWidth="2"
                strokeLinejoin="miter"
            />
        </svg>
    );
}

/** Wrapper that positions the gem SVG behind a text element and runs
 *  pulse (scaling drop-shadow) + shimmer (diagonal white sweep) in sync.
 *  Put it as the first child of the text container, which must be
 *  `position: relative; isolation: isolate`. */
export function GemBackdrop({ palette = "amethyst" }: { palette?: "amethyst" | "gold" }) {
    return (
        <div className={`pd-gem-backdrop pd-gem-backdrop--${palette}`} aria-hidden="true">
            <LongCutGemBackdrop palette={palette} />
            <div className="pd-gem-backdrop__shimmer" />
        </div>
    );
}
