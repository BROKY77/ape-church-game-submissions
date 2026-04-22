"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import MyGameWindow from "./MyGameWindow";
import MyGameSetupCard from "./MyGameSetupCard";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import { myGame } from "./myGameConfig";

interface MyGameComponentProps {
    /** Omitted on `/submissions/...` preview routes; config supplies defaults. */
    game?: Game;
}

const MyGameComponent: React.FC<MyGameComponentProps> = ({ game }) => {
    const gameData = game ?? myGame;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");
    const walletBalance = 25;
    const [isGameOngoing, setIsGameOngoing] = React.useState<boolean>(false);
    const [currentView, setCurrentView] = React.useState<0 | 1 | 2>(0);

    const [betAmount, setBetAmount] = React.useState<number>(0);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [payout, setPayout] = React.useState<number | null>(null);
    const [gameOver, setGameOver] = React.useState<boolean>(false);

    const [currentMultiplier, setCurrentMultiplier] = React.useState<number>(0.50);
    const [crashPoint, setCrashPoint] = React.useState<number>(0.50);
    const [isClimbing, setIsClimbing] = React.useState<boolean>(false);
    const [hasCrashed, setHasCrashed] = React.useState<boolean>(false);
    const [hasCashedOut, setHasCashedOut] = React.useState<boolean>(false);
    const [cashedOutAt, setCashedOutAt] = React.useState<number | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const shouldShowPNL: boolean = !!payout && payout > 0;
    const playAgainText = "Play Again";

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        replayIdString == null
            ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
            : BigInt(replayIdString)
    );
    const [userRandomWord, setUserRandomWord] = useState<Hex>(
        bytesToHex(new Uint8Array(randomBytes(32)))
    );

    useEffect(() => {
        if (replayIdString !== null) {
            if (replayIdString.length > 2) {
                setIsLoading(true);
                setCurrentGameId(BigInt(replayIdString));
            }
        }
    }, [replayIdString]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const generateCrashPoint = (): number => {
        const rand = Math.random();
        if (rand < 0.50) return 1 + Math.random() * 1.0;
        if (rand < 0.80) return 1.5 + Math.random() * 2;
        if (rand < 0.95) return 2.5 + Math.random() * 5;
        return 7 + Math.random() * 43;
    };

    const playGame = async (
        gameId?: bigint,
        randomWord?: Hex,
    ) => {
        setIsLoading(true);
        setIsGameOngoing(true);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;

        try {
            const receiptSuccess = true;

            if (receiptSuccess) {
                toast.success("Transaction complete!");
                setTimeout(() => {
                    setIsLoading(false);
                    setCurrentView(1);
                    startGame();
                }, 1000);
            }
            else {
                console.error("Something went wrong..");
                toast.info("Something went wrong..");
                setIsLoading(false);
                setIsGameOngoing(false);
            }
        }
        catch (error) {
            if (
                (error instanceof Error &&
                    error.message.includes("Transaction not found")) ||
                (typeof error === "string" && error.includes("Transaction not found"))
            ) {
                console.warn("Ignoring a known timeout error.");
                return;
            }

            console.error("An unexpected error occurred:", error);
            toast.error("An unexpected error occurred.");
            setIsLoading(false);
            setIsGameOngoing(false);
        }
    };

    const startGame = () => {
        const crash = generateCrashPoint();
        setCrashPoint(crash);
        setCurrentMultiplier(0.50);
        setIsClimbing(true);
        setHasCrashed(false);
        setHasCashedOut(false);
        setCashedOutAt(null);

        let multiplier = 0.50;
        const increment = 0.01;
        const speed = 50;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            multiplier += increment;
            setCurrentMultiplier(Number(multiplier.toFixed(2)));

            if (multiplier >= crash) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                setIsClimbing(false);
                setHasCrashed(true);

                setTimeout(() => {
                    setCurrentView(2);
                    setGameOver(true);
                    setIsGameOngoing(false);
                    setPayout(0);
                }, 1500);
            }
        }, speed);
    };

    const handleCashOut = () => {
        if (!isClimbing || hasCashedOut || hasCrashed) return;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setIsClimbing(false);
        setHasCashedOut(true);
        setCashedOutAt(currentMultiplier);

        const winAmount = betAmount * currentMultiplier;
        setPayout(winAmount);

        setTimeout(() => {
            setCurrentView(2);
            setGameOver(true);
            setIsGameOngoing(false);
        }, 1500);
    };

    const handleReset = (isPlayingAgain: boolean = false) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (isPlayingAgain === false) {
            const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
            const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
            setCurrentGameId(newGameId);
            setUserRandomWord(newUserWord);
        }

        setCurrentView(0);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setCurrentMultiplier(0.50);
        setCrashPoint(0.50);
        setIsClimbing(false);
        setHasCrashed(false);
        setHasCashedOut(false);
        setCashedOutAt(null);

        if (replayIdString !== null) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("id");
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    };

    const handlePlayAgain = async () => {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));

        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);

        handleReset(true);

        await playGame(newGameId, newUserWord);
    };

    const handleRewatch = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setCurrentMultiplier(0.50);
        setIsClimbing(false);
        setHasCrashed(false);
        setHasCashedOut(false);
        setCashedOutAt(null);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setCurrentView(1);

        const savedCrashPoint = crashPoint;
        let multiplier = 0.50;
        const increment = 0.01;
        const speed = 50;

        intervalRef.current = setInterval(() => {
            multiplier += increment;
            setCurrentMultiplier(Number(multiplier.toFixed(2)));
            setIsClimbing(true);

            if (multiplier >= savedCrashPoint) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                setIsClimbing(false);
                setHasCrashed(true);

                setTimeout(() => {
                    setCurrentView(2);
                    setGameOver(true);
                    setIsGameOngoing(false);
                    setPayout(0);
                }, 1500);
            }
        }, speed);
    };

    return (
        <div>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
                <GameWindow
                    game={gameData}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={gameOver}
                    onPlayAgain={handlePlayAgain}
                    playAgainText={playAgainText}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={betAmount}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    resultModalDelayMs={1000}
                >
                    <MyGameWindow
                        game={gameData}
                        currentMultiplier={currentMultiplier}
                        isClimbing={isClimbing}
                        hasCrashed={hasCrashed}
                        hasCashedOut={hasCashedOut}
                        cashedOutAt={cashedOutAt}
                    />
                </GameWindow>

                <MyGameSetupCard
                    game={gameData}
                    onPlay={async () => await playGame()}
                    onCashOut={handleCashOut}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={async () => await handlePlayAgain()}
                    playAgainText={playAgainText}
                    currentView={currentView}
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    isLoading={isLoading}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    account={undefined}
                    walletBalance={walletBalance}
                    playerAddress={undefined}
                    isGamePaused={false}
                    profile={undefined}
                    minBet={1}
                    maxBet={100}
                    isClimbing={isClimbing}
                    hasCashedOut={hasCashedOut}
                    currentMultiplier={currentMultiplier}
                />
            </div>
        </div>
    );
};

export default MyGameComponent;
