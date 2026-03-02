import React from "react";
import {
    Difficulty,
    getChickenMultiplier,
} from "./chickenGameConfig";
import ChickenSVG, { ChickenState } from "./svg/ChickenSVG";
import VehicleSVG, { VehicleType } from "./svg/VehicleSVG";
import EnvironmentSVG from "./svg/EnvironmentSVG";
import ManholeSVG from "./svg/ManholeSVG";

interface ChickenCrossingWindowProps {
    currentLane: number;
    maxSafeLanes: number;
    difficultyMaxSafeLanes: number;
    finishLane: number;
    cashedOut: boolean;
    crashed: boolean;
    isJumping: boolean;
    pendingTrapLane: number | null;
    crashCause: "vehicle" | "trap" | null;
    pendingCrashCause: "vehicle" | "trap" | null;
    pendingUnsafeVehicleStrikeLane: number | null;
    difficulty: Difficulty;
    isGameOngoing: boolean;
    onAdvanceLane: () => void;
    setVehicleHitProbe: (probe: (laneIndex: number) => boolean | null) => void;
    setVehicleCollisionProbe: (probe: (laneIndex: number) => boolean | null) => void;
    onBarrierCrashImpact: () => void;
}

const BARRIER_CRASH_AUDIO_LEAD_MS = 45;
const BARRIER_TOP_PCT = 35;

const TrafficLight = ({ active }: { active: boolean }) => {
    const leftLensColor = active ? "#172A3A" : "#FBBF24"; // idle = caution/ready
    const rightLensColor = active ? "#22C55E" : "#172A3A"; // active = go

    return (
        <div className="relative z-20 pointer-events-none">
            <svg
                viewBox="0 0 150 220"
                className="h-40 w-28 drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]"
            >
                <defs>
                    <linearGradient id="tlHeadOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2B4C63" />
                        <stop offset="100%" stopColor="#1D3447" />
                    </linearGradient>
                    <linearGradient id="tlHeadInner" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#132B3B" />
                        <stop offset="100%" stopColor="#0D2130" />
                    </linearGradient>
                    <linearGradient id="tlPost" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#36576C" />
                        <stop offset="50%" stopColor="#3E6178" />
                        <stop offset="100%" stopColor="#29465A" />
                    </linearGradient>
                    <linearGradient id="tlBase" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34546A" />
                        <stop offset="100%" stopColor="#243C4E" />
                    </linearGradient>
                    <radialGradient id="tlLensGloss" cx="35%" cy="28%" r="70%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
                        <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="tlLensDark" cx="35%" cy="28%" r="75%">
                        <stop offset="0%" stopColor="#20394A" />
                        <stop offset="100%" stopColor="#0B1A26" />
                    </radialGradient>
                    <filter id="tlSoftGlow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Ground shadows */}
                <ellipse cx="75" cy="188" rx="28" ry="10" fill="#06131D" opacity="0.62" />
                <ellipse cx="75" cy="184" rx="20" ry="6.5" fill="#102434" opacity="0.45" />

                {/* Base */}
                <g>
                    <ellipse cx="75" cy="173" rx="30" ry="11" fill="#0A1B28" opacity="0.75" />
                    <rect x="45" y="148" width="60" height="35" rx="14" fill="url(#tlBase)" />
                    <ellipse cx="75" cy="148" rx="30" ry="11" fill="#365A72" />
                    <ellipse cx="75" cy="148" rx="19" ry="6.5" fill="#112536" opacity="0.55" />
                    <ellipse cx="75" cy="171" rx="18" ry="5.5" fill="#193041" opacity="0.7" />
                </g>

                {/* Post */}
                <g>
                    <rect x="57" y="68" width="36" height="82" rx="15" fill="url(#tlPost)" />
                    <rect x="63" y="72" width="6" height="72" rx="3" fill="#5A7A8F" opacity="0.25" />
                    <rect x="81" y="72" width="5" height="72" rx="2.5" fill="#122635" opacity="0.35" />
                    <ellipse cx="75" cy="148" rx="18" ry="6" fill="#0E2231" opacity="0.65" />
                </g>

                {/* Head housing */}
                <g>
                    <rect x="28" y="28" width="94" height="52" rx="26" fill="url(#tlHeadOuter)" />
                    <rect x="36" y="36" width="78" height="36" rx="18" fill="url(#tlHeadInner)" />
                    <ellipse cx="75" cy="32" rx="34" ry="5" fill="#5B8097" opacity="0.18" />
                </g>

                {/* Left bezel + lens */}
                <g>
                    <circle cx="58" cy="54" r="16.5" fill="#243F53" />
                    <circle cx="58" cy="54" r="14.2" fill="#112434" />
                    <circle
                        cx="58"
                        cy="54"
                        r="12.5"
                        fill={active ? "url(#tlLensDark)" : leftLensColor}
                        filter={!active ? "url(#tlSoftGlow)" : undefined}
                    />
                    {!active && (
                        <>
                            <circle cx="58" cy="54" r="15" fill="#F59E0B" opacity="0.22" filter="url(#tlSoftGlow)" />
                            <ellipse cx="53" cy="48" rx="4.2" ry="3.5" fill="#FFFFFF" opacity="0.8" />
                            <ellipse cx="64" cy="60" rx="5.5" ry="2.8" fill="#EA580C" opacity="0.45" transform="rotate(-32 64 60)" />
                        </>
                    )}
                    <circle cx="58" cy="54" r="12.5" fill="url(#tlLensGloss)" />
                </g>

                {/* Right bezel + lens */}
                <g>
                    <circle cx="92" cy="54" r="16.5" fill="#243F53" />
                    <circle cx="92" cy="54" r="14.2" fill="#112434" />
                    <circle
                        cx="92"
                        cy="54"
                        r="12.5"
                        fill={active ? rightLensColor : "url(#tlLensDark)"}
                        filter={active ? "url(#tlSoftGlow)" : undefined}
                    />
                    {active && (
                        <>
                            <circle cx="92" cy="54" r="15" fill="#22C55E" opacity="0.22" filter="url(#tlSoftGlow)" />
                            <ellipse cx="87" cy="49" rx="4.2" ry="3.5" fill="#FFFFFF" opacity="0.7" />
                        </>
                    )}
                    <circle cx="92" cy="54" r="12.5" fill="url(#tlLensGloss)" />
                </g>
            </svg>
        </div>
    );
};

