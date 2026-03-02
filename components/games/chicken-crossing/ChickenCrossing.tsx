"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { Howl } from "howler";
import { bytesToHex } from "viem";
import { toast } from "sonner";
import { randomBytes } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import ChickenCrossingWindow from "./ChickenCrossingWindow";
import ChickenCrossingSetupCard from "./ChickenCrossingSetupCard";
import {
    chickenGame,
    Difficulty,
    getDifficultyFinishLane,
    getDifficultyMaxSafeLanes,
    getChickenMultiplier,
    resolveMaxSafeLanes,
} from "./chickenGameConfig";

type RoundOutcome = "crash" | "cashout" | "finish";
type CrashCause = "vehicle" | "trap";

type RoundSnapshot = {
    gameId: bigint;
    betAmount: number;
    difficulty: Difficulty;
    maxSafeLanes: number;
    finalLane: number;
    payoutLane: number;
    payout: number;
    outcome: RoundOutcome;
    crashCause: CrashCause | null;
};

const START_DELAY_MS = 450;
const JUMP_MS = 400;
const ROUND_END_MS = 900;
const REWATCH_STEP_MS = 420;
const AUTO_JUMP_DELAY_MS = 140;
const LANDING_COLLISION_SAMPLE_DELAY_MS = 24;
const CHICKEN_AMBIENCE_LOOP_SRC = "/submissions/chicken-crossing/audio/chicken-street-sound.mp3";
const CHICKEN_MUSIC_LOOP_SRC = "/submissions/chicken-crossing/audio/chicken-street-music.mp3";
const CHICKEN_JUMP_SFX_SRC = "/submissions/chicken-crossing/audio/jump.mp3";
const CHICKEN_DEATH_SFX_SRC = "/submissions/chicken-crossing/audio/death.mp3";
const CHICKEN_SEWER_LID_SFX_SRC = "/submissions/chicken-crossing/audio/sewer-lid.mp3";
const CHICKEN_BARRIER_CRASH_SFX_SRC = "/submissions/chicken-crossing/audio/car-crash.mp3";
const CHICKEN_AMBIENCE_VOLUME = 0.5;
const CHICKEN_MUSIC_VOLUME = 0.3;
const CHICKEN_JUMP_SFX_VOLUME = 0.45;
const CHICKEN_DEATH_SFX_VOLUME = 0.6;
const CHICKEN_SEWER_LID_SFX_VOLUME = 0.55;
const CHICKEN_BARRIER_CRASH_SFX_VOLUME = 0.45;
const TRAP_REVEAL_MS = 140;
const UNSAFE_VEHICLE_STRIKE_REVEAL_MS = 180;
const hashString32 = (value: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const resolveCrashCause = (
    gameId: bigint,
    laneIndex: number,
    difficulty: Difficulty
): CrashCause => {
    // Seeded per round/lane outcome for replayability without obvious visible timing patterns.
    const seed = `${gameId.toString(16)}:${difficulty}:${laneIndex}:crash-presentation`;
    const hash = hashString32(seed);
    return (hash & 1) === 0 ? "vehicle" : "trap";
};

const makeRandomGameId = (): bigint => {
    return BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
};

const ChickenCrossing: React.FC = () => {
    const game = chickenGame;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");

    const walletBalance = 100; // Mock balance
    const minBet = 1;
    const maxBet = 1000;

    const [isGameOngoing, setIsGameOngoing] = useState<boolean>(false);
    const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);

    const [betAmount, setBetAmount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [payout, setPayout] = useState<number | null>(null);

    const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
    const [currentLane, setCurrentLane] = useState<number>(0);
    const [maxSafeLanes, setMaxSafeLanes] = useState<number>(0);
    const [cashedOut, setCashedOut] = useState<boolean>(false);
    const [crashed, setCrashed] = useState<boolean>(false);
    const [isJumping, setIsJumping] = useState<boolean>(false);
    const [pendingTrapLane, setPendingTrapLane] = useState<number | null>(null);
    const [crashCause, setCrashCause] = useState<CrashCause | null>(null);
    const [pendingCrashCause, setPendingCrashCause] = useState<CrashCause | null>(null);
    const [pendingUnsafeVehicleStrikeLane, setPendingUnsafeVehicleStrikeLane] = useState<number | null>(null);
    const [autoJumpEnabled, setAutoJumpEnabled] = useState<boolean>(false);
    const [isRewatching, setIsRewatching] = useState<boolean>(false);

    const [lastRound, setLastRound] = useState<RoundSnapshot | null>(null);
    const [currentGameId, setCurrentGameId] = useState<bigint>(() => {
        if (replayIdString == null) {
            return makeRandomGameId();
        }

        try {
            return BigInt(replayIdString);
        } catch {
            return makeRandomGameId();
        }
    });

    const timeoutIdsRef = useRef<number[]>([]);
    const rewatchIntervalRef = useRef<number | null>(null);
    const autoJumpTimeoutRef = useRef<number | null>(null);
    const vehicleHitProbeRef = useRef<(laneIndex: number) => boolean | null>(() => null);
    const vehicleCollisionProbeRef = useRef<(laneIndex: number) => boolean | null>(() => null);
    const ambienceLoopRef = useRef<Howl | null>(null);
    const musicLoopRef = useRef<Howl | null>(null);
    const jumpSfxRef = useRef<Howl | null>(null);
    const deathSfxRef = useRef<Howl | null>(null);
    const sewerLidSfxRef = useRef<Howl | null>(null);
    const barrierCrashSfxRef = useRef<Howl | null>(null);
    const [musicMuted, setMusicMuted] = useState(false);
    const [sfxMuted, setSfxMuted] = useState(false);

    const setVehicleHitProbe = useCallback(
        (probe: (laneIndex: number) => boolean | null) => {
            vehicleHitProbeRef.current = probe;
        },
        []
    );
    const setVehicleCollisionProbe = useCallback(
        (probe: (laneIndex: number) => boolean | null) => {
            vehicleCollisionProbeRef.current = probe;
        },
        []
    );
    const toggleMusicMuted = useCallback(() => {
        setMusicMuted((prev) => !prev);
    }, []);

    const toggleSfxMuted = useCallback(() => {
        setSfxMuted((prev) => !prev);
    }, []);

    const toggleAutoJumpEnabled = useCallback(() => {
        setAutoJumpEnabled((prev) => !prev);
    }, []);

    const clearAutoJumpTimeout = useCallback(() => {
        if (autoJumpTimeoutRef.current !== null) {
            window.clearTimeout(autoJumpTimeoutRef.current);
            autoJumpTimeoutRef.current = null;
        }
    }, []);

    const clearScheduledWork = useCallback(() => {
        timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
        timeoutIdsRef.current = [];

        if (rewatchIntervalRef.current !== null) {
            window.clearInterval(rewatchIntervalRef.current);
            rewatchIntervalRef.current = null;
        }

        if (autoJumpTimeoutRef.current !== null) {
            window.clearTimeout(autoJumpTimeoutRef.current);
            autoJumpTimeoutRef.current = null;
        }
    }, []);

    const scheduleTimeout = useCallback((fn: () => void, delayMs: number) => {
        const id = window.setTimeout(() => {
            timeoutIdsRef.current = timeoutIdsRef.current.filter((value) => value !== id);
            fn();
        }, delayMs);

        timeoutIdsRef.current.push(id);
        return id;
    }, []);

    useEffect(() => {
        return () => {
            clearScheduledWork();
        };
    }, [clearScheduledWork]);

    const tryResumeLoopAudio = useCallback(() => {
        if (musicMuted) {
            return;
        }

        [ambienceLoopRef.current, musicLoopRef.current].forEach((audio) => {
            if (!audio) return;

            try {
                if (!audio.playing()) {
                    audio.play();
                }
            } catch {
                // Autoplay can fail until user interaction; we retry on future interactions.
            }
        });
    }, [musicMuted]);

    const playJumpSfx = useCallback(() => {
        if (sfxMuted) {
            return;
        }

        const jumpSfx = jumpSfxRef.current;
        if (!jumpSfx) {
            return;
        }

        try {
            jumpSfx.stop();
            jumpSfx.play();
        } catch {
            // Browser may block audio before interaction. User interaction retries will unlock it.
        }
    }, [sfxMuted]);

    const playDeathSfx = useCallback(() => {
        if (sfxMuted) {
            return;
        }

        const deathSfx = deathSfxRef.current;
        if (!deathSfx) {
            return;
        }

        try {
            deathSfx.stop();
            deathSfx.play();
        } catch {
            // Browser may block audio before interaction. User interaction retries will unlock it.
        }
    }, [sfxMuted]);

    const playSewerLidSfx = useCallback(() => {
        if (sfxMuted) {
            return;
        }

        const sewerLidSfx = sewerLidSfxRef.current;
        if (!sewerLidSfx) {
            return;
        }

        try {
            sewerLidSfx.stop();
            sewerLidSfx.play();
        } catch {
            // Browser may block audio before interaction.
        }
    }, [sfxMuted]);

    const playBarrierCrashSfx = useCallback(() => {
        if (sfxMuted) {
            return;
        }

        const barrierCrashSfx = barrierCrashSfxRef.current;
        if (!barrierCrashSfx) {
            return;
        }

        try {
            barrierCrashSfx.stop();
            barrierCrashSfx.play();
        } catch {
            // Browser may block audio before interaction.
        }
    }, [sfxMuted]);

    useEffect(() => {
        const ambience = new Howl({
            src: [CHICKEN_AMBIENCE_LOOP_SRC],
            loop: true,
            volume: CHICKEN_AMBIENCE_VOLUME,
            mute: false,
            html5: true,
        });

        const music = new Howl({
            src: [CHICKEN_MUSIC_LOOP_SRC],
            loop: true,
            volume: CHICKEN_MUSIC_VOLUME,
            mute: false,
            html5: true,
        });
        const jumpSfx = new Howl({
            src: [CHICKEN_JUMP_SFX_SRC],
            volume: CHICKEN_JUMP_SFX_VOLUME,
            mute: false,
            preload: true,
        });
        const deathSfx = new Howl({
            src: [CHICKEN_DEATH_SFX_SRC],
            volume: CHICKEN_DEATH_SFX_VOLUME,
            mute: false,
            preload: true,
        });
        const sewerLidSfx = new Howl({
            src: [CHICKEN_SEWER_LID_SFX_SRC],
            volume: CHICKEN_SEWER_LID_SFX_VOLUME,
            mute: false,
            preload: true,
        });
        const barrierCrashSfx = new Howl({
            src: [CHICKEN_BARRIER_CRASH_SFX_SRC],
            volume: CHICKEN_BARRIER_CRASH_SFX_VOLUME,
            mute: false,
            preload: true,
        });

        ambienceLoopRef.current = ambience;
        musicLoopRef.current = music;
        jumpSfxRef.current = jumpSfx;
        deathSfxRef.current = deathSfx;
        sewerLidSfxRef.current = sewerLidSfx;
        barrierCrashSfxRef.current = barrierCrashSfx;

        try {
            ambience.play();
            music.play();
        } catch {
            // Autoplay may fail until user interaction.
        }

        return () => {
            ambience.unload();
            music.unload();
            jumpSfx.unload();
            deathSfx.unload();
            sewerLidSfx.unload();
            barrierCrashSfx.unload();
            ambienceLoopRef.current = null;
            musicLoopRef.current = null;
            jumpSfxRef.current = null;
            deathSfxRef.current = null;
            sewerLidSfxRef.current = null;
            barrierCrashSfxRef.current = null;
        };
    }, []);

    useEffect(() => {
        const loopAudios = [ambienceLoopRef.current, musicLoopRef.current];
        const sfxAudios = [
            jumpSfxRef.current,
            deathSfxRef.current,
            sewerLidSfxRef.current,
            barrierCrashSfxRef.current,
        ];

        loopAudios.forEach((audio) => {
            if (!audio) return;

            audio.mute(musicMuted);

            if (!musicMuted) {
                try {
                    if (!audio.playing()) {
                        audio.play();
                    }
                } catch {
                    // Will retry on user interaction.
                }
            }
        });

        sfxAudios.forEach((audio) => {
            if (!audio) return;
            audio.mute(sfxMuted);
        });
    }, [musicMuted, sfxMuted]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const muteButton = target?.closest(
                'button[title="Mute sound"], button[title="Unmute sound"]'
            );

            if (muteButton) {
                const nextMuted = !(musicMuted && sfxMuted);
                setMusicMuted(nextMuted);
                setSfxMuted(nextMuted);
                return;
            }

            tryResumeLoopAudio();
        };

        const handleDocumentKeydown = () => {
            tryResumeLoopAudio();
        };

        document.addEventListener("click", handleDocumentClick, true);
        document.addEventListener("keydown", handleDocumentKeydown, true);

        return () => {
            document.removeEventListener("click", handleDocumentClick, true);
            document.removeEventListener("keydown", handleDocumentKeydown, true);
        };
    }, [musicMuted, sfxMuted, tryResumeLoopAudio]);

    const difficultyMaxSafeLanes = getDifficultyMaxSafeLanes(difficulty);
    const difficultyFinishLane = getDifficultyFinishLane(difficulty);
    const multiplierLane = Math.min(currentLane, difficultyMaxSafeLanes);
    const currentMultiplier = getChickenMultiplier(multiplierLane, difficulty);
    const shouldShowPNL = payout !== null && payout > betAmount;
    const playAgainText = "Play Again";

    const finalizeRound = useCallback(
        (snapshot: RoundSnapshot) => {
            clearScheduledWork();

            setLastRound(snapshot);
            setCurrentLane(snapshot.finalLane);
            setIsJumping(false);
            setIsLoading(false);
            setIsRewatching(false);
            setPendingTrapLane(null);
            setPendingCrashCause(null);
            setPendingUnsafeVehicleStrikeLane(null);

            if (snapshot.outcome === "crash") {
                playDeathSfx();
                setCrashed(true);
                setCashedOut(false);
                setPayout(0);
                setCrashCause(snapshot.crashCause);
            } else {
                setCrashed(false);
                setCashedOut(true);
                setPayout(snapshot.payout);
                setCrashCause(null);
            }

            scheduleTimeout(() => {
                setCurrentView(2);
                setIsGameOngoing(false);
            }, ROUND_END_MS);
        },
        [clearScheduledWork, playDeathSfx, scheduleTimeout]
    );

    const playGame = useCallback(
        async (gameId?: bigint) => {
            const betCap = Math.min(walletBalance, maxBet);

            if (betAmount < minBet) {
                toast.error(`Bet must be at least ${minBet}.`);
                return;
            }

            if (betAmount > betCap) {
                toast.error(`Bet exceeds the allowed max of ${betCap}.`);
                return;
            }

            clearScheduledWork();

            const nextGameId = gameId ?? currentGameId;
            const nextSafeLanes = resolveMaxSafeLanes(nextGameId, difficulty);

            setCurrentGameId(nextGameId);
            setIsLoading(true);
            setIsGameOngoing(true);
            setIsRewatching(false);
            setCurrentLane(0);
            setMaxSafeLanes(0);
            setCashedOut(false);
            setCrashed(false);
            setIsJumping(false);
            setPendingTrapLane(null);
            setPendingCrashCause(null);
            setPendingUnsafeVehicleStrikeLane(null);
            setCrashCause(null);
            setPayout(null);

            scheduleTimeout(() => {
                setMaxSafeLanes(nextSafeLanes);
                setCurrentLane(0);
                setCurrentView(1);
                setIsLoading(false);
                toast.success("Game started. Jump carefully.");
            }, START_DELAY_MS);
        },
        [
            betAmount,
            clearScheduledWork,
            currentGameId,
            difficulty,
            maxBet,
            minBet,
            scheduleTimeout,
            walletBalance,
        ]
    );

    const settleCashout = useCallback(
        (
            displayLane: number,
            payoutLane: number,
            outcome: RoundOutcome = "cashout"
        ) => {
            const safePayoutLane = Math.min(Math.max(0, payoutLane), difficultyMaxSafeLanes);
            const finalMulti = getChickenMultiplier(safePayoutLane, difficulty);
            const wonAmount = Number((betAmount * finalMulti).toFixed(3));

            finalizeRound({
                gameId: currentGameId,
                betAmount,
                difficulty,
                maxSafeLanes,
                finalLane: displayLane,
                payoutLane: safePayoutLane,
                payout: wonAmount,
                outcome,
                crashCause: null,
            });
        },
        [betAmount, currentGameId, difficulty, difficultyMaxSafeLanes, finalizeRound, maxSafeLanes]
    );

    const handleJump = useCallback(() => {
        clearAutoJumpTimeout();

        if (isLoading || isJumping || currentView !== 1 || crashed || cashedOut) {
            return;
        }

        const nextLane = currentLane + 1;
        const isTrafficLane = nextLane > 0 && nextLane < difficultyFinishLane;
        const willCrash =
            nextLane > maxSafeLanes && nextLane <= difficultyMaxSafeLanes;
        const jumpStartVehicleCollisionHit =
            isTrafficLane && vehicleCollisionProbeRef.current(nextLane) === true;
        const shouldPreFlagSafeLaneVehicleCollision =
            nextLane <= maxSafeLanes && jumpStartVehicleCollisionHit;

        playJumpSfx();
        setIsJumping(true);
        setCurrentLane(nextLane);
        setPendingCrashCause(shouldPreFlagSafeLaneVehicleCollision ? "vehicle" : null);
        setPendingTrapLane(null);

        scheduleTimeout(() => {
            setIsJumping(false);

            scheduleTimeout(() => {
                const landingVehicleCollisionHit =
                    isTrafficLane && vehicleCollisionProbeRef.current(nextLane) === true;
                const forcedVehicleCollision =
                    isTrafficLane &&
                    nextLane <= maxSafeLanes &&
                    landingVehicleCollisionHit;

                if (forcedVehicleCollision) {
                    setPendingTrapLane(null);
                    setPendingCrashCause("vehicle");
                    finalizeRound({
                        gameId: currentGameId,
                        betAmount,
                        difficulty,
                        maxSafeLanes,
                        finalLane: nextLane,
                        payoutLane: nextLane,
                        payout: 0,
                        outcome: "crash",
                        crashCause: "vehicle",
                    });
                    return;
                }

                if (willCrash) {
                    const strictVisualVehicleHit = vehicleCollisionProbeRef.current(nextLane);
                    const touchedVehicleDuringJump =
                        jumpStartVehicleCollisionHit || strictVisualVehicleHit === true;
                    const landingCrashCause = touchedVehicleDuringJump
                        ? "vehicle"
                        : resolveCrashCause(currentGameId, nextLane, difficulty);

                    setPendingCrashCause(landingCrashCause);

                    if (landingCrashCause === "trap") {
                        setPendingTrapLane(nextLane);
                        setPendingUnsafeVehicleStrikeLane(null);
                        playSewerLidSfx();
                        scheduleTimeout(() => {
                            finalizeRound({
                                gameId: currentGameId,
                                betAmount,
                                difficulty,
                                maxSafeLanes,
                                finalLane: nextLane,
                                payoutLane: nextLane,
                                payout: 0,
                                outcome: "crash",
                                crashCause: "trap",
                            });
                        }, TRAP_REVEAL_MS);
                        return;
                    }

                    setPendingTrapLane(null);
                    if (!touchedVehicleDuringJump) {
                        setPendingUnsafeVehicleStrikeLane(nextLane);
                        scheduleTimeout(() => {
                            finalizeRound({
                                gameId: currentGameId,
                                betAmount,
                                difficulty,
                                maxSafeLanes,
                                finalLane: nextLane,
                                payoutLane: nextLane,
                                payout: 0,
                                outcome: "crash",
                                crashCause: "vehicle",
                            });
                        }, UNSAFE_VEHICLE_STRIKE_REVEAL_MS);
                        return;
                    }
                    setPendingUnsafeVehicleStrikeLane(null);
                    finalizeRound({
                        gameId: currentGameId,
                        betAmount,
                        difficulty,
                        maxSafeLanes,
                        finalLane: nextLane,
                        payoutLane: nextLane,
                        payout: 0,
                        outcome: "crash",
                        crashCause: "vehicle",
                    });
                    return;
                }

                if (nextLane >= difficultyFinishLane) {
                    setPendingUnsafeVehicleStrikeLane(null);
                    settleCashout(difficultyFinishLane, difficultyMaxSafeLanes, "finish");
                    return;
                }

                setPendingTrapLane(null);
                setPendingCrashCause(null);
                setPendingUnsafeVehicleStrikeLane(null);
            }, LANDING_COLLISION_SAMPLE_DELAY_MS);
        }, JUMP_MS);
    }, [
        betAmount,
        cashedOut,
        crashed,
        currentGameId,
        currentLane,
        currentView,
        clearAutoJumpTimeout,
        difficulty,
        difficultyFinishLane,
        difficultyMaxSafeLanes,
        finalizeRound,
        isJumping,
        isLoading,
        maxSafeLanes,
        playJumpSfx,
        playSewerLidSfx,
        scheduleTimeout,
        settleCashout,
    ]);

    useEffect(() => {
        clearAutoJumpTimeout();

        const canAutoJump =
            autoJumpEnabled &&
            !isRewatching &&
            currentView === 1 &&
            isGameOngoing &&
            !isLoading &&
            !isJumping &&
            !crashed &&
            !cashedOut;

        if (!canAutoJump) {
            return;
        }

        autoJumpTimeoutRef.current = window.setTimeout(() => {
            autoJumpTimeoutRef.current = null;
            handleJump();
        }, AUTO_JUMP_DELAY_MS);

        return () => {
            clearAutoJumpTimeout();
        };
    }, [
        autoJumpEnabled,
        cashedOut,
        clearAutoJumpTimeout,
        crashed,
        currentView,
        handleJump,
        isGameOngoing,
        isJumping,
        isLoading,
        isRewatching,
    ]);

    const handleCashOut = useCallback(() => {
        if (
            isLoading ||
            isJumping ||
            currentView !== 1 ||
            crashed ||
            cashedOut ||
            currentLane <= 0
        ) {
            return;
        }

        settleCashout(currentLane, currentLane, "cashout");
        setPendingTrapLane(null);
        setPendingCrashCause(null);
    }, [
        cashedOut,
        crashed,
        currentLane,
        currentView,
        isJumping,
        isLoading,
        settleCashout,
    ]);

    const handleReset = useCallback(
        (isPlayingAgain = false) => {
            clearScheduledWork();

            if (!isPlayingAgain) {
                setCurrentGameId(makeRandomGameId());
            }

            setCurrentView(0);
            setIsGameOngoing(false);
            setIsRewatching(false);
            setIsLoading(false);
            setPayout(null);
            setCurrentLane(0);
            setMaxSafeLanes(0);
            setCrashed(false);
            setCashedOut(false);
            setIsJumping(false);
            setPendingTrapLane(null);
            setPendingCrashCause(null);
            setCrashCause(null);

            if (replayIdString !== null) {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("id");
                const nextQuery = params.toString();
                router.replace(nextQuery ? `?${nextQuery}` : "/", { scroll: false });
            }
        },
        [clearScheduledWork, replayIdString, router, searchParams]
    );

    const handlePlayAgain = useCallback(async () => {
        const newGameId = makeRandomGameId();
        setCurrentGameId(newGameId);
        handleReset(true);
        await playGame(newGameId);
    }, [handleReset, playGame]);

    const handleRewatch = useCallback(() => {
        if (lastRound === null) {
            toast.info("No round available to rewatch yet.");
            return;
        }

        clearScheduledWork();

        setCurrentGameId(lastRound.gameId);
        setBetAmount(lastRound.betAmount);
        setDifficulty(lastRound.difficulty);
        setMaxSafeLanes(lastRound.maxSafeLanes);

        setCurrentView(1);
        setIsGameOngoing(true);
        setIsRewatching(true);
        setIsLoading(false);
        setCurrentLane(0);
        setCrashed(false);
        setCashedOut(false);
        setIsJumping(false);
        setPendingTrapLane(null);
        setPendingCrashCause(null);
        setPendingUnsafeVehicleStrikeLane(null);
        setCrashCause(null);
        setPayout(null);

        let lane = 0;
        const targetLane = lastRound.finalLane;

        if (targetLane <= 0) {
            finalizeRound(lastRound);
            return;
        }

        rewatchIntervalRef.current = window.setInterval(() => {
            lane += 1;
            playJumpSfx();
            const isSafeLaneVehicleCrashReplay =
                lane === targetLane &&
                lastRound.outcome === "crash" &&
                lastRound.crashCause === "vehicle" &&
                lane <= lastRound.maxSafeLanes;

            if (isSafeLaneVehicleCrashReplay) {
                setPendingCrashCause("vehicle");
                setPendingTrapLane(null);
            }
            setIsJumping(true);
            setCurrentLane(lane);

            if (lane >= targetLane) {
                if (rewatchIntervalRef.current !== null) {
                    window.clearInterval(rewatchIntervalRef.current);
                    rewatchIntervalRef.current = null;
                }

                scheduleTimeout(() => {
                    finalizeRound(lastRound);
                }, JUMP_MS);
                return;
            }

            scheduleTimeout(() => {
                setIsJumping(false);
            }, Math.max(120, Math.min(JUMP_MS, REWATCH_STEP_MS - 20)));
        }, REWATCH_STEP_MS);
    }, [clearScheduledWork, finalizeRound, lastRound, playJumpSfx, scheduleTimeout]);

    return (
        <div>
            <div className="flex flex-col gap-4 sm:gap-8 lg:flex-row lg:gap-10">
                <GameWindow
                    game={game}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={currentView === 2}
                    onPlayAgain={handlePlayAgain}
                    playAgainText={playAgainText}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={betAmount}
                    payout={payout}
                    inReplayMode={isRewatching}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                >
                    <ChickenCrossingWindow
                        currentLane={currentLane}
                        maxSafeLanes={maxSafeLanes}
                        difficultyMaxSafeLanes={difficultyMaxSafeLanes}
                        finishLane={difficultyFinishLane}
                        cashedOut={cashedOut}
                        crashed={crashed}
                        isJumping={isJumping}
                        pendingTrapLane={pendingTrapLane}
                        crashCause={crashCause}
                        pendingCrashCause={pendingCrashCause}
                        pendingUnsafeVehicleStrikeLane={pendingUnsafeVehicleStrikeLane}
                        difficulty={difficulty}
                        isGameOngoing={isGameOngoing}
                        onAdvanceLane={handleJump}
                        setVehicleHitProbe={setVehicleHitProbe}
                        setVehicleCollisionProbe={setVehicleCollisionProbe}
                        onBarrierCrashImpact={playBarrierCrashSfx}
                    />
                </GameWindow>

                <ChickenCrossingSetupCard
                    game={game}
                    onPlay={() => void playGame()}
                    onJump={handleJump}
                    onCashOut={handleCashOut}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={() => void handlePlayAgain()}
                    playAgainText={playAgainText}
                    currentView={currentView}
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                    isLoading={isLoading}
                    payout={payout}
                    currentMultiplier={currentMultiplier}
                    isJumping={isJumping}
                    inReplayMode={isRewatching}
                    walletBalance={walletBalance}
                    isGamePaused={false}
                    minBet={minBet}
                    maxBet={maxBet}
                    difficultyMaxSafeLanes={difficultyMaxSafeLanes}
                    finishLane={difficultyFinishLane}
                    autoJumpEnabled={autoJumpEnabled}
                    onToggleAutoJump={toggleAutoJumpEnabled}
                    musicMuted={musicMuted}
                    sfxMuted={sfxMuted}
                    onToggleMusicMuted={toggleMusicMuted}
                    onToggleSfxMuted={toggleSfxMuted}
                />
            </div>
        </div>
    );
};

export default ChickenCrossing;
