"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { BonusMode, GameState } from "@/components/games/loot-tumble/types";
import { GAME_CONFIG } from "@/components/games/loot-tumble/config/game-config";
import { ReelGrid } from "@/components/games/loot-tumble/slot/ReelGrid";
import { WinDisplay } from "@/components/games/loot-tumble/slot/WinDisplay";
import { ClusterParticles } from "@/components/games/loot-tumble/slot/ClusterParticles";
import { BigWinOverlay } from "@/components/games/loot-tumble/slot/BigWinOverlay";
import { GameInfoModal } from "./GameInfoModal";
import { motion, AnimatePresence } from "framer-motion";
import { useScreenShake } from "@/components/games/loot-tumble/hooks/useScreenShake";
import { Howl } from "howler";

type SceneTransitionDirection = "ENTER" | "EXIT";
type SceneTransitionPhase = "IDLE" | "IMPACT" | "CRACK" | "DROP" | "BLACKOUT" | "ENTER" | "SETTLE";

export interface SlotsEventPopup {
    id: number;
    variant: "bonus-entry" | "bonus-retrigger";
    title: string;
    message: string;
    iconSrc: string;
    mode: "full" | "compact";
}

const DUST_PUFFS = [
    { side: "left", x: 34, y: -18, scale: 1.1, width: 78, height: 42, delay: 0.02, duration: 0.68, opacity: 0.38 },
    { side: "left", x: 58, y: -10, scale: 0.92, width: 60, height: 34, delay: 0.08, duration: 0.6, opacity: 0.28 },
    { side: "right", x: -34, y: -18, scale: 1.1, width: 78, height: 42, delay: 0.02, duration: 0.68, opacity: 0.38 },
    { side: "right", x: -58, y: -10, scale: 0.92, width: 60, height: 34, delay: 0.08, duration: 0.6, opacity: 0.28 },
];

function DustBurst({ burstId }: { burstId: number }) {
    if (burstId === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                key={burstId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-[12%] bottom-[13%] z-30 h-[16%] pointer-events-none"
            >
                {DUST_PUFFS.map((puff, index) => (
                    <motion.div
                        key={`${burstId}-${puff.side}-${index}`}
                        className={`absolute ${puff.side === "left" ? "left-0" : "right-0"} bottom-0 rounded-full blur-[20px]`}
                        style={{
                            width: puff.width,
                            height: puff.height,
                            background: "radial-gradient(ellipse at center, rgba(255,225,180,0.42) 0%, rgba(201,148,88,0.24) 45%, rgba(78,48,23,0) 78%)",
                        }}
                        initial={{ x: 0, y: 6, scale: 0.35, opacity: 0 }}
                        animate={{
                            x: puff.x,
                            y: puff.y,
                            scale: puff.scale,
                            opacity: [0, puff.opacity, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: puff.duration,
                            delay: puff.delay,
                            ease: [0.18, 1, 0.32, 1],
                        }}
                    />
                ))}
            </motion.div>
        </AnimatePresence>
    );
}

// --- Falling debris particles during IMPACT/CRACK phase ---
const DEBRIS_PIECES = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 3 + Math.random() * 8,
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 1.0,
    rotation: Math.random() * 360,
    rotateSpeed: 120 + Math.random() * 240,
    opacity: 0.4 + Math.random() * 0.5,
    color: ['#8B6914', '#5C4A1E', '#A0722A', '#3D2B0F', '#6B4F1D'][Math.floor(Math.random() * 5)],
    sway: (Math.random() - 0.5) * 40,
}));

function FallingDebris({ active, phase }: { active: boolean; phase: SceneTransitionPhase }) {
    if (!active) return null;
    const showDust = phase === "IMPACT" || phase === "CRACK" || phase === "DROP";
    if (!showDust) return null;

    return (
        <div className="absolute inset-0 z-[18] pointer-events-none overflow-hidden">
            {DEBRIS_PIECES.map((piece) => (
                <motion.div
                    key={`debris-${piece.id}`}
                    className="absolute rounded-sm"
                    style={{
                        left: `${piece.x}%`,
                        top: -10,
                        width: piece.size,
                        height: piece.size * (0.6 + Math.random() * 0.8),
                        background: piece.color,
                        boxShadow: `0 0 ${piece.size}px rgba(0,0,0,0.4)`,
                    }}
                    initial={{ y: -20, x: 0, rotate: piece.rotation, opacity: 0 }}
                    animate={{
                        y: [0, 300, 700],
                        x: [0, piece.sway, piece.sway * 1.5],
                        rotate: [piece.rotation, piece.rotation + piece.rotateSpeed],
                        opacity: [0, piece.opacity, piece.opacity, 0],
                    }}
                    transition={{
                        duration: piece.duration,
                        delay: piece.delay,
                        ease: [0.22, 0.68, 0.36, 1],
                    }}
                />
            ))}
            {/* Dust haze across the top */}
            <motion.div
                className="absolute inset-x-0 top-0 h-[30%]"
                style={{
                    background: "linear-gradient(to bottom, rgba(139,105,20,0.25) 0%, rgba(92,74,30,0.12) 40%, transparent 100%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "CRACK" || phase === "DROP" ? 1 : 0.4 }}
                transition={{ duration: 0.6 }}
            />
        </div>
    );
}

// --- SVG crack overlay that appears on the board ---
function CrackOverlay({ active, phase }: { active: boolean; phase: SceneTransitionPhase }) {
    if (!active || (phase !== "CRACK" && phase !== "DROP")) return null;

    const crackProgress = phase === "DROP" ? 1 : 0.7;

    return (
        <div className="absolute inset-0 z-[15] pointer-events-none">
            <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {/* Main central crack */}
                <motion.path
                    d="M200,0 L195,60 L205,120 L192,180 L210,240 L188,310 L207,380 L195,440 L200,500"
                    fill="none"
                    stroke="rgba(255,200,80,0.9)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: crackProgress, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 8px rgba(255,180,40,0.8)) drop-shadow(0 0 20px rgba(255,140,20,0.4))" }}
                />
                {/* Branch cracks */}
                <motion.path
                    d="M195,60 L160,90 L140,85"
                    fill="none" stroke="rgba(255,180,60,0.7)" strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: crackProgress, opacity: 0.8 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 6px rgba(255,160,30,0.6))" }}
                />
                <motion.path
                    d="M205,120 L240,150 L270,145"
                    fill="none" stroke="rgba(255,180,60,0.7)" strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: crackProgress, opacity: 0.8 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 6px rgba(255,160,30,0.6))" }}
                />
                <motion.path
                    d="M192,180 L155,210 L130,200"
                    fill="none" stroke="rgba(255,180,60,0.6)" strokeWidth="1.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: crackProgress, opacity: 0.7 }}
                    transition={{ duration: 0.35, delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 5px rgba(255,160,30,0.5))" }}
                />
                <motion.path
                    d="M210,240 L250,270 L280,262"
                    fill="none" stroke="rgba(255,180,60,0.6)" strokeWidth="1.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: crackProgress, opacity: 0.7 }}
                    transition={{ duration: 0.35, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 5px rgba(255,160,30,0.5))" }}
                />
                <motion.path
                    d="M188,310 L150,340 L125,332"
                    fill="none" stroke="rgba(255,180,60,0.5)" strokeWidth="1.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: crackProgress, opacity: 0.6 }}
                    transition={{ duration: 0.3, delay: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    style={{ filter: "drop-shadow(0 0 4px rgba(255,160,30,0.4))" }}
                />
            </svg>
            {/* Light bleeding through the crack */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: "linear-gradient(90deg, transparent 46%, rgba(255,200,80,0.15) 49%, rgba(255,220,100,0.25) 50%, rgba(255,200,80,0.15) 51%, transparent 54%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "DROP" ? 1 : 0.5 }}
                transition={{ duration: 0.3 }}
            />
        </div>
    );
}

// --- Ambient floating particles during bonus mode ---
const AMBIENT_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 3,
    drift: (Math.random() - 0.5) * 30,
    type: Math.random() > 0.6 ? 'ember' : 'dust' as const,
}));