const MultiplierPad = ({ multi, active }: { multi: number, active: boolean }) => (
    <div className={`
        relative w-24 h-14 rounded-xl flex flex-col items-center justify-center
        transition-all duration-300
        ${active ? 'bg-[#2F4553]' : 'bg-[#1A2C38]'}
    `}>
        <span className={`font-bold z-10 text-sm ${active ? 'text-white' : 'text-[#8796A1]'}`}>{multi.toFixed(2)}x</span>
    </div>
);

const ChickenCrossingWindow: React.FC<ChickenCrossingWindowProps> = ({
    currentLane,
    maxSafeLanes,
    difficultyMaxSafeLanes,
    finishLane,
    cashedOut,
    crashed,
    isJumping,
    pendingTrapLane,
    crashCause,
    pendingCrashCause,
    pendingUnsafeVehicleStrikeLane,
    difficulty,
    isGameOngoing,
    onAdvanceLane,
    setVehicleHitProbe,
    setVehicleCollisionProbe,
    onBarrierCrashImpact,
}) => {

    const [dragOffset, setDragOffset] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [recentBarrierImpactLane, setRecentBarrierImpactLane] = React.useState<number | null>(null);
    const [recentBarrierCrashLane, setRecentBarrierCrashLane] = React.useState<number | null>(null);
    const [settledBarrierCrashLanes, setSettledBarrierCrashLanes] = React.useState<Set<number>>(
        () => new Set()
    );
    const [settledBarrierCrashVehicleTypes, setSettledBarrierCrashVehicleTypes] = React.useState<
        Record<number, VehicleType>
    >({});
    const viewportRef = React.useRef<HTMLDivElement | null>(null);
    const chickenRef = React.useRef<HTMLDivElement | null>(null);
    const laneCarRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
    const barrierImpactTimeoutRef = React.useRef<number | null>(null);
    const barrierImpactSoundTimeoutRef = React.useRef<number | null>(null);
    const barrierImpactClearTimeoutRef = React.useRef<number | null>(null);
    const barrierCrashCarClearTimeoutRef = React.useRef<number | null>(null);
    const barrierCrashSettleTimeoutsRef = React.useRef<Record<number, number>>({});
    const lastBarrierImpactLaneRef = React.useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.clientX - dragOffset);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const x = e.clientX - startX;
        setDragOffset(x);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const isLaneVehicleNearChicken = React.useCallback((laneIndex: number): boolean | null => {
        const viewportEl = viewportRef.current;
        const carEl = laneCarRefs.current[laneIndex];

        if (!viewportEl || !carEl) {
            return null;
        }

        const viewportRect = viewportEl.getBoundingClientRect();
        const carRect = carEl.getBoundingClientRect();

        if (carRect.height <= 0 || carRect.width <= 0) {
            return null;
        }

        // Match the chicken anchor used in the renderer: top = 50% - 18px.
        const chickenImpactY = viewportRect.top + (viewportRect.height / 2) - 18;

        // Tight body-level band so "ran over" only happens when the vehicle visibly overlaps the chicken.
        const impactBandTop = chickenImpactY - 18;
        const impactBandBottom = chickenImpactY + 20;

        const overlapsBand =
            carRect.bottom >= impactBandTop && carRect.top <= impactBandBottom;

        return overlapsBand;
    }, []);

    const isLaneVehicleBlockingJump = React.useCallback((laneIndex: number): boolean | null => {
        const chickenEl = chickenRef.current;
        const carEl = laneCarRefs.current[laneIndex];

        if (!chickenEl || !carEl) {
            return null;
        }

        const chickenRect = chickenEl.getBoundingClientRect();
        const carRect = carEl.getBoundingClientRect();

        if (
            carRect.height <= 0 ||
            carRect.width <= 0 ||
            chickenRect.height <= 0 ||
            chickenRect.width <= 0
        ) {
            return null;
        }

        // Trim the wrapper rects to body-level hitboxes (avoid empty padding and effects).
        const chickenHit = {
            left: chickenRect.left + (chickenRect.width * 0.22),
            right: chickenRect.right - (chickenRect.width * 0.18),
            top: chickenRect.top + (chickenRect.height * 0.18),
            bottom: chickenRect.bottom - (chickenRect.height * 0.14),
        };
        const carHit = {
            left: carRect.left + (carRect.width * 0.08),
            right: carRect.right - (carRect.width * 0.08),
            top: carRect.top + (carRect.height * 0.12),
            bottom: carRect.bottom - (carRect.height * 0.1),
        };

        const overlapX = Math.min(chickenHit.right, carHit.right) - Math.max(chickenHit.left, carHit.left);
        const overlapY = Math.min(chickenHit.bottom, carHit.bottom) - Math.max(chickenHit.top, carHit.top);

        // Require meaningful overlap to avoid edge-touch false positives.
        return overlapX > 8 && overlapY > 10;
    }, []);

    React.useEffect(() => {
        setVehicleHitProbe(isLaneVehicleNearChicken);
        setVehicleCollisionProbe(isLaneVehicleBlockingJump);

        return () => {
            setVehicleHitProbe(() => null);
            setVehicleCollisionProbe(() => null);
        };
    }, [
        isLaneVehicleBlockingJump,
        isLaneVehicleNearChicken,
        setVehicleCollisionProbe,
        setVehicleHitProbe,
    ]);

    // Helper to generate deterministic car params based on lane index.
    const getCarConfig = (laneIndex: number) => {
        const pseudoRandom = Math.abs(Math.sin(laneIndex * 12.9898)) * 10000;
        const types: VehicleType[] = ["taxi", "sport", "truck", "sedan", "police", "ambulance", "luxury", "cheap", "bus", "fire_engine"];
        return {
            speed: 1.5 + (pseudoRandom % 2),
            delay: - (pseudoRandom % 3),
            direction: 1, // Forced downwards to match highway flow
            type: types[Math.floor(pseudoRandom % types.length)]
        };
    };

    const getBarrierCrashVehicleType = (laneIndex: number, laneVehicleType: VehicleType): VehicleType => {
        const types: VehicleType[] = ["taxi", "sport", "truck", "sedan", "police", "ambulance", "luxury", "cheap", "bus", "fire_engine"];
        const laneTypeIndex = types.indexOf(laneVehicleType);
        if (laneTypeIndex < 0) {
            return "sport";
        }

        // Deterministic lane-based offset that is never zero, so the crash car never matches the visible loop car.
        const pseudoRandom = Math.abs(Math.sin((laneIndex + 1) * 91.733)) * 10000;
        const nonZeroOffset = 1 + (Math.floor(pseudoRandom) % (types.length - 1));
        return types[(laneTypeIndex + nonZeroOffset) % types.length];
    };

    React.useEffect(() => {
        return () => {
            if (barrierImpactTimeoutRef.current !== null) {
                window.clearTimeout(barrierImpactTimeoutRef.current);
            }
            if (barrierImpactSoundTimeoutRef.current !== null) {
                window.clearTimeout(barrierImpactSoundTimeoutRef.current);
            }
            if (barrierImpactClearTimeoutRef.current !== null) {
                window.clearTimeout(barrierImpactClearTimeoutRef.current);
            }
            if (barrierCrashCarClearTimeoutRef.current !== null) {
                window.clearTimeout(barrierCrashCarClearTimeoutRef.current);
            }
            Object.values(barrierCrashSettleTimeoutsRef.current).forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            barrierCrashSettleTimeoutsRef.current = {};
        };
    }, []);

    React.useEffect(() => {
        if (currentLane <= 0 || !isGameOngoing || crashed || cashedOut) {
            if (currentLane <= 0) {
                lastBarrierImpactLaneRef.current = 0;
                setRecentBarrierImpactLane((prev) => (prev === null ? prev : null));
                setRecentBarrierCrashLane((prev) => (prev === null ? prev : null));
                setSettledBarrierCrashLanes((prev) => (prev.size === 0 ? prev : new Set()));
                setSettledBarrierCrashVehicleTypes((prev) => (
                    Object.keys(prev).length === 0 ? prev : {}
                ));
                Object.values(barrierCrashSettleTimeoutsRef.current).forEach((timeoutId) => {
                    window.clearTimeout(timeoutId);
                });
                barrierCrashSettleTimeoutsRef.current = {};
            }
            return;
        }

        const impactLane = currentLane;
        if (impactLane > maxSafeLanes) {
            return;
        }
        if (pendingCrashCause === "vehicle") {
            if (barrierImpactTimeoutRef.current !== null) {
                window.clearTimeout(barrierImpactTimeoutRef.current);
                barrierImpactTimeoutRef.current = null;
            }
            if (barrierImpactSoundTimeoutRef.current !== null) {
                window.clearTimeout(barrierImpactSoundTimeoutRef.current);
                barrierImpactSoundTimeoutRef.current = null;
            }
            if (barrierImpactClearTimeoutRef.current !== null) {
                window.clearTimeout(barrierImpactClearTimeoutRef.current);
                barrierImpactClearTimeoutRef.current = null;
            }
            if (barrierCrashCarClearTimeoutRef.current !== null) {
                window.clearTimeout(barrierCrashCarClearTimeoutRef.current);
                barrierCrashCarClearTimeoutRef.current = null;
            }
            if (barrierCrashSettleTimeoutsRef.current[impactLane] !== undefined) {
                window.clearTimeout(barrierCrashSettleTimeoutsRef.current[impactLane]);
                delete barrierCrashSettleTimeoutsRef.current[impactLane];
            }
            setRecentBarrierImpactLane((prev) => (prev === impactLane ? null : prev));
            setRecentBarrierCrashLane((prev) => (prev === impactLane ? null : prev));
            setSettledBarrierCrashLanes((prev) => {
                if (!prev.has(impactLane)) return prev;
                const next = new Set(prev);
                next.delete(impactLane);
                return next;
            });
            setSettledBarrierCrashVehicleTypes((prev) => {
                if (!(impactLane in prev)) return prev;
                const next = { ...prev };
                delete next[impactLane];
                return next;
            });
            return;
        }

        if (lastBarrierImpactLaneRef.current === impactLane) {
            return;
        }

        lastBarrierImpactLaneRef.current = impactLane;

        // If a previous spawned crash overlay is still active when a new safe lane is reached,
        // promote it to the settled crashed-car state before switching overlays. This avoids a
        // brief disappear/reappear flicker caused by the single global crash-overlay timer.
        if (
            recentBarrierCrashLane !== null &&
            recentBarrierCrashLane !== impactLane &&
            !settledBarrierCrashLanes.has(recentBarrierCrashLane)
        ) {
            const previousCrashOverlayLane = recentBarrierCrashLane;

            if (barrierCrashSettleTimeoutsRef.current[previousCrashOverlayLane] !== undefined) {
                window.clearTimeout(barrierCrashSettleTimeoutsRef.current[previousCrashOverlayLane]);
                delete barrierCrashSettleTimeoutsRef.current[previousCrashOverlayLane];
            }

            const previousConfig = getCarConfig(previousCrashOverlayLane);
            const previousCrashVehicleType =
                settledBarrierCrashVehicleTypes[previousCrashOverlayLane] ??
                getBarrierCrashVehicleType(previousCrashOverlayLane, previousConfig.type);

            setSettledBarrierCrashLanes((prev) => {
                if (prev.has(previousCrashOverlayLane)) {
                    return prev;
                }
                const next = new Set(prev);
                next.add(previousCrashOverlayLane);
                return next;
            });
            setSettledBarrierCrashVehicleTypes((prev) => ({
                ...prev,
                [previousCrashOverlayLane]: previousCrashVehicleType,
            }));
        }

        if (barrierImpactTimeoutRef.current !== null) {
            window.clearTimeout(barrierImpactTimeoutRef.current);
        }
        if (barrierImpactSoundTimeoutRef.current !== null) {
            window.clearTimeout(barrierImpactSoundTimeoutRef.current);
        }
        if (barrierImpactClearTimeoutRef.current !== null) {
            window.clearTimeout(barrierImpactClearTimeoutRef.current);
        }
        if (barrierCrashCarClearTimeoutRef.current !== null) {
            window.clearTimeout(barrierCrashCarClearTimeoutRef.current);
        }

        const impactConfig = getCarConfig(impactLane);
        const crashAnimDurationMs = Math.max(
            520,
            Math.round(impactConfig.speed * 1000)
        );
        const baseImpactDelayMs = Math.max(
            80,
            Math.round(impactConfig.speed * 1000 * 0.18)
        );
        let impactDelayMs = baseImpactDelayMs;
        let impactSoundDelayMs = Math.max(0, impactDelayMs - BARRIER_CRASH_AUDIO_LEAD_MS);
        let barrierTrafficSettleDelayMs = 0;
        let useLoopCarAsCrashSource = false;
        let crashVehicleTypeForLane = getBarrierCrashVehicleType(impactLane, impactConfig.type);

        const viewportEl = viewportRef.current;
        const loopCarEl = laneCarRefs.current[impactLane];
        if (viewportEl && loopCarEl) {
            const viewportRect = viewportEl.getBoundingClientRect();
            const carRect = loopCarEl.getBoundingClientRect();
            const laneHeight = viewportRect.height;
            const barrierTopPx = (laneHeight * BARRIER_TOP_PCT) / 100;
            const carTopPx = carRect.top - viewportRect.top;
            const carBottomPx = carRect.bottom - viewportRect.top;
            const totalPathPx = laneHeight + 400;
            const clampedTopPx = Math.max(-200, Math.min(laneHeight + 200, carTopPx));
            const remainingRatio = Math.max(0, Math.min(1, (laneHeight + 200 - clampedTopPx) / totalPathPx));
            const tailExitMs = Math.round(remainingRatio * impactConfig.speed * 1000);
            const pxPerMs = totalPathPx / Math.max(1, impactConfig.speed * 1000);
            const distanceToBarrierPx = Math.max(0, (barrierTopPx + 4) - carBottomPx);
            const timeToBarrierMs = Math.round(distanceToBarrierPx / Math.max(pxPerMs, 0.001));

            const hasPassedBarrier = carBottomPx >= barrierTopPx + 4;
            const isIncomingVisible =
                carRect.bottom > viewportRect.top &&
                carRect.top < viewportRect.bottom &&
                carBottomPx < barrierTopPx + 4;

            if (isIncomingVisible && !hasPassedBarrier) {
                useLoopCarAsCrashSource = true;
                crashVehicleTypeForLane = impactConfig.type;
                impactDelayMs = Math.max(0, Math.min(crashAnimDurationMs, timeToBarrierMs));
                impactSoundDelayMs = Math.max(0, impactDelayMs - BARRIER_CRASH_AUDIO_LEAD_MS);
                // Settle slightly before the exact impact timeout to avoid a visible pass-through
                // if the browser delays a frame while processing timers.
                barrierTrafficSettleDelayMs = Math.max(0, impactDelayMs - 16);
            } else if (hasPassedBarrier) {
                barrierTrafficSettleDelayMs = Math.min(crashAnimDurationMs, tailExitMs + 60);
            } else {
                barrierTrafficSettleDelayMs = 0;
            }
        }

        setSettledBarrierCrashLanes((prev) => {
            if (!prev.has(impactLane)) return prev;
            const next = new Set(prev);
            next.delete(impactLane);
            return next;
        });
        setSettledBarrierCrashVehicleTypes((prev) => {
            if (!(impactLane in prev)) return prev;
            const next = { ...prev };
            delete next[impactLane];
            return next;
        });

        if (barrierCrashSettleTimeoutsRef.current[impactLane] !== undefined) {
            window.clearTimeout(barrierCrashSettleTimeoutsRef.current[impactLane]);
        }

        if (!useLoopCarAsCrashSource) {
            setRecentBarrierCrashLane(impactLane);
        } else {
            setRecentBarrierCrashLane((prev) => (prev === impactLane ? null : prev));
        }
        barrierCrashSettleTimeoutsRef.current[impactLane] = window.setTimeout(() => {
            setSettledBarrierCrashLanes((prev) => {
                const next = new Set(prev);
                next.add(impactLane);
                return next;
            });
            setSettledBarrierCrashVehicleTypes((prev) => ({
                ...prev,
                [impactLane]: crashVehicleTypeForLane,
            }));
            delete barrierCrashSettleTimeoutsRef.current[impactLane];
        }, barrierTrafficSettleDelayMs);

        if (!useLoopCarAsCrashSource) {
            barrierCrashCarClearTimeoutRef.current = window.setTimeout(() => {
                setRecentBarrierCrashLane((prev) => (prev === impactLane ? null : prev));
                barrierCrashCarClearTimeoutRef.current = null;
            }, crashAnimDurationMs + 120);
        } else {
            barrierCrashCarClearTimeoutRef.current = null;
        }

        barrierImpactSoundTimeoutRef.current = window.setTimeout(() => {
            onBarrierCrashImpact();
            barrierImpactSoundTimeoutRef.current = null;
        }, impactSoundDelayMs);

        barrierImpactTimeoutRef.current = window.setTimeout(() => {
            setRecentBarrierImpactLane(impactLane);

            barrierImpactClearTimeoutRef.current = window.setTimeout(() => {
                setRecentBarrierImpactLane((prev) => (prev === impactLane ? null : prev));
                barrierImpactClearTimeoutRef.current = null;
            }, 520);

            barrierImpactTimeoutRef.current = null;
        }, impactDelayMs);
    }, [
        cashedOut,
        crashed,
        currentLane,
        isGameOngoing,
        maxSafeLanes,
        onBarrierCrashImpact,
        pendingCrashCause,
        recentBarrierCrashLane,
        settledBarrierCrashLanes,
        settledBarrierCrashVehicleTypes,
    ]);

    // 5 lanes fit perfectly on the screen at a time
    const laneWidthPct = 20;

    // Camera pans right when Chicken moves beyond lane 1. We also add the dragOffset for manual panning.
    // Convert drag pixel offset to percentage (roughly based on screen width config, we divide by 10 for smoothness)
    const manualPanPct = (dragOffset / 10);

    // Auto camera locks onto chicken
    const cameraOffset = Math.max(0, currentLane - 1);

    // Base transform with auto-tracking + manual drag
    let baseTranslate = -(cameraOffset * laneWidthPct) + manualPanPct;

    // Bounds check to stop panning way past the finish lane or before the start.
    const minTranslate = -(Math.max(0, finishLane - 3) * laneWidthPct);
    const maxTranslate = 0; // Don't drag Left of start position
    if (baseTranslate < minTranslate) baseTranslate = minTranslate;
    if (baseTranslate > maxTranslate) baseTranslate = maxTranslate;

    const containerTransform = `translateX(${baseTranslate}%)`;

    // Only render what's visible plus a buffer on each side for optimization
    const visibleStart = 0; // Render all to allow dragging
    const visibleEnd = finishLane;

    const renderIndices = [];
    for (let i = visibleStart; i <= visibleEnd; i++) renderIndices.push(i);

    const sewerCrashLane =
        crashed &&
        crashCause === "trap" &&
        currentLane > maxSafeLanes &&
        currentLane <= difficultyMaxSafeLanes
            ? currentLane
            : null;
    const activeTrapLane =
        pendingCrashCause === "trap" ? (pendingTrapLane ?? sewerCrashLane) : sewerCrashLane;
    const isSewerCrash = sewerCrashLane !== null;
    const isVehicleCrash = crashed && crashCause === "vehicle";
    const activeUnsafeVehicleStrikeLane =
        !crashed && pendingCrashCause === "vehicle" ? pendingUnsafeVehicleStrikeLane : null;

    let chickenStatus: ChickenState = "idle";
    if (isVehicleCrash || (crashed && !isSewerCrash)) chickenStatus = "dead";
    else if (isGameOngoing && currentLane === 0) chickenStatus = "jump"; // Intro jump
    else if (isJumping) chickenStatus = "jump"; // Normal jump

    // When the game hasn't started, position the chicken completely hidden to the left.
    const chickenX = isGameOngoing ? ((currentLane * laneWidthPct) + (laneWidthPct / 2)) : -20;

    return (
        <div
            ref={viewportRef}
            className={`absolute inset-0 z-10 overflow-hidden bg-[#0F212E] select-none font-roboto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves window
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes driveVerticalDown {
                    0% { top: -200px; }
                    100% { top: calc(100% + 200px); }
                }
                @keyframes driveVerticalUp {
                    0% { top: calc(100% + 200px); }
                    100% { top: -200px; }
                }
                @keyframes driveVerticalCrashDown {
                    0% { top: -200px; opacity: 1; }
                    14% { top: calc(35% - 150px); opacity: 1; }
                    18% { top: calc(35% - 112px); opacity: 1; }
                    23% { top: calc(35% - 128px); opacity: 1; }
                    30% { top: calc(35% - 120px); opacity: 1; }
                    100% { top: calc(35% - 120px); opacity: 1; }
                }
                @keyframes vehicleCrashJolt {
                    0% { transform: rotate(0deg) scale(1); filter: brightness(1); }
                    14% { transform: rotate(0deg) scale(1); filter: brightness(1); }
                    18% { transform: rotate(-5deg) scale(1.16, 0.48); filter: brightness(0.65) saturate(0.55) contrast(1.2); }
                    23% { transform: rotate(2deg) scale(0.95, 1.02); filter: brightness(0.95); }
                    30% { transform: rotate(-1deg) scale(1.05, 0.76); filter: brightness(0.8) saturate(0.7); }
                    100% { transform: rotate(0deg) scale(1.02, 0.82); filter: brightness(0.78) saturate(0.75); }
                }
                @keyframes normalJumpArc {
                    0% { transform: translate(-50%, -50%) scaleY(1); }
                    40% { transform: translate(-50%, -80%) scaleY(1.1); }
                    100% { transform: translate(-50%, -50%) scaleY(1); }
                }
                @keyframes archedEntrance {
                    0% {
                        transform: translate(-50%, -50%) scaleY(1);
                        opacity: 0;
                    }
                    40% {
                        transform: translate(-50%, -80%) scaleY(1.1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scaleY(1);
                        opacity: 1;
                    }
                }
                @keyframes trapRattle {
                    0% { transform: translateY(0) rotate(0deg) scale(1); }
                    25% { transform: translateY(-1px) rotate(-1.5deg) scale(1.02); }
                    50% { transform: translateY(1px) rotate(1.2deg) scale(1.03); }
                    75% { transform: translateY(-1px) rotate(-0.8deg) scale(1.01); }
                    100% { transform: translateY(0) rotate(0deg) scale(1); }
                }
                @keyframes sewerChickenDrop {
                    0% {
                        transform: translate(-50%, -50%) rotate(0deg) scale(1);
                        opacity: 1;
                    }
                    16% {
                        transform: translate(-50%, -78%) rotate(-10deg) scale(1.05, 0.94);
                        opacity: 1;
                    }
                    30% {
                        transform: translate(-50%, -62%) rotate(16deg) scale(0.98, 1.02);
                        opacity: 1;
                    }
                    46% {
                        transform: translate(-50%, -52%) rotate(-32deg) scale(0.92);
                        opacity: 0.98;
                    }
                    66% {
                        transform: translate(-50%, -34%) rotate(135deg) scale(0.58);
                        opacity: 0.88;
                    }
                    84% {
                        transform: translate(-50%, -24%) rotate(260deg) scale(0.28);
                        opacity: 0.45;
                    }
                    100% {
                        transform: translate(-50%, -20%) rotate(380deg) scale(0.06);
                        opacity: 0;
                    }
                }
                @keyframes barrierCrashShake {
                    0% { transform: scale(1); }
                    16% { transform: scale(1.02, 0.95); }
                    32% { transform: scale(0.99, 1.02); }
                    56% { transform: scale(1.01, 0.98); }
                    100% { transform: scale(1); }
                }
                @keyframes barrierImpactSpark {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
                    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -55%) scale(1.45); }
                }
                @keyframes barrierImpactSmoke {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.35); }
                    12% { opacity: 0.55; transform: translate(-50%, -50%) scale(0.8); }
                    100% { opacity: 0; transform: translate(-50%, -75%) scale(1.5); }
                }
                @keyframes driveVerticalUnsafeStrike {
                    0% { top: -220px; opacity: 1; }
                    54% { top: calc(50% - 150px); opacity: 1; }
                    62% { top: calc(50% - 105px); opacity: 1; }
                    70% { top: calc(50% - 126px); opacity: 1; }
                    100% { top: calc(50% - 120px); opacity: 1; }
                }
                @keyframes unsafeVehicleStrikeJolt {
                    0% { transform: rotate(0deg) scale(1); filter: brightness(1); }
                    54% { transform: rotate(0deg) scale(1); filter: brightness(1); }
                    62% { transform: rotate(-6deg) scale(1.14, 0.62); filter: brightness(0.78) saturate(0.8); }
                    70% { transform: rotate(2deg) scale(0.96, 0.96); filter: brightness(0.95); }
                    100% { transform: rotate(-2deg) scale(1.02, 0.84); filter: brightness(0.8) saturate(0.85); }
                }
            `}} />
            <div
                className="absolute inset-y-0 left-0 h-full transition-transform duration-[400ms] ease-in-out bg-[#2B2D31]"
                style={{ width: '100%', transform: containerTransform }}
            >
                {/* Render the infinite sliding lanes */}
                {renderIndices.map(i => {
                    const xPos = i * laneWidthPct;
                    if (i === finishLane) {
                        return (
                            <div key={i} suppressHydrationWarning className="absolute top-0 bottom-0 bg-[#D4D4D8] z-20 shadow-[0_0_30px_rgba(0,0,0,0.3)]" style={{ left: `${xPos}%`, width: `${laneWidthPct}%` }}>
                                {/* Curb line */}
                                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#A1A1AA] border-r border-[#71717A]/30"></div>
                                {/* Grass area further back */}
                                <div className="absolute right-0 top-0 bottom-0 w-[60%] bg-[#86EFAC] border-l border-[#4ADE80]">
                                    <div className="absolute top-[10%] left-[20%] w-20 h-20 drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]"><EnvironmentSVG type="bush" /></div>
                                    <div className="absolute bottom-[20%] left-[30%] w-24 h-24 drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]"><EnvironmentSVG type="bush" /></div>
                                </div>
                                {/* Sidewalk Objects */}
                                <div className="absolute top-[30%] left-[5%] w-12 h-12 drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)]"><EnvironmentSVG type="bench" /></div>
                                <div className="absolute bottom-[40%] left-[15%] w-8 h-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]"><EnvironmentSVG type="fire_hydrant" /></div>
                                <div className="absolute top-1/2 -translate-y-1/2 w-[40%] flex justify-center items-center font-bold text-[#A1A1AA] tracking-[0.3em] uppercase rotate-90 opacity-60 text-4xl cursor-default drop-shadow-sm z-30 pointer-events-none">
                                    FINISH
                                </div>
                            </div>
                        );
                    }

                    if (i > finishLane) return null; // Don't render anything past Finish

                    const config = getCarConfig(i);
                    const barrierCrashVehicleType = getBarrierCrashVehicleType(i, config.type);
                    const settledBarrierCrashVehicleType =
                        settledBarrierCrashVehicleTypes[i] ?? barrierCrashVehicleType;
                    const multi = getChickenMultiplier(i, difficulty);
                    const isTrapLane = i > 0 && i < finishLane && activeTrapLane === i;
                    const isBarrierImpactLane = recentBarrierImpactLane === i;
                    const isBarrierCrashLane = recentBarrierCrashLane === i;
                    const isSettledBarrierCrashLane = settledBarrierCrashLanes.has(i);
                    const isUnsafeVehicleStrikeLane = activeUnsafeVehicleStrikeLane === i;
                    const isForcedVehicleCollisionLane =
                        i === currentLane &&
                        i <= maxSafeLanes &&
                        (
                            (isJumping && pendingCrashCause === "vehicle") ||
                            (crashed && crashCause === "vehicle")
                        );
                    const shouldMaskLoopTraffic = isBarrierCrashLane && !isSettledBarrierCrashLane;
                    const canAdvanceByTrapClick =
                        i === currentLane + 1 &&
                        i < finishLane &&
                        isGameOngoing &&
                        !crashed &&
                        !cashedOut &&
                        !isJumping;
                    return (
                        <div key={i} suppressHydrationWarning className={`absolute top-0 bottom-0 ${i === 0 ? 'bg-[#D4D4D8] z-20 shadow-[0_0_30px_rgba(0,0,0,0.3)]' : 'border-l-[4px] border-white/20 border-dashed z-0'}`} style={{ left: `${xPos}%`, width: `${laneWidthPct}%` }}>
                            {/* Decorative Lane 0 Elements */}
                            {i === 0 && (
                                <>
                                    {/* Curb line */}
                                    <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-[#A1A1AA] border-l border-[#71717A]/30"></div>
                                    {/* Grass area further back */}
                                    <div className="absolute left-0 top-0 bottom-0 w-[60%] bg-[#86EFAC] border-r border-[#4ADE80]">
                                        <div className="absolute top-[20%] left-[10%] w-20 h-20 drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]"><EnvironmentSVG type="bush" /></div>
                                        <div className="absolute bottom-[40%] left-[5%] w-24 h-24 drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]"><EnvironmentSVG type="bush" /></div>
                                        <div className="absolute bottom-[5%] left-[20%] w-16 h-16 drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]"><EnvironmentSVG type="bush" /></div>
                                    </div>
                                    {/* Sidewalk Objects */}
                                    <div className="absolute bottom-[10%] right-[10%] w-12 h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] opacity-80"><EnvironmentSVG type="grate" /></div>

                                    {/* Start light placed on sidewalk shoulder (not in the jump lane row) */}
                                    <div className="absolute top-[6%] right-[-4%] z-30 scale-[0.9] origin-top-right">
                                        <TrafficLight active={isGameOngoing} />
                                    </div>
                                </>
                            )}

                            {/* Chicken path row (traffic light / sewer trap) */}
                            <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-center items-center pointer-events-none">
                                {i === 0 ? (
                                    <div className="w-24 h-14" />
                                ) : i < finishLane ? (
                                    <div
                                        className={`relative w-28 h-16 ${isTrapLane ? "z-30" : ""} ${canAdvanceByTrapClick ? "pointer-events-auto cursor-pointer" : ""}`}
                                        style={isTrapLane ? { animation: "trapRattle 220ms linear infinite" } : undefined}
                                        onMouseDown={(e) => {
                                            if (canAdvanceByTrapClick) {
                                                e.stopPropagation();
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (!canAdvanceByTrapClick) return;
                                            e.stopPropagation();
                                            onAdvanceLane();
                                        }}
                                        title={canAdvanceByTrapClick ? "Click to jump to next lane" : undefined}
                                    >
                                        <ManholeSVG isOpen={isTrapLane} danger={isTrapLane} />
                                    </div>
                                ) : (
                                    <div className="w-24 h-14" />
                                )}
                            </div>

                            {/* Multiplier row (moved below chicken path) */}
                            {i > 0 && i < finishLane && (
                                <div className="absolute bottom-[14%] w-full flex justify-center items-center z-10 pointer-events-none">
                                    <MultiplierPad multi={multi} active={currentLane >= i && !crashed} />
                                </div>
                            )}

                            {/* Safe Barrier */}
                            {i > 0 && currentLane >= i && i <= maxSafeLanes && !isForcedVehicleCollisionLane && (
                                <div
                                    className="absolute top-[35%] left-1/2 -translate-x-1/2 w-32 h-16 z-20 drop-shadow-2xl"
                                >
                                    <div
                                        className="w-full h-full origin-center"
                                        style={isBarrierImpactLane ? { animation: "barrierCrashShake 420ms ease-out" } : undefined}
                                    >
                                        <EnvironmentSVG type="barrier" />
                                    </div>
                                </div>
                            )}

                            {/* Barrier impact VFX (timed to the car hitting the barrier) */}
                            {isBarrierImpactLane && !isForcedVehicleCollisionLane && (
                                <div className="absolute top-[34%] left-1/2 -translate-x-1/2 w-24 h-20 z-30 pointer-events-none">
                                    <div
                                        className="absolute left-1/2 top-1/2 w-14 h-14"
                                        style={{ animation: "barrierImpactSpark 420ms ease-out forwards" }}
                                    >
                                        <svg viewBox="0 0 100 100" className="w-full h-full">
                                            <g transform="translate(50 50)">
                                                {[...Array(8)].map((_, sparkIdx) => {
                                                    const angle = sparkIdx * 45;
                                                    return (
                                                        <rect
                                                            key={sparkIdx}
                                                            x="-2"
                                                            y="-28"
                                                            width="4"
                                                            height="18"
                                                            rx="2"
                                                            fill={sparkIdx % 2 === 0 ? "#FDE68A" : "#F59E0B"}
                                                            opacity="0.9"
                                                            transform={`rotate(${angle})`}
                                                        />
                                                    );
                                                })}
                                            </g>
                                            <circle cx="50" cy="50" r="8" fill="#FFFFFF" fillOpacity="0.28" />
                                        </svg>
                                    </div>
                                    <div
                                        className="absolute left-1/2 top-1/2 w-20 h-12"
                                        style={{ animation: "barrierImpactSmoke 520ms ease-out forwards" }}
                                    >
                                        <svg viewBox="0 0 120 70" className="w-full h-full">
                                            <ellipse cx="60" cy="40" rx="34" ry="16" fill="#CBD5E1" fillOpacity="0.22" />
                                            <ellipse cx="44" cy="34" rx="18" ry="10" fill="#E2E8F0" fillOpacity="0.18" />
                                            <ellipse cx="77" cy="33" rx="16" ry="9" fill="#E2E8F0" fillOpacity="0.16" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Cars spawn on all multiplier lanes */}
                            {i > 0 && (
                                <div className="absolute h-full w-full pointer-events-none z-10">
                                    {!isSettledBarrierCrashLane && (
                                        <div
                                            className="absolute inset-0 overflow-hidden"
                                            style={
                                                shouldMaskLoopTraffic
                                                    ? { clipPath: `inset(${BARRIER_TOP_PCT}% 0 0 0)` }
                                                    : undefined
                                            }
                                        >
                                            <div
                                                suppressHydrationWarning
                                                ref={(el) => {
                                                    laneCarRefs.current[i] = el;
                                                }}
                                                className="absolute left-1/2 -translate-x-1/2 w-20 h-40 origin-bottom"
                                                style={{
                                                    animationName: 'driveVerticalDown',
                                                    animationDuration: `${config.speed}s`,
                                                    animationTimingFunction: 'linear',
                                                    animationIterationCount: 'infinite',
                                                    animationFillMode: 'none',
                                                    animationDelay: `${config.delay}s`,
                                                    animationPlayState: (crashed || cashedOut) ? 'paused' : 'running'
                                                }}
                                            >
                                                <VehicleSVG
                                                    type={config.type}
                                                    className="w-full h-full"
                                                    style={{ transform: config.direction === -1 ? 'rotate(180deg)' : 'none' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {isSettledBarrierCrashLane && !isBarrierCrashLane && !isForcedVehicleCollisionLane && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 w-20 h-40 origin-bottom"
                                            style={{
                                                top: 'calc(35% - 120px)',
                                            }}
                                        >
                                            <div
                                                className="w-full h-full origin-bottom"
                                                style={{
                                                    transform: "rotate(0deg) scale(1.02, 0.82)",
                                                    filter: "brightness(0.78) saturate(0.75)",
                                                }}
                                            >
                                                <VehicleSVG
                                                    type={settledBarrierCrashVehicleType}
                                                    className="w-full h-full"
                                                    style={{ transform: config.direction === -1 ? 'rotate(180deg)' : 'none' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Dedicated crash car so the looping traffic car never teleports/resets */}
                                    {isBarrierCrashLane && !isForcedVehicleCollisionLane && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 w-20 h-40 origin-bottom"
                                            style={{
                                                animationName: 'driveVerticalCrashDown',
                                                animationDuration: `${config.speed}s`,
                                                animationTimingFunction: 'linear',
                                                animationIterationCount: '1',
                                                animationFillMode: 'forwards',
                                                animationDelay: '0s',
                                                animationPlayState: (crashed || cashedOut) ? 'paused' : 'running',
                                            }}
                                        >
                                            <div
                                                className="w-full h-full origin-bottom"
                                                style={{
                                                    animationName: "vehicleCrashJolt",
                                                    animationDuration: `${config.speed}s`,
                                                    animationTimingFunction: "linear",
                                                    animationIterationCount: "1",
                                                    animationFillMode: "forwards",
                                                }}
                                            >
                                                <VehicleSVG
                                                    type={barrierCrashVehicleType}
                                                    className="w-full h-full"
                                                    style={{ transform: config.direction === -1 ? 'rotate(180deg)' : 'none' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Unsafe-lane seeded vehicle crash: strike car animation to justify "Ran Over" */}
                                    {isUnsafeVehicleStrikeLane && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 w-20 h-40 origin-bottom z-20"
                                            style={{
                                                animationName: "driveVerticalUnsafeStrike",
                                                animationDuration: "220ms",
                                                animationTimingFunction: "linear",
                                                animationIterationCount: "1",
                                                animationFillMode: "forwards",
                                            }}
                                        >
                                            <div
                                                className="w-full h-full origin-bottom"
                                                style={{
                                                    animationName: "unsafeVehicleStrikeJolt",
                                                    animationDuration: "220ms",
                                                    animationTimingFunction: "linear",
                                                    animationIterationCount: "1",
                                                    animationFillMode: "forwards",
                                                }}
                                            >
                                                <VehicleSVG
                                                    type={barrierCrashVehicleType}
                                                    className="w-full h-full"
                                                    style={{ transform: config.direction === -1 ? "rotate(180deg)" : "none" }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* The Chicken */}
                <div
                    ref={chickenRef}
                    className={`absolute w-20 h-20 transition-all duration-[400ms] ease-in-out ${isSewerCrash ? 'z-10' : crashed ? 'z-40' : 'z-20'}`}
                    style={{
                        top: "calc(50% - 18px)",
                        left: isGameOngoing ? `${chickenX}%` : '-20%',
                        transform: `translate(-50%, -50%)`,
                        transformOrigin: isSewerCrash ? "50% 76%" : "50% 50%",
                        ...(isSewerCrash ? {
                            animation: `sewerChickenDrop 650ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
                        } : isGameOngoing && currentLane === 0 && !crashed && !cashedOut ? {
                            // If it's lane 0 AND game just started, trigger the arched entrance jump
                            animation: `archedEntrance 400ms ease-out forwards`
                        } : isJumping ? {
                            animation: `normalJumpArc 400ms ease-in-out forwards`
                        } : {})
                    }}
                >
                    <div className="w-full h-full relative bottom-3"> {/* Lift sprite so feet sit on manhole/barrier line */}
                        {/* the chickenStatus logic explicitly handles 'jump' now */}
                        <ChickenSVG chickenState={chickenStatus} />
                    </div>
                </div>

            </div>

            {/* Overlays */}
            {cashedOut && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F212E]/80 backdrop-blur-sm z-30">
                    <p className="text-[#00E701] font-bold text-lg tracking-widest uppercase mb-2">WINNER</p>
                    <h2 className="text-6xl font-black text-white drop-shadow-lg text-center font-roboto">
                        SAFE!
                    </h2>
                    <p className="mt-3 text-sm font-semibold tracking-widest text-[#B1BAD3] uppercase">
                        {Math.min(Math.max(0, currentLane), difficultyMaxSafeLanes)} lanes |{" "}
                        {getChickenMultiplier(
                            Math.min(Math.max(0, currentLane), difficultyMaxSafeLanes),
                            difficulty
                        ).toFixed(2)}
                        x
                    </p>
                </div>
            )}

            {crashed && (
                <>
                    <style>{`
                        @keyframes slowFadeInOverlay {
                            0% { opacity: 0; }
                            50% { opacity: 0; }
                            100% { opacity: 1; }
                        }
                    `}</style>
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-[#0F212E]/80 backdrop-blur-sm z-30 pointer-events-none"
                        style={{ animation: 'slowFadeInOverlay 0.8s ease-out forwards' }}
                    >
                        <div className="flex flex-col items-center">
                            <h2 className="text-5xl font-black text-white drop-shadow-lg text-center font-roboto uppercase">
                                Busted
                            </h2>
                            {isSewerCrash && (
                                <p className="mt-2 text-xs tracking-[0.25em] uppercase text-[#FDE68A] font-semibold">
                                    Sewer Trap
                                </p>
                            )}
                            {isVehicleCrash && (
                                <p className="mt-2 text-xs tracking-[0.25em] uppercase text-[#FCA5A5] font-semibold">
                                    Ran Over
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChickenCrossingWindow;
