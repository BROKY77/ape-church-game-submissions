"use client";

import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { CellState, JackpotPools } from "./paydirtState";
import type { CelebrationTier } from "./paydirtConfig";
import PaydirtGrid from "./PaydirtGrid";
import {
    JackpotBar,
    RespinCounter,
    RunningTotal,
} from "./PaydirtHUD";
import PaydirtCelebration, { TriggerOverlay } from "./PaydirtCelebration";
import PaydirtTreasureBackground from "./PaydirtTreasureBackground";
import PaydirtInfoButton from "./PaydirtInfoButton";
import PaydirtInfoModal from "./PaydirtInfoModal";
import { ASSETS } from "./assets";
import "./paydirt.styles.css";

interface PaydirtWindowProps {
    cells: CellState[];
    tensionLevel: 0 | 1 | 2 | 3 | 4;
    markerStreakZoom: 0 | 1 | 2 | 3;
    phase: string;
    view: 0 | 1 | 2;
    bet: number;
    balance: number;
    pools: JackpotPools;
    respinsRemaining: number;
    respinsJustReset: boolean;
    /** Consecutive bonus-round misses — drives a progressive camera
     *  zoom-in that grows with each miss and resets on a hit. */
    respinMissStreak: number;
    runningTotal: number;
    lastWin: number;
    celebrationTier: CelebrationTier | null;
    triggerVisible: boolean;
    lastEmptyMarkerIdx: number | null;
    rumble: boolean;
    earthquake: boolean;
    speed: "slow" | "fast" | "turbo";
    gridRef: React.Ref<HTMLDivElement>;
    rootRef: React.Ref<HTMLDivElement>;
}

