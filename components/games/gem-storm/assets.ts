/**
 * Single source of truth for replaceable assets.
 *
 * All values default to `null` — components fall back to CSS-drawn placeholders
 * or Web Audio API procedural sounds. Human swaps in real file paths (absolute
 * from /public) to override.
 *
 * Example:
 *   goldNugget: "/submissions/gem-storm/images/nugget.webp"
 *   goldClank:  "/submissions/gem-storm/audio/clank.mp3"
 */

export const ASSETS = {
    images: {
        background: null as string | null,
        gridFrame: null as string | null,
        spinButton: null as string | null,
        logo: "/submissions/gem-storm/images/newlogo.webp" as string | null,
    },
    audio: {
        reelSpin: null as string | null,
        reelStop: null as string | null,
        goldClank: null as string | null,
        triggerSting: null as string | null,
        counterTick: null as string | null,
        counterReset: null as string | null,
        heartbeat: null as string | null,
        nearMiss: "/submissions/gem-storm/sfx/nearmiss.mp3" as string | null,
        smallWin: "/submissions/gem-storm/sfx/win.mp3" as string | null,
        bigWin: null as string | null,
        jackpot: null as string | null,
        countUp: null as string | null,
        ambient: "/submissions/gem-storm/sfx/bgmloop.mp3" as string | null,
        risingNoise: null as string | null,
        markerChime: "/submissions/gem-storm/sfx/markerslots.mp3" as string | null,
        chestVacuum: "/submissions/gem-storm/sfx/chestzap.mp3" as string | null,
        bonusWinDisplay: "/submissions/gem-storm/sfx/bonuswindisplay.mp3" as string | null,
        womp: "/submissions/gem-storm/sfx/lose.mp3" as string | null,
    },
    fonts: {
        display: "'Rye', serif",
        body: "system-ui, sans-serif",
        values: "'JetBrains Mono', monospace",
    },
} as const;

export type AssetImageKey = keyof typeof ASSETS.images;
export type AssetAudioKey = keyof typeof ASSETS.audio;