function BonusAmbientParticles({ active }: { active: boolean }) {
    if (!active) return null;

    return (
        <div className="absolute inset-0 z-[12] pointer-events-none overflow-hidden">
            {AMBIENT_PARTICLES.map((p) => (
                <motion.div
                    key={`ambient-${p.id}`}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: p.type === 'ember'
                            ? 'radial-gradient(circle, rgba(255,180,60,0.9) 0%, rgba(255,120,20,0.4) 60%, transparent 100%)'
                            : 'radial-gradient(circle, rgba(200,190,170,0.5) 0%, rgba(160,140,110,0.2) 60%, transparent 100%)',
                        boxShadow: p.type === 'ember'
                            ? `0 0 ${p.size * 2}px rgba(255,160,40,0.4)`
                            : 'none',
                    }}
                    animate={{
                        y: [0, -(20 + Math.random() * 40), -(50 + Math.random() * 60)],
                        x: [0, p.drift * 0.5, p.drift],
                        opacity: [0, p.type === 'ember' ? 0.8 : 0.45, 0],
                        scale: [0.5, 1, 0.3],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

interface SlotsEngineWindowProps {
    gameState: GameState;
    betAmount: number;
    isGameActive: boolean;
    isLobbyView?: boolean;
    turboEnabled?: boolean;
    autoSpinEnabled?: boolean;
    bonusActive?: boolean;
    visualMode?: BonusMode;
    bonusTransitionActive?: boolean;
    bonusTransitionDirection?: SceneTransitionDirection | null;
    bonusSpinsRemaining?: number;
    onVisualModeSwap?: (mode: BonusMode) => void;
    onBonusTransitionComplete?: () => void;
    onIntroComplete?: () => void;
    showInfo?: boolean;
    onOpenInfo?: () => void;
    onCloseInfo?: () => void;
    eventPopup?: SlotsEventPopup | null;
    onDismissEventPopup?: () => void;
}

const SlotsEngineWindow: React.FC<SlotsEngineWindowProps> = ({
    gameState,
    betAmount,
    isGameActive,
    isLobbyView = false,
    turboEnabled,
    autoSpinEnabled,
    bonusActive = false,
    visualMode = "BASE",
    bonusTransitionActive = false,
    bonusTransitionDirection = null,
    bonusSpinsRemaining = 0,
    onVisualModeSwap,
    onBonusTransitionComplete,
    onIntroComplete,
    showInfo,
    onOpenInfo,
    onCloseInfo,
    eventPopup = null,
    onDismissEventPopup,
}) => {
    const {
        grid,
        activeClusters,
        state,
        currentWin,
        totalWin,
        cascadeDepth,
        spinMultiplierTotal,
    } = gameState;

    const [showBigWin, setShowBigWin] = useState(false);
    const [introState, setIntroState] = useState<"LOADING" | "RULES" | "READY">("LOADING");
    const [loadProgress, setLoadProgress] = useState(0);
    const [sceneTransitionPhase, setSceneTransitionPhase] = useState<SceneTransitionPhase>("IDLE");
    const [dustBurstId, setDustBurstId] = useState(0);
    const [showAngryBird, setShowAngryBird] = useState(false);
    const bonusLevelSoundRef = React.useRef<Howl | null>(null);
    const angryBirdSoundRef = React.useRef<Howl | null>(null);
    const angryBirdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const birdTapTimestampsRef = React.useRef<number[]>([]);

    const { shakeControls, triggerShake } = useScreenShake();
    const showGame = isGameActive && introState === "READY";
    const showBonusTheme = visualMode === "BONUS";
    const incomingVisualMode: BonusMode = bonusTransitionDirection === "ENTER" ? "BONUS" : "BASE";
    const playAreaBackground = showBonusTheme ? "/submissions/loot-tumble/bonus background.webp" : "/submissions/loot-tumble/gamebg.webp";
    const sceneSpeedMultiplier = turboEnabled ? 1 : 1.6;
    const sceneTiming = {
        crackDelay: Math.round(380 * sceneSpeedMultiplier),
        dropDelay: Math.round(720 * sceneSpeedMultiplier),
        blackoutDelay: Math.round(1100 * sceneSpeedMultiplier),
        swapDelay: Math.round(1220 * sceneSpeedMultiplier),
        enterDelay: Math.round(1340 * sceneSpeedMultiplier),
        settleDelay: Math.round(2100 * sceneSpeedMultiplier),
        completeDelay: Math.round(2540 * sceneSpeedMultiplier),
    };

    useEffect(() => {
        const duration = 2000;
        const interval = 20;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            setLoadProgress((currentStep / steps) * 100);
            if (currentStep >= steps) {
                clearInterval(timer);
                setTimeout(() => setIntroState("RULES"), 300);
            }
        }, interval);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (isGameActive && introState === "RULES") {
            setIntroState("READY");
        }
    }, [isGameActive, introState]);

    useEffect(() => {
        if (isLobbyView && introState === "READY") {
            setIntroState("RULES");
            setSceneTransitionPhase("IDLE");
            setShowBigWin(false);
        }
    }, [introState, isLobbyView]);

    useEffect(() => {
        if (introState !== "LOADING") {
            onIntroComplete?.();
        }
    }, [introState, onIntroComplete]);

    useEffect(() => {
        if (!bonusTransitionActive || !bonusTransitionDirection) {
            setSceneTransitionPhase("IDLE");
            return;
        }

        if (!showGame) {
            return;
        }

        const nextMode: BonusMode = bonusTransitionDirection === "ENTER" ? "BONUS" : "BASE";

        setSceneTransitionPhase("IMPACT");
        new Howl({ src: ["/submissions/loot-tumble/shock.mp3"] }).play();
        if (bonusTransitionDirection === "ENTER") {
            bonusLevelSoundRef.current?.stop();
            bonusLevelSoundRef.current?.unload();
            bonusLevelSoundRef.current = new Howl({ src: ["/submissions/loot-tumble/bonus level.mp3"] });
            bonusLevelSoundRef.current.play();
        }

        const crackTimer = setTimeout(() => {
            setSceneTransitionPhase("CRACK");
            new Howl({ src: ["/submissions/loot-tumble/shock.mp3"], volume: 0.7 }).play();
        }, sceneTiming.crackDelay);

        const dropTimer = setTimeout(() => {
            setSceneTransitionPhase("DROP");
        }, sceneTiming.dropDelay);

        const blackoutTimer = setTimeout(() => {
            setSceneTransitionPhase("BLACKOUT");
        }, sceneTiming.blackoutDelay);

        const swapTimer = setTimeout(() => {
            onVisualModeSwap?.(nextMode);
        }, sceneTiming.swapDelay);

        const enterTimer = setTimeout(() => {
            setSceneTransitionPhase("ENTER");
        }, sceneTiming.enterDelay);

        const settleTimer = setTimeout(() => {
            setSceneTransitionPhase("SETTLE");
            if (bonusTransitionDirection === "ENTER") {
                setDustBurstId(prev => prev + 1);
            }
        }, sceneTiming.settleDelay);

        const completeTimer = setTimeout(() => {
            setSceneTransitionPhase("IDLE");
            onBonusTransitionComplete?.();
        }, sceneTiming.completeDelay);

        return () => {
            clearTimeout(crackTimer);
            clearTimeout(dropTimer);
            clearTimeout(blackoutTimer);
            clearTimeout(swapTimer);
            clearTimeout(enterTimer);
            clearTimeout(settleTimer);
            clearTimeout(completeTimer);
        };
    }, [
        bonusTransitionActive,
        bonusTransitionDirection,
        onBonusTransitionComplete,
        onVisualModeSwap,
        sceneTiming.blackoutDelay,
        sceneTiming.completeDelay,
        sceneTiming.crackDelay,
        sceneTiming.dropDelay,
        sceneTiming.enterDelay,
        sceneTiming.settleDelay,
        sceneTiming.swapDelay,
        showGame,
    ]);

    useEffect(() => {
        return () => {
            bonusLevelSoundRef.current?.stop();
            bonusLevelSoundRef.current?.unload();
            bonusLevelSoundRef.current = null;
            angryBirdSoundRef.current?.stop();
            angryBirdSoundRef.current?.unload();
            angryBirdSoundRef.current = null;
            if (angryBirdTimerRef.current) {
                clearTimeout(angryBirdTimerRef.current);
                angryBirdTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (showGame && !bonusTransitionActive) {
            return;
        }

        birdTapTimestampsRef.current = [];
        setShowAngryBird(false);

        if (angryBirdTimerRef.current) {
            clearTimeout(angryBirdTimerRef.current);
            angryBirdTimerRef.current = null;
        }
    }, [bonusTransitionActive, showGame]);

    useEffect(() => {
        if (eventPopup?.mode !== "full" || !onDismissEventPopup) {
            return;
        }

        let handlePointerDown: (() => void) | null = null;
        const armListener = window.setTimeout(() => {
            handlePointerDown = () => onDismissEventPopup();
            window.addEventListener("pointerdown", handlePointerDown, { once: true });
        }, 0);

        return () => {
            clearTimeout(armListener);
            if (handlePointerDown) {
                window.removeEventListener("pointerdown", handlePointerDown);
            }
        };
    }, [eventPopup, onDismissEventPopup]);

    const prevStateRef = React.useRef(state);
    useEffect(() => {
        const prev = prevStateRef.current;
        if (state === "CASCADING" && prev !== "CASCADING") {
            const totalClusterCells = activeClusters.reduce((sum, cluster) => sum + cluster.size, 0);
            if (totalClusterCells > 0) {
                new Howl({ src: ["/submissions/loot-tumble/points.mp3"] }).play();
                triggerShake(totalClusterCells, cascadeDepth);
            }
        }
        prevStateRef.current = state;
    }, [state, activeClusters, triggerShake, cascadeDepth]);

    useEffect(() => {
        if (turboEnabled && autoSpinEnabled) {
            new Howl({ src: ["/submissions/loot-tumble/parrot.mp3"] }).play();
            new Howl({ src: ["/submissions/loot-tumble/shock.mp3"] }).play();
        }
    }, [turboEnabled, autoSpinEnabled]);

    useEffect(() => {
        if (state === "WIN_DISPLAY" && totalWin >= betAmount * 10) {
            setShowBigWin(true);
        }
    }, [state, totalWin, betAmount]);

    const dismissBigWin = useCallback(() => {
        setShowBigWin(false);
    }, []);

    const triggerAngryBird = useCallback(() => {
        setShowAngryBird(true);
        angryBirdSoundRef.current?.stop();
        angryBirdSoundRef.current?.unload();
        angryBirdSoundRef.current = new Howl({ src: ["/submissions/loot-tumble/yell.mp3"] });
        angryBirdSoundRef.current.play();

        if (angryBirdTimerRef.current) {
            clearTimeout(angryBirdTimerRef.current);
        }

        angryBirdTimerRef.current = setTimeout(() => {
            setShowAngryBird(false);
            angryBirdTimerRef.current = null;
        }, 1500);
    }, []);

    const handleSymbolClick = useCallback((symbolId: string) => {
        if (!showGame || bonusTransitionActive || symbolId !== "bird") {
            return;
        }

        const now = Date.now();
        const recentTaps = birdTapTimestampsRef.current.filter((timestamp) => now - timestamp <= 2000);
        const nextTaps = [...recentTaps, now];

        if (nextTaps.length >= 10) {
            birdTapTimestampsRef.current = [];
            triggerAngryBird();
            return;
        }

        birdTapTimestampsRef.current = nextTaps;
    }, [bonusTransitionActive, showGame, triggerAngryBird]);

    const renderBoardShell = ({
        boardMode,
        boardPhase = "IDLE",
        showDust = false,
        showCompanion = false,
    }: {
        boardMode: BonusMode;
        boardPhase?: SceneTransitionPhase;
        showDust?: boolean;
        showCompanion?: boolean;
    }) => {
        const bonusEffectMode: "none" | "transition" | "full" =
            boardMode !== "BONUS"
                ? "none"
                : bonusTransitionActive || boardPhase === "ENTER" || boardPhase === "SETTLE"
                    ? "transition"
                    : "full";
        const boardFrameFilter = boardMode === "BONUS"
            ? bonusTransitionActive
                ? "drop-shadow(0 14px 22px rgba(0,0,0,0.52)) drop-shadow(0 0 18px rgba(34,211,238,0.18))"
                : "drop-shadow(0 20px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 30px rgba(34,211,238,0.25))"
            : bonusTransitionActive
                ? "drop-shadow(0 14px 22px rgba(0,0,0,0.52))"
                : "drop-shadow(0 20px 30px rgba(0,0,0,0.6))";

        return (
        <div
            className="relative w-full h-full bg-contain bg-center bg-no-repeat transform-gpu"
            style={{
                backgroundImage: 'url("/submissions/loot-tumble/slotbox.png")',
                filter: boardFrameFilter,
                willChange: "transform, opacity",
            }}
        >
            <div
                className="absolute z-10 overflow-hidden"
                style={{
                    top: "14.5%",
                    left: "17.5%",
                    right: "17.5%",
                    bottom: "14.5%",
                }}
            >
                <ReelGrid
                    grid={grid}
                    activeClusters={activeClusters}
                    state={state}
                    cascadeNewCellKeys={gameState.cascadeNewCellKeys}
                    cascadeFallenCells={gameState.cascadeFallenCells}
                    bonusActive={boardMode === "BONUS"}
                    bonusEffectMode={bonusEffectMode}
                    onSymbolClick={handleSymbolClick}
                />

                {activeClusters.length > 0 && (state === "RESOLVING" || state === "CASCADING") && (
                    <ClusterParticles
                        clusters={activeClusters}
                        state={state}
                        rows={GAME_CONFIG.gridRows}
                        cols={GAME_CONFIG.gridCols}
                    />
                )}
            </div>

            {showDust && <DustBurst burstId={dustBurstId} />}

            <AnimatePresence>
                {showCompanion && turboEnabled && autoSpinEnabled && (
                    <motion.div
                        initial={{ y: 200, opacity: 0, rotate: 20, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ y: 200, opacity: 0, rotate: 20, scale: 0.8 }}
                        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                        className="absolute -bottom-16 -right-12 w-32 md:w-48 lg:w-56 z-50 pointer-events-none"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/submissions/loot-tumble/autobird.webp"
                            alt="Auto Bird"
                            className={`w-full h-auto object-contain filter animate-[pulse_1s_ease-in-out_infinite] ${boardMode === "BONUS" ? "drop-shadow-[0_0_28px_rgba(34,211,238,0.95)]" : "drop-shadow-[0_0_20px_rgba(0,255,255,0.9)]"}`}
                            draggable={false}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        );
    };

    const screenTransitionMotion =
        sceneTransitionPhase === "IMPACT"
            ? {
                x: [0, -18, 16, -14, 10, -6, 0],
                y: [0, 12, -10, 8, -4, 0],
                transition: { duration: 0.48 * sceneSpeedMultiplier, ease: "easeOut" as const },
            }
            : sceneTransitionPhase === "CRACK"
            ? {
                x: [0, -24, 22, -18, 14, -8, 4, 0],
                y: [0, 16, -14, 12, -8, 4, 0],
                transition: { duration: 0.56 * sceneSpeedMultiplier, ease: "easeOut" as const },
            }
            : {
                x: 0,
                y: 0,
                transition: { duration: 0.24 * sceneSpeedMultiplier, ease: "easeOut" as const },
            };

    // Split board departure - left half
    const outgoingBoardLeftMotion =
        sceneTransitionPhase === "IMPACT"
            ? {
                clipPath: "inset(0 0 0 0)",
                x: 0, y: 0, rotate: 0,
                scale: [1, 1.015, 0.99, 1.01, 1],
                opacity: 1,
                transition: { duration: 0.42 * sceneSpeedMultiplier, ease: "easeOut" as const },
            }
            : sceneTransitionPhase === "CRACK"
            ? {
                clipPath: "inset(0 50% 0 0)",
                x: -4, y: 0, rotate: -0.3,
                scale: 1,
                opacity: 1,
                transition: { duration: 0.32 * sceneSpeedMultiplier, ease: [0.22, 1, 0.36, 1] as const },
            }
            : sceneTransitionPhase === "DROP"
                ? {
                    clipPath: "inset(0 50% 0 0)",
                    x: [-4, -180, -400],
                    y: [0, 80, 500],
                    rotate: [-0.3, -8, -18],
                    scale: [1, 0.95, 0.85],
                    opacity: [1, 0.8, 0],
                    transition: { duration: 0.62 * sceneSpeedMultiplier, ease: [0.22, 1, 0.36, 1] as const },
                }
                : sceneTransitionPhase === "BLACKOUT"
                    ? {
                        clipPath: "inset(0 50% 0 0)",
                        x: -400, y: 500, rotate: -18, scale: 0.85, opacity: 0,
                        transition: { duration: 0.12 * sceneSpeedMultiplier, ease: "linear" as const },
                    }
                : {
                    clipPath: "inset(0 0 0 0)",
                    x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
                    transition: { duration: 0.24 * sceneSpeedMultiplier, ease: "easeOut" as const },
                };

    // Split board departure - right half
    const outgoingBoardRightMotion =
        sceneTransitionPhase === "IMPACT"
            ? {
                clipPath: "inset(0 0 0 0)",
                x: 0, y: 0, rotate: 0,
                scale: [1, 1.015, 0.99, 1.01, 1],
                opacity: 1,
                transition: { duration: 0.42 * sceneSpeedMultiplier, ease: "easeOut" as const },
            }
            : sceneTransitionPhase === "CRACK"
            ? {
                clipPath: "inset(0 0 0 50%)",
                x: 4, y: 0, rotate: 0.3,
                scale: 1,
                opacity: 1,
                transition: { duration: 0.32 * sceneSpeedMultiplier, ease: [0.22, 1, 0.36, 1] as const },
            }
            : sceneTransitionPhase === "DROP"
                ? {
                    clipPath: "inset(0 0 0 50%)",
                    x: [4, 180, 400],
                    y: [0, 100, 550],
                    rotate: [0.3, 10, 22],
                    scale: [1, 0.95, 0.85],
                    opacity: [1, 0.8, 0],
                    transition: { duration: 0.62 * sceneSpeedMultiplier, ease: [0.22, 1, 0.36, 1] as const },
                }
                : sceneTransitionPhase === "BLACKOUT"
                    ? {
                        clipPath: "inset(0 0 0 50%)",
                        x: 400, y: 550, rotate: 22, scale: 0.85, opacity: 0,
                        transition: { duration: 0.12 * sceneSpeedMultiplier, ease: "linear" as const },
                    }
                : {
                    clipPath: "inset(0 0 0 0)",
                    x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
                    transition: { duration: 0.24 * sceneSpeedMultiplier, ease: "easeOut" as const },
                };

    const incomingBoardMotion =
        sceneTransitionPhase === "ENTER"
            ? {
                y: [-700, 24, -8, 0],
                rotate: [-5, 1.5, -0.4, 0],
                scale: [0.88, 1.025, 0.995, 1],
                opacity: [0, 1, 1, 1],
                transition: { duration: 0.82 * sceneSpeedMultiplier, ease: [0.16, 1, 0.3, 1] as const },
            }
            : {
                y: 0,
                rotate: 0,
                scale: 1,
                opacity: 1,
                transition: { duration: 0.24 * sceneSpeedMultiplier, ease: "easeOut" as const },
            };

    const showBonusBadge =
        showGame
        && visualMode === "BONUS"
        && (bonusActive || (bonusTransitionActive && bonusTransitionDirection === "ENTER"))
        && (!bonusTransitionActive || sceneTransitionPhase === "ENTER" || sceneTransitionPhase === "SETTLE");
    const showBonusStageBanner =
        bonusTransitionActive
        && bonusTransitionDirection === "ENTER"
        && (sceneTransitionPhase === "BLACKOUT" || sceneTransitionPhase === "ENTER" || sceneTransitionPhase === "SETTLE");

    const transitionTitle = incomingVisualMode === "BONUS" ? "Bonus Round" : "Back to Base";
    const transitionMessage =
        sceneTransitionPhase === "IMPACT"
            ? "Shaking Loose..."
            : sceneTransitionPhase === "CRACK"
                ? "The Walls Are Cracking..."
                : sceneTransitionPhase === "DROP"
                    ? "Breaking Apart..."
                    : sceneTransitionPhase === "BLACKOUT"
                        ? incomingVisualMode === "BONUS" ? "Unlocking The Hidden Room..." : "Packing Up The Treasure..."
                        : incomingVisualMode === "BONUS"
                            ? "Free Spins Incoming"
                            : "Returning To The Main Room";
    const showFullEventPopup = eventPopup?.mode === "full";
    const showCompactEventPopup = eventPopup?.mode === "compact";

    return (
        <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat rounded-xl transform-gpu"
            animate={screenTransitionMotion}
            style={{ backgroundImage: `url("${playAreaBackground}")` }}
        >
            {showBonusTheme && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.18),transparent_40%)] pointer-events-none" />
            )}

            {/* Ambient floating dust/embers during bonus round */}
            <BonusAmbientParticles active={showBonusTheme && showGame && !bonusTransitionActive} />

            {/* Falling debris during IMPACT/CRACK/DROP */}
            <FallingDebris active={bonusTransitionActive && bonusTransitionDirection === "ENTER"} phase={sceneTransitionPhase} />

            <AnimatePresence>
                {bonusTransitionActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity:
                                sceneTransitionPhase === "IMPACT"
                                    ? 0.15
                                    : sceneTransitionPhase === "CRACK"
                                        ? 0.25
                                        : sceneTransitionPhase === "DROP"
                                            ? 0.45
                                            : sceneTransitionPhase === "BLACKOUT"
                                                ? 0.92
                                                : sceneTransitionPhase === "ENTER"
                                                    ? 0.38
                                                    : 0.14,
                            background:
                                sceneTransitionPhase === "ENTER" || sceneTransitionPhase === "SETTLE"
                                    ? incomingVisualMode === "BONUS"
                                        ? "radial-gradient(circle at center, rgba(34,211,238,0.24), rgba(4,11,24,0.84))"
                                        : "radial-gradient(circle at center, rgba(245,158,11,0.18), rgba(12,8,5,0.82))"
                                    : sceneTransitionPhase === "CRACK" || sceneTransitionPhase === "DROP"
                                        ? "radial-gradient(circle at center, rgba(255,180,40,0.08), rgba(0,0,0,0.88))"
                                        : "radial-gradient(circle at center, rgba(8,8,12,0.74), rgba(0,0,0,0.92))",
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.25 } }}
                        className="absolute inset-0 z-20 pointer-events-none"
                        style={{ willChange: "opacity" }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFullEventPopup && eventPopup && (
                    <motion.div
                        key={`event-full-${eventPopup.id}`}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                        className="absolute inset-0 z-[65] flex items-center justify-center px-6"
                    >
                        <div className="absolute inset-0 bg-black/56 backdrop-blur-[3px]" />
                        <div className="relative flex w-full max-w-md flex-col items-center text-center pointer-events-none">
                            <motion.div
                                className="absolute top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 rounded-full"
                                style={{
                                    background: "repeating-conic-gradient(from 0deg, rgba(250,204,21,0.34) 0deg 10deg, rgba(250,204,21,0) 10deg 24deg)",
                                    filter: "blur(1px)",
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="absolute top-1/2 h-[18rem] w-[18rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.2)_0%,rgba(249,115,22,0.08)_38%,rgba(0,0,0,0)_72%)]" />
                            <motion.p
                                initial={{ y: -16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="relative z-10 text-sm font-black uppercase tracking-[0.4em] text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.5)]"
                            >
                                {eventPopup.title}
                            </motion.p>
                            <motion.img
                                src={eventPopup.iconSrc}
                                alt={eventPopup.title}
                                className="relative z-10 mt-4 w-28 object-contain drop-shadow-[0_0_24px_rgba(250,204,21,0.45)]"
                                initial={{ scale: 0.78, opacity: 0, rotate: -10 }}
                                animate={{ scale: [0.92, 1.04, 1], opacity: 1, rotate: [0, 3, 0] }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                draggable={false}
                            />
                            <motion.p
                                initial={{ y: 18, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="relative z-10 mt-5 text-3xl font-black uppercase leading-tight text-amber-200 drop-shadow-[0_0_18px_rgba(251,191,36,0.38)]"
                            >
                                {eventPopup.message}
                            </motion.p>
                            <p className="relative z-10 mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                                Click anywhere to continue
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCompactEventPopup && eventPopup && (
                    <motion.div
                        key={`event-compact-${eventPopup.id}`}
                        initial={{ y: -22, opacity: 0, scale: 0.92 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -18, opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
                        className="absolute inset-x-0 top-5 z-[62] flex justify-center px-4 pointer-events-none"
                    >
                        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-[#0a1524]/88 px-4 py-3 shadow-[0_0_24px_rgba(34,211,238,0.22)] backdrop-blur-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={eventPopup.iconSrc}
                                alt=""
                                aria-hidden="true"
                                className="h-12 w-12 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.35)]"
                                draggable={false}
                            />
                            <div className="text-left">
                                <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-cyan-300">{eventPopup.title}</p>
                                <p className="mt-0.5 text-sm font-black text-amber-200">{eventPopup.message}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {introState === "LOADING" && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-900/95 overflow-hidden rounded-xl"
                        style={{ backgroundImage: 'url("/submissions/loot-tumble/bg_loading.webp")', backgroundSize: "cover", backgroundPosition: "center" }}
                    >
                        <div className="absolute inset-0 bg-black/40 rounded-xl" />
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="relative z-10 flex flex-col items-center w-full max-w-sm px-4"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/submissions/loot-tumble/loot tumble main.png"
                                alt="Loot Tumble"
                                className="w-[80%] max-w-[300px] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] mb-8"
                                draggable={false}
                            />

                            <div className="relative w-full h-6 bg-[#3d2210] rounded-full border-[3px] border-[#522e17] overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),_0_10px_15px_rgba(0,0,0,0.5)] flex items-center p-1">
                                <div className="absolute inset-0 bg-[#2a170a] rounded-full" />
                                <div
                                    className="relative h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] transition-all duration-75"
                                    style={{ width: `${loadProgress}%` }}
                                >
                                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full" />
                                </div>
                            </div>
                            <p className="mt-3 font-bold text-amber-200 uppercase tracking-widest text-xs drop-shadow-md">
                                Loading {Math.round(loadProgress)}%
                            </p>
                        </motion.div>

                        <motion.div
                            className="absolute -bottom-4 -left-4 w-32 h-32 z-20 origin-bottom-left"
                            initial={{ y: "150%", rotate: -20, scale: 0.8 }}
                            animate={{ y: "20%", rotate: 0, scale: 1.1 }}
                            transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 12 }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/submissions/loot-tumble/bird.png"
                                alt="Parrot"
                                className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]"
                                draggable={false}
                            />
                        </motion.div>
                    </motion.div>
                )}

                {introState === "RULES" && !isGameActive && (
                    <motion.div
                        key="rules"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 rounded-xl p-4 overflow-y-auto"
                        style={{ backgroundImage: 'url("/submissions/loot-tumble/bg_loading.webp")', backgroundSize: "cover", backgroundPosition: "center" }}
                    >
                        <div className="absolute inset-0 bg-black/60 rounded-xl" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", bounce: 0.4 }}
                            className="relative z-10 flex flex-col items-center w-full max-w-sm"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/submissions/loot-tumble/loot tumble small.png"
                                alt="Loot Tumble"
                                className="w-[60%] max-w-[200px] object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)] mb-6"
                                draggable={false}
                            />

                            <div className="space-y-3 w-full mb-6 max-w-[95%]">
                                <div
                                    className="border border-[#7a4e28] rounded-xl py-3 px-4 text-center bg-cover bg-center shadow-lg relative overflow-hidden"
                                    style={{ backgroundImage: 'url("/submissions/loot-tumble/widebanner.webp")' }}
                                >
                                    <div className="absolute inset-0 bg-black/40" />
                                    <h3 className="relative z-10 text-[#FBA943] font-bold text-sm md:text-base uppercase tracking-wider mb-1 drop-shadow-md">Cluster Pays</h3>
                                    <p className="relative z-10 text-white/95 leading-snug text-[0.8rem] md:text-sm drop-shadow-md">Match 5 or more identical regular symbols by touching up, down, left, or right. Winning clusters disappear and tumble into fresh symbols.</p>
                                </div>
                                <div
                                    className="border border-[#7a4e28] rounded-xl py-3 px-4 text-center bg-cover bg-center shadow-lg relative overflow-hidden"
                                    style={{ backgroundImage: 'url("/submissions/loot-tumble/widebanner.webp")' }}
                                >
                                    <div className="absolute inset-0 bg-black/40" />
                                    <h3 className="relative z-10 text-cyan-400 font-bold text-sm md:text-base uppercase tracking-wider mb-1 drop-shadow-md">Scatter Bonus</h3>
                                    <p className="relative z-10 text-white/95 leading-snug text-[0.8rem] md:text-sm drop-shadow-md">Land 3 touching Scatter symbols on the settled grid, including after tumbles, to unlock 5 free bonus spins.</p>
                                </div>
                                <div
                                    className="border border-[#7a4e28] rounded-xl py-3 px-4 text-center bg-cover bg-center shadow-lg relative overflow-hidden"
                                    style={{ backgroundImage: 'url("/submissions/loot-tumble/widebanner.webp")' }}
                                >
                                    <div className="absolute inset-0 bg-black/40" />
                                    <h3 className="relative z-10 text-[#FF6BFF] font-bold text-sm md:text-base uppercase tracking-wider mb-1 drop-shadow-md">Bonus Multipliers</h3>
                                    <p className="relative z-10 text-white/95 leading-snug text-[0.8rem] md:text-sm drop-shadow-md">Multiplier symbols only appear in bonus. Their values are added together and applied to the spin win, but only if that spin already has a regular symbol win.</p>
                                </div>
                            </div>

                            <p className="text-white/40 text-xs animate-pulse">Buy spins to start playing</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showBonusBadge && (
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-amber-300/50 bg-black/50 px-5 py-2 text-center shadow-[0_0_24px_rgba(251,191,36,0.45)] backdrop-blur-sm"
                >
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">Bonus Round</p>
                    <p className="text-lg font-black text-amber-200">{bonusSpinsRemaining} Free Spins Left</p>
                </motion.div>
            )}

            <AnimatePresence>
                {showBonusStageBanner && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 * sceneSpeedMultiplier } }}
                        className="absolute inset-0 z-[35] flex items-center justify-center pointer-events-none"
                        style={{ willChange: "transform, opacity" }}
                    >
                        <div className="relative w-[min(60vw,460px)] transform-gpu">
                            <div className="absolute left-1/2 top-[42%] h-[124%] w-[68%] -translate-x-1/2 overflow-visible">
                                <motion.img
                                    src="/submissions/loot-tumble/bonus2.png"
                                    alt="Bonus Stage"
                                    className="absolute left-1/2 top-0 w-full -translate-x-1/2 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.42)]"
                                    initial={{ y: -146, opacity: 0 }}
                                    animate={{
                                        y: sceneTransitionPhase === "BLACKOUT" ? -34 : sceneTransitionPhase === "ENTER" ? 10 : 8,
                                        opacity: 1,
                                    }}
                                    transition={{ duration: 0.72 * sceneSpeedMultiplier, ease: [0.16, 1, 0.3, 1] }}
                                    draggable={false}
                                />
                            </div>

                            <motion.img
                                src="/submissions/loot-tumble/bonus1.png"
                                alt="Bonus"
                                className="relative z-10 w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]"
                                initial={{ y: 34, scale: 0.82, opacity: 0 }}
                                animate={{ y: 0, scale: 1, opacity: 1 }}
                                transition={{ duration: 0.56 * sceneSpeedMultiplier, ease: [0.16, 1, 0.3, 1] }}
                                draggable={false}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{ opacity: showGame ? 1 : 0.15 }}
            >
                {bonusTransitionActive ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Outgoing board — split into left and right halves during CRACK/DROP */}
                        {(sceneTransitionPhase === "IMPACT" || sceneTransitionPhase === "CRACK" || sceneTransitionPhase === "DROP" || sceneTransitionPhase === "BLACKOUT") && (
                            <>
                                {/* Left half */}
                                <motion.div
                                    animate={outgoingBoardLeftMotion}
                                    className="absolute inset-0 flex items-center justify-center transform-gpu"
                                    style={{ transformOrigin: "30% 55%", willChange: "transform, opacity, clip-path" }}
                                >
                                    <div className="relative w-full h-full">
                                        {renderBoardShell({
                                            boardMode: visualMode,
                                            boardPhase: sceneTransitionPhase,
                                            showCompanion: false,
                                        })}
                                        <CrackOverlay active={bonusTransitionDirection === "ENTER"} phase={sceneTransitionPhase} />
                                    </div>
                                </motion.div>
                                {/* Right half */}
                                <motion.div
                                    animate={outgoingBoardRightMotion}
                                    className="absolute inset-0 flex items-center justify-center transform-gpu"
                                    style={{ transformOrigin: "70% 55%", willChange: "transform, opacity, clip-path" }}
                                >
                                    {renderBoardShell({
                                        boardMode: visualMode,
                                        boardPhase: sceneTransitionPhase,
                                        showCompanion: false,
                                    })}
                                </motion.div>

                                {/* Light seam bleeding through the crack */}
                                {(sceneTransitionPhase === "CRACK" || sceneTransitionPhase === "DROP") && bonusTransitionDirection === "ENTER" && (
                                    <motion.div
                                        className="absolute inset-0 z-[16] flex items-center justify-center pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: sceneTransitionPhase === "CRACK" ? [0, 0.6, 0.8] : [0.8, 1, 0],
                                        }}
                                        transition={{
                                            duration: sceneTransitionPhase === "CRACK" ? 0.4 * sceneSpeedMultiplier : 0.5 * sceneSpeedMultiplier,
                                            ease: "easeOut",
                                        }}
                                    >
                                        <div
                                            className="h-[70%] w-[6px] rounded-full"
                                            style={{
                                                background: "linear-gradient(to bottom, transparent 0%, rgba(255,220,100,0.9) 20%, rgba(255,180,40,1) 50%, rgba(255,220,100,0.9) 80%, transparent 100%)",
                                                boxShadow: "0 0 20px 8px rgba(255,180,40,0.5), 0 0 60px 20px rgba(255,140,20,0.25)",
                                                filter: "blur(1px)",
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </>
                        )}

                        {(sceneTransitionPhase === "ENTER" || sceneTransitionPhase === "SETTLE") && (
                            <motion.div
                                animate={incomingBoardMotion}
                                className="absolute inset-0 flex items-center justify-center transform-gpu"
                                style={{ transformOrigin: "50% 55%", willChange: "transform, opacity" }}
                            >
                                {renderBoardShell({
                                    boardMode: incomingVisualMode,
                                    boardPhase: sceneTransitionPhase,
                                    showDust: sceneTransitionPhase === "SETTLE" && bonusTransitionDirection === "ENTER",
                                    showCompanion: false,
                                })}
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <motion.div
                        animate={shakeControls}
                        className="relative w-full h-full flex items-center justify-center transform-gpu"
                        style={{ willChange: "transform" }}
                    >
                        {renderBoardShell({
                            boardMode: visualMode,
                            showCompanion: true,
                        })}
                    </motion.div>
                )}
            </div>

            {showGame && (
                <button
                    type="button"
                    onClick={() => onOpenInfo?.()}
                    className="absolute bottom-4 left-4 z-[58] w-11 h-11 transition-transform active:scale-95 hover:scale-105 drop-shadow-md"
                    aria-label="Game Info"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/submissions/loot-tumble/info.webp"
                        alt="Info"
                        className="w-full h-full object-contain opacity-90 hover:opacity-100 transition-opacity"
                        draggable={false}
                    />
                </button>
            )}

            <AnimatePresence>
                {bonusTransitionActive && bonusTransitionDirection === "EXIT" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 14 }}
                        animate={{
                            opacity: (sceneTransitionPhase === "DROP" || sceneTransitionPhase === "CRACK") ? 0 : 1,
                            scale: sceneTransitionPhase === "ENTER" ? 1.04 : 1,
                            y: sceneTransitionPhase === "ENTER" ? -10 : 0,
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        className="absolute inset-x-0 top-[16%] z-30 flex justify-center pointer-events-none"
                    >
                        <div className="rounded-full border border-amber-300/60 bg-[#0a1524]/85 px-6 py-3 shadow-[0_0_32px_rgba(34,211,238,0.3)] backdrop-blur-sm">
                            <p className="text-center text-xs font-bold uppercase tracking-[0.45em] text-cyan-300">{transitionTitle}</p>
                            <p className="mt-1 text-center text-lg font-black text-amber-200">
                                {transitionMessage}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAngryBird && (
                    <motion.div
                        initial={{ y: 240, x: -70, opacity: 0, rotate: -16, scale: 0.72 }}
                        animate={{ y: 0, x: 0, opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ y: 220, x: -50, opacity: 0, rotate: -10, scale: 0.82 }}
                        transition={{ type: "spring", bounce: 0.36, duration: 0.55 }}
                        className="absolute -bottom-[4.5rem] -left-10 z-[55] w-44 md:w-64 lg:w-72 pointer-events-none"
                    >
                        <motion.img
                            src="/submissions/loot-tumble/angry.webp"
                            alt="Angry Bird"
                            className="w-full h-auto object-contain drop-shadow-[0_0_26px_rgba(248,113,113,0.68)]"
                            animate={{
                                rotate: [0, -3.5, 2.5, -2, 0],
                                scale: [1, 1.03, 0.99, 1.02, 1],
                                y: [0, -6, 0],
                            }}
                            transition={{
                                duration: 0.52,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            draggable={false}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {showGame && (currentWin > 0 || totalWin > 0 || spinMultiplierTotal > 0) && (
                <div className="absolute z-50 pointer-events-none">
                    <WinDisplay
                        currentWin={currentWin}
                        totalWin={totalWin}
                        state={state}
                        cascadeDepth={cascadeDepth}
                        betAmount={betAmount}
                        multiplierTotal={spinMultiplierTotal}
                    />
                </div>
            )}

            <BigWinOverlay
                show={showBigWin}
                totalWin={totalWin}
                betAmount={betAmount}
                onDismiss={dismissBigWin}
                turboEnabled={turboEnabled}
            />

            <GameInfoModal isOpen={!!showInfo} onClose={() => onCloseInfo?.()} />
        </motion.div>
    );
};

export default SlotsEngineWindow;