const PaydirtWindow = forwardRef<HTMLDivElement, PaydirtWindowProps>(
    function PaydirtWindow(props, _ref) {
        const {
            cells,
            tensionLevel,
            markerStreakZoom,
            phase,
            view,
            bet,
            balance,
            pools,
            respinsRemaining,
            respinsJustReset,
            respinMissStreak,
            runningTotal,
            lastWin,
            celebrationTier,
            triggerVisible,
            lastEmptyMarkerIdx,
            rumble,
            earthquake,
            speed,
            gridRef,
            rootRef,
        } = props;

        const inHold = phase === "holdRespin" || phase === "holdTrigger" || phase === "holdComplete";

        const [showInfo, setShowInfo] = useState(false);

        // Narrow-layout detection: window viewport only. We intentionally
        // do NOT measure the game-window element itself — it's capped at
        // 720px via a Tailwind `max-w-[720px]` wrapper, so every desktop
        // would incorrectly classify as narrow if we went by element
        // width. The viewport is the right signal because that's what
        // drives whether the PaydirtSetupCard stacks below (narrow) or
        // sits beside (wide) — Tailwind's `lg:` breakpoint at 1024px.
        const NARROW_THRESHOLD = 1024;
        const [isNarrow, setIsNarrow] = useState(false);
        const attachRootRef = useCallback(
            (el: HTMLDivElement | null) => {
                if (typeof rootRef === "function") rootRef(el);
                else if (rootRef) {
                    (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
            },
            [rootRef],
        );
        useEffect(() => {
            if (typeof window === "undefined") return;
            const update = () => setIsNarrow(window.innerWidth < NARROW_THRESHOLD);
            update();
            window.addEventListener("resize", update);
            return () => window.removeEventListener("resize", update);
        }, []);

        const rootClasses = [
            "pd-root",
            `pd-phase-${phase}`,
            `pd-view-${view}`,
            `pd-tension-${tensionLevel}`,
            `pd-streak-${markerStreakZoom}`,
        ];
        if (earthquake) rootClasses.push("pd-earthquake");
        else if (rumble) rootClasses.push("pd-rumble");
        if (isNarrow) rootClasses.push("pd-narrow");
        // Slow stays on throughout the whole game (base + bonus both
        // cinematic). Turbo only applies during base-spin phase; bonus
        // drops back to default "fast" so gems are legible. "Fast" is
        // the default CSS values — no class needed.
        if (speed === "slow") rootClasses.push("pd-slow");
        else if (speed === "turbo" && phase === "spinning") rootClasses.push("pd-turbo");
        // Tags view-2 (post-spin) as "has win" so the CSS grid-shrink (0.9)
        // only engages when there's actually a celebration overlay to make
        // room for. Dead spins still go to view 2 — the end-card must show
        // — but the grid stays at 1.0 so the player doesn't see a pointless
        // zoom-out for nothing.
        if (lastWin > 0) rootClasses.push("pd-has-win");

        // Progressive bonus-miss zoom — each consecutive non-hit respin
        // eases the camera in; a hit resets to zero. 4% per miss, capped
        // at 5 steps (→ 1.20× / 20% zoom max) so the escalation reads
        // clearly without feeling claustrophobic. Only live during hold
        // phases — clears everywhere else via the fallback to 1.
        const MISS_CAP = 4;
        const STEP = 0.015;
        const missScale = inHold
            ? 1 + Math.min(respinMissStreak, MISS_CAP) * STEP
            : 1;
        const rootStyle = { "--pd-miss-zoom": missScale } as React.CSSProperties;

        return (
            <div ref={attachRootRef} className={`${rootClasses.join(" ")} pd-root--in-window`} style={rootStyle}>
                {/* Vertical-only motion-blur filters for spinning reel strips.
                    CSS filter: blur() is isotropic — it softens horizontal
                    edges equally, reading as "out of focus" rather than
                    "fast vertical motion". feGaussianBlur with stdDeviation
                    "0 N" applies blur on the Y axis only, which is what
                    sells the smear. Defs live at root so they persist
                    across cell remounts. */}
                <svg
                    aria-hidden="true"
                    width="0"
                    height="0"
                    style={{ position: "absolute", width: 0, height: 0 }}
                >
                    <defs>
                        <filter id="pd-vblur" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="0 3" />
                        </filter>
                        <filter id="pd-vblur-2" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="0 2" />
                        </filter>
                        <filter id="pd-vblur-1" x="-10%" y="-10%" width="120%" height="120%">
                            <feGaussianBlur stdDeviation="0 1" />
                        </filter>
                    </defs>
                </svg>
                {/* Persistent gem-image pin. iOS Safari evicts image decodes
                    from its cache under sustained memory pressure — after
                    dozens of spins, a freshly-mounted <img> can take longer
                    than our 400ms decel-to-stopping window to re-decode,
                    producing the "gems flicker when they click into place"
                    effect that appears after a while of playing. Rendering
                    each gem PNG once in a hidden always-mounted node keeps
                    the decode live in memory; future PaydirtGem mounts with
                    the same src paint instantly from the shared cache. */}
                <div
                    aria-hidden="true"
                    style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
                >
                    <img src="/submissions/gem-storm/gems/gem-octagon.webp" alt="" />
                    <img src="/submissions/gem-storm/gems/gem-hexagon.webp" alt="" />
                    <img src="/submissions/gem-storm/gems/gem-diamond.webp" alt="" />
                    <img src="/submissions/gem-storm/gems/gem-star.webp" alt="" />
                    <img src="/submissions/gem-storm/gems/gem-chest.webp" alt="" />
                </div>
                {/* On mobile, falling gems only render during the betting    */}
                {/* screen (view 0). They're decorative and the bet screen    */}
                {/* has the visual budget for them; during spin/bonus the      */}
                {/* grid fills the viewport and the bg is mostly hidden anyway.*/}
                {(!isNarrow || view === 0) && <PaydirtTreasureBackground narrow={isNarrow} />}
                {ASSETS.images.logo && (
                    <img
                        className="pd-logo"
                        src={ASSETS.images.logo}
                        alt="Gem Storm"
                        draggable={false}
                    />
                )}
                {view === 0 && (
                    <JackpotBar pools={pools} bet={bet} />
                )}

                {view === 0 && <PaydirtInfoButton onOpen={() => setShowInfo(true)} />}
                {showInfo && <PaydirtInfoModal onClose={() => setShowInfo(false)} />}

                <PaydirtGrid
                    ref={gridRef}
                    cells={cells}
                    tensionLevel={tensionLevel}
                    rumble={rumble}
                    earthquake={earthquake}
                    lastEmptyMarkerIdx={lastEmptyMarkerIdx}
                    bet={bet}
                    runningTotal={runningTotal}
                />

                {/* Always-rendered slot below the grid. Reserves vertical
                    space whether or not the running-total is showing,
                    so the grid never shifts when state changes. Respin
                    counter lives inside too — desktop CSS absolute-
                    positions it top-right (out of this flex flow);
                    mobile CSS demotes it to a flex item so it sits
                    next to the hold total. Single DOM location, layout
                    swap via media query. */}
                <div className="pd-bottom-bar">
                    {inHold && (
                        <RespinCounter
                            remaining={respinsRemaining}
                            justReset={respinsJustReset}
                        />
                    )}
                    {inHold && runningTotal > 0 && (
                        <RunningTotal total={runningTotal} bet={bet} />
                    )}
                </div>

                <TriggerOverlay visible={triggerVisible} />

                <PaydirtCelebration
                    tier={celebrationTier}
                    payoutApe={lastWin}
                />
            </div>
        );
    },
);

export default PaydirtWindow;
