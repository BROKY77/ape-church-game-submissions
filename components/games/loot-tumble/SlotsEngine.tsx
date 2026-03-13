"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { bytesToHex } from "viem";
import { toast } from "sonner";
import type { BonusMode } from "@/components/games/loot-tumble/types";
import type { Game } from "@/lib/games";
import { randomBytes } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import SlotsEngineWindow, { type SlotsEventPopup } from "./SlotsEngineWindow";
import SlotsEngineSetupCard from "./SlotsEngineSetupCard";
import { useSlotMachine, type RecordedSpin } from "@/components/games/loot-tumble/hooks/useSlotMachine";
import { useSessionStats } from "@/components/games/loot-tumble/hooks/useSessionStats";
import { useTurboMode } from "@/components/games/loot-tumble/hooks/useTurboMode";

interface SlotsEngineProps {
    game: Game;
}

const SlotsEngine: React.FC<SlotsEngineProps> = ({ game }) => {
    const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [numberOfSpins, setNumberOfSpins] = useState(10);
    const [currentSpinIndex, setCurrentSpinIndex] = useState(0);
    const [totalSessionBet, setTotalSessionBet] = useState(0);
    const [accumulatedWin, setAccumulatedWin] = useState(0);
    const [showInfo, setShowInfo] = useState(false);
    const [bonusTransitionActive, setBonusTransitionActive] = useState(false);
    const [visualMode, setVisualMode] = useState<BonusMode>("BASE");
    const [bonusTransitionDirection, setBonusTransitionDirection] = useState<"ENTER" | "EXIT" | null>(null);
    const [eventPopup, setEventPopup] = useState<SlotsEventPopup | null>(null);
    const [replayActive, setReplayActive] = useState(false);
    const [replayPendingNext, setReplayPendingNext] = useState(false);
    const [musicMuted, setMusicMuted] = useState(false);
    const [sfxMuted, setSfxMuted] = useState(false);

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
    );

    const recordedSpinsRef = useRef<RecordedSpin[]>([]);
    const replayCursorRef = useRef(0);
    const replayActiveRef = useRef(false);
    replayActiveRef.current = replayActive;

    const { turboEnabled, speedMultiplier, toggleTurbo } = useTurboMode();
    const handleRecordedSpin = useCallback((recordedSpin: RecordedSpin) => {
        if (replayActiveRef.current) {
            return;
        }

        recordedSpinsRef.current.push(recordedSpin);
    }, []);
    const {
        gameState,
        spin,
        replaySpin,
        setBet,
        setSpinBetAmount,
        isSpinning,
        handleReset: resetMachine,
    } = useSlotMachine(speedMultiplier, { onSpinResolved: handleRecordedSpin });
    const { stats, recordSpin, resetStats } = useSessionStats();

    const betPerSpin = totalSessionBet / (numberOfSpins || 1);
    const spinsLeft = numberOfSpins - currentSpinIndex;
    const playAgainText = `Play Again (${numberOfSpins} Spins)`;

    const [autoSpinEnabled, setAutoSpinEnabled] = useState(false);
    const autoSpinRef = useRef(false);
    autoSpinRef.current = autoSpinEnabled;

    const prevStateRef = useRef(gameState.state);
    const prevBonusModeForTransitionRef = useRef(false);
    const prevBonusTransitionActiveRef = useRef(false);
    const wasSpinning = useRef(false);
    const autoSpinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const launchedSpinModeRef = useRef<BonusMode>("BASE");
    const bonusModeForTransition =
        gameState.mode === "BONUS" ||
        (launchedSpinModeRef.current === "BONUS" && gameState.state !== "IDLE");
    const pendingBonusEnter =
        !bonusTransitionActive &&
        gameState.state === "IDLE" &&
        gameState.mode === "BONUS" &&
        gameState.bonusSpinsRemaining > 0 &&
        visualMode !== "BONUS";
    const pendingBonusExit =
        !bonusTransitionActive &&
        gameState.state === "IDLE" &&
        visualMode === "BONUS" &&
        gameState.mode !== "BONUS" &&
        launchedSpinModeRef.current === "BONUS";
    const transitionLockActive = bonusTransitionActive || pendingBonusEnter || pendingBonusExit;
    const popupLockActive = eventPopup?.mode === "full";
    const bonusActive =
        visualMode === "BONUS" ||
        bonusTransitionDirection === "ENTER" ||
        bonusModeForTransition;
    const bonusPanelActive = visualMode === "BONUS";
    const interactionLockActive = transitionLockActive || popupLockActive;
    const controlsLocked = interactionLockActive || replayActive;
    const canAdvanceSpin = interactionLockActive
        ? false
        : gameState.mode === "BONUS"
            ? gameState.bonusSpinsRemaining > 0
            : currentSpinIndex < numberOfSpins;

    useEffect(() => {
        if (!eventPopup) {
            return;
        }

        const dismissDelay = eventPopup.mode === "full" ? 2000 : 1200;
        const timer = setTimeout(() => {
            setEventPopup((current) => current?.id === eventPopup.id ? null : current);
        }, dismissDelay);

        return () => clearTimeout(timer);
    }, [eventPopup]);

    useEffect(() => {
        if (popupLockActive || gameState.state !== "IDLE") {
            return;
        }

        const wasBonusModeForTransition = prevBonusModeForTransitionRef.current;

        if (bonusModeForTransition && !wasBonusModeForTransition && visualMode !== "BONUS") {
            setBonusTransitionDirection("ENTER");
            setBonusTransitionActive(true);
        }

        if (!bonusModeForTransition && wasBonusModeForTransition && visualMode === "BONUS") {
            setBonusTransitionDirection("EXIT");
            setBonusTransitionActive(true);
        }

        prevBonusModeForTransitionRef.current = bonusModeForTransition;
    }, [bonusModeForTransition, gameState.state, popupLockActive, visualMode]);

    const queueNextSpin = useCallback(() => {
        if (isSpinning || transitionLockActive || popupLockActive) return;

        const nextMode: BonusMode =
            gameState.mode === "BONUS" && gameState.bonusSpinsRemaining > 0 ? "BONUS" : "BASE";
        const hasBaseSpins = currentSpinIndex < numberOfSpins;
        const hasBonusSpins = nextMode === "BONUS" && gameState.bonusSpinsRemaining > 0;

        if (!hasBaseSpins && !hasBonusSpins) {
            return;
        }

        launchedSpinModeRef.current = nextMode;
        spin();
    }, [currentSpinIndex, gameState.bonusSpinsRemaining, gameState.mode, isSpinning, numberOfSpins, popupLockActive, spin, transitionLockActive]);

    useEffect(() => {
        const prev = prevStateRef.current;
        const curr = gameState.state;
        prevStateRef.current = curr;

        if (curr === "IDLE" && prev !== "IDLE" && wasSpinning.current) {
            wasSpinning.current = false;

            if (gameState.lastSpinFailed) {
                setAutoSpinEnabled(false);
                if (autoSpinTimerRef.current) {
                    clearTimeout(autoSpinTimerRef.current);
                    autoSpinTimerRef.current = null;
                }
                if (replayTimerRef.current) {
                    clearTimeout(replayTimerRef.current);
                    replayTimerRef.current = null;
                }
                setReplayActive(false);
                setReplayPendingNext(false);
                toast.error("Spin failed. Please try again.");
                return;
            }

            const launchedSpinMode = launchedSpinModeRef.current;
            const spinWin = gameState.totalWin;
            const wager = launchedSpinMode === "BONUS" ? 0 : betPerSpin;

            setAccumulatedWin(prevWin => prevWin + spinWin);
            if (!replayActiveRef.current) {
                recordSpin(wager, spinWin);
            }

            let nextBaseSpinIndex = currentSpinIndex;
            if (launchedSpinMode === "BASE") {
                nextBaseSpinIndex += 1;
                setCurrentSpinIndex(nextBaseSpinIndex);
            }

            if (gameState.awardedFreeSpins > 0) {
                setEventPopup({
                    id: Date.now(),
                    variant: launchedSpinMode === "BASE" ? "bonus-entry" : "bonus-retrigger",
                    title: launchedSpinMode === "BASE" ? "Bonus Round Unlocked" : "Scatter Retrigger",
                    message: `You got ${gameState.awardedFreeSpins} free spins`,
                    iconSrc: "/submissions/loot-tumble/Scatter Symbol.png",
                    mode: turboEnabled ? "compact" : "full",
                });
            }

            const noBaseSpinsLeft = nextBaseSpinIndex >= numberOfSpins;
            const hasBonusSpinsLeft = gameState.mode === "BONUS" && gameState.bonusSpinsRemaining > 0;

            if (replayActiveRef.current) {
                const nextReplayIndex = replayCursorRef.current + 1;
                const replayFinished = nextReplayIndex >= recordedSpinsRef.current.length;

                if (replayFinished) {
                    const finishingBonusRound = launchedSpinMode === "BONUS" && !hasBonusSpinsLeft;
                    const endDelayMs = finishingBonusRound
                        ? (turboEnabled ? 2400 : 3600)
                        : (spinWin > 0 || gameState.awardedFreeSpins > 0 ? 1500 : 800);

                    replayTimerRef.current = setTimeout(() => {
                        replayTimerRef.current = null;
                        setReplayActive(false);
                        setReplayPendingNext(false);
                        setCurrentView(2);
                        setGameOver(true);
                    }, endDelayMs);
                } else {
                    replayCursorRef.current = nextReplayIndex;
                    const delayMs = spinWin > 0 || gameState.awardedFreeSpins > 0 ? 900 : 450;
                    replayTimerRef.current = setTimeout(() => {
                        replayTimerRef.current = null;
                        setReplayPendingNext(true);
                    }, delayMs);
                }

                return;
            }

            if (!hasBonusSpinsLeft && noBaseSpinsLeft) {
                setAutoSpinEnabled(false);
                const finishingBonusRound = launchedSpinMode === "BONUS" && !hasBonusSpinsLeft;
                const endDelayMs = finishingBonusRound
                    ? (turboEnabled ? 2400 : 3600)
                    : (spinWin > 0 || gameState.awardedFreeSpins > 0 ? 1500 : 800);
                setTimeout(() => {
                    setCurrentView(2);
                    setGameOver(true);
                }, endDelayMs);
            } else if (autoSpinRef.current && !interactionLockActive) {
                const delayMs = spinWin > 0 || gameState.awardedFreeSpins > 0 ? 900 : 450;
                autoSpinTimerRef.current = setTimeout(() => {
                    autoSpinTimerRef.current = null;
                    queueNextSpin();
                }, delayMs);
            }
        }

        if (curr === "SPINNING" && prev === "IDLE") {
            wasSpinning.current = true;
        }
    }, [
        betPerSpin,
        currentSpinIndex,
        gameState.awardedFreeSpins,
        gameState.bonusSpinsRemaining,
        gameState.lastSpinFailed,
        gameState.mode,
        gameState.state,
        gameState.totalWin,
        interactionLockActive,
        numberOfSpins,
        queueNextSpin,
        recordSpin,
        turboEnabled,
    ]);

    useEffect(() => {
        const wasTransitionActive = prevBonusTransitionActiveRef.current;

        if (
            wasTransitionActive &&
            !interactionLockActive &&
            autoSpinRef.current &&
            gameState.state === "IDLE"
        ) {
            if (autoSpinTimerRef.current) {
                clearTimeout(autoSpinTimerRef.current);
            }

            autoSpinTimerRef.current = setTimeout(() => {
                autoSpinTimerRef.current = null;
                queueNextSpin();
            }, 500);
        }

        prevBonusTransitionActiveRef.current = interactionLockActive;
    }, [interactionLockActive, gameState.state, queueNextSpin]);

    useEffect(() => {
        if (
            !replayActive ||
            !replayPendingNext ||
            gameState.state !== "IDLE" ||
            transitionLockActive ||
            popupLockActive
        ) {
            return;
        }

        const nextRecordedSpin = recordedSpinsRef.current[replayCursorRef.current];
        if (!nextRecordedSpin) {
            setReplayPendingNext(false);
            setReplayActive(false);
            return;
        }

        setReplayPendingNext(false);
        launchedSpinModeRef.current = nextRecordedSpin.spinMode;
        replaySpin(nextRecordedSpin);
    }, [gameState.state, popupLockActive, replayActive, replayPendingNext, replaySpin, transitionLockActive]);

    useEffect(() => {
        return () => {
            if (autoSpinTimerRef.current) {
                clearTimeout(autoSpinTimerRef.current);
            }
            if (replayTimerRef.current) {
                clearTimeout(replayTimerRef.current);
            }
        };
    }, []);

    const handleAutoSpinToggle = useCallback((enabled: boolean) => {
        setAutoSpinEnabled(enabled);

        if (enabled && !isSpinning && canAdvanceSpin) {
            queueNextSpin();
        }

        if (!enabled && autoSpinTimerRef.current) {
            clearTimeout(autoSpinTimerRef.current);
            autoSpinTimerRef.current = null;
        }
    }, [canAdvanceSpin, isSpinning, queueNextSpin]);

    const playGame = useCallback(async () => {
        if (gameState.betAmount <= 0) {
            toast.error("Please set a bet amount");
            return;
        }

        if (gameState.balance < gameState.betAmount) {
            toast.error("Insufficient balance");
            return;
        }

        const nextBetPerSpin = gameState.betAmount / (numberOfSpins || 1);

        setSpinBetAmount(nextBetPerSpin);
        setIsLoading(true);
        setGameOver(false);
        setTotalSessionBet(gameState.betAmount);
        setCurrentSpinIndex(0);
        setAccumulatedWin(0);
        setAutoSpinEnabled(false);
        setBonusTransitionActive(false);
        setBonusTransitionDirection(null);
        setVisualMode("BASE");
        setEventPopup(null);
        setReplayActive(false);
        setReplayPendingNext(false);
        setShowInfo(false);
        recordedSpinsRef.current = [];
        replayCursorRef.current = 0;
        prevBonusModeForTransitionRef.current = false;
        prevBonusTransitionActiveRef.current = false;
        launchedSpinModeRef.current = "BASE";
        wasSpinning.current = false;
        if (replayTimerRef.current) {
            clearTimeout(replayTimerRef.current);
            replayTimerRef.current = null;
        }
        resetStats();
        resetMachine();

        setTimeout(() => {
            setIsLoading(false);
            setCurrentView(1);
        }, 500);
    }, [gameState.balance, gameState.betAmount, numberOfSpins, resetMachine, resetStats, setSpinBetAmount]);

    const handleStateAdvance = useCallback(() => {
        if (isSpinning || !canAdvanceSpin) return;
        queueNextSpin();
    }, [canAdvanceSpin, isSpinning, queueNextSpin]);

    const handleReset = useCallback(() => {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        setCurrentGameId(newGameId);
        setCurrentView(0);
        setGameOver(false);
        setIsLoading(false);
        setCurrentSpinIndex(0);
        setAccumulatedWin(0);
        setAutoSpinEnabled(false);
        setBonusTransitionActive(false);
        setBonusTransitionDirection(null);
        setVisualMode("BASE");
        setEventPopup(null);
        setReplayActive(false);
        setReplayPendingNext(false);
        setShowInfo(false);
        recordedSpinsRef.current = [];
        replayCursorRef.current = 0;
        prevBonusModeForTransitionRef.current = false;
        prevBonusTransitionActiveRef.current = false;
        launchedSpinModeRef.current = "BASE";
        wasSpinning.current = false;
        if (replayTimerRef.current) {
            clearTimeout(replayTimerRef.current);
            replayTimerRef.current = null;
        }
        resetMachine();
        resetStats();
    }, [resetMachine, resetStats]);

    const handlePlayAgain = useCallback(async () => {
        handleReset();
        setTimeout(async () => {
            await playGame();
        }, 100);
    }, [handleReset, playGame]);

    const handleVisualModeSwap = useCallback((nextMode: BonusMode) => {
        setVisualMode(nextMode);
    }, []);

    const handleBonusTransitionComplete = useCallback(() => {
        setBonusTransitionActive(false);
        setBonusTransitionDirection(null);
    }, []);

    const handleDismissEventPopup = useCallback(() => {
        setEventPopup(null);
    }, []);

    const handleRewatch = useCallback(() => {
        if (recordedSpinsRef.current.length === 0) {
            toast.error("No finished session is available to rewatch.");
            return;
        }

        if (autoSpinTimerRef.current) {
            clearTimeout(autoSpinTimerRef.current);
            autoSpinTimerRef.current = null;
        }
        if (replayTimerRef.current) {
            clearTimeout(replayTimerRef.current);
            replayTimerRef.current = null;
        }

        setCurrentView(1);
        setGameOver(false);
        setCurrentSpinIndex(0);
        setAccumulatedWin(0);
        setAutoSpinEnabled(false);
        setBonusTransitionActive(false);
        setBonusTransitionDirection(null);
        setVisualMode("BASE");
        setEventPopup(null);
        setReplayActive(true);
        setReplayPendingNext(false);
        setShowInfo(false);
        replayCursorRef.current = 0;
        prevBonusModeForTransitionRef.current = false;
        prevBonusTransitionActiveRef.current = false;
        launchedSpinModeRef.current = "BASE";
        wasSpinning.current = false;
        resetMachine();

        replayTimerRef.current = setTimeout(() => {
            replayTimerRef.current = null;
            setReplayPendingNext(true);
        }, 150);
    }, [resetMachine]);

    const payout = accumulatedWin;
    const shouldShowPNL = accumulatedWin > totalSessionBet;
    return (
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
            <GameWindow
                game={game}
                currentGameId={currentGameId}
                isLoading={isLoading}
                isGameFinished={gameOver}
                onPlayAgain={handlePlayAgain}
                playAgainText={playAgainText}
                onRewatch={handleRewatch}
                onReset={handleReset}
                betAmount={totalSessionBet}
                payout={payout}
                inReplayMode={replayActive}
                isUserOriginalPlayer={true}
                showPNL={shouldShowPNL}
                isGamePaused={false}
                onMusicMutedChange={setMusicMuted}
                onSfxMutedChange={setSfxMuted}
            >
                <SlotsEngineWindow
                    gameState={gameState}
                    betAmount={betPerSpin}
                    isGameActive={currentView === 1}
                    isLobbyView={currentView === 0}
                    turboEnabled={turboEnabled}
                    autoSpinEnabled={autoSpinEnabled}
                    bonusActive={bonusActive}
                    visualMode={visualMode}
                    bonusTransitionActive={bonusTransitionActive}
                    bonusTransitionDirection={bonusTransitionDirection}
                    bonusSpinsRemaining={gameState.bonusSpinsRemaining}
                    onVisualModeSwap={handleVisualModeSwap}
                    onBonusTransitionComplete={handleBonusTransitionComplete}
                    onIntroComplete={() => undefined}
                    showInfo={showInfo}
                    onOpenInfo={() => setShowInfo(true)}
                    onCloseInfo={() => setShowInfo(false)}
                    eventPopup={eventPopup}
                    onDismissEventPopup={handleDismissEventPopup}
                    sfxMuted={sfxMuted}
                />
            </GameWindow>

            <SlotsEngineSetupCard
                game={game}
                onPlay={playGame}
                onSpin={handleStateAdvance}
                onRewatch={handleRewatch}
                onReset={handleReset}
                onPlayAgain={handlePlayAgain}
                playAgainText={playAgainText}
                currentView={currentView}
                betAmount={gameState.betAmount}
                setBetAmount={setBet}
                numberOfSpins={numberOfSpins}
                setNumberOfSpins={setNumberOfSpins}
                spinsLeft={spinsLeft}
                isLoading={isLoading}
                isSpinning={isSpinning}
                totalWin={accumulatedWin}
                walletBalance={gameState.balance}
                stats={stats}
                turboMode={turboEnabled}
                toggleTurbo={toggleTurbo}
                isGamePaused={controlsLocked}
                autoSpinEnabled={autoSpinEnabled}
                onAutoSpinToggle={handleAutoSpinToggle}
                onShowInfo={() => setShowInfo(true)}
                bonusActive={bonusPanelActive}
                bonusSpinsRemaining={gameState.bonusSpinsRemaining}
            />
        </div>
    );
};

export default SlotsEngine;

