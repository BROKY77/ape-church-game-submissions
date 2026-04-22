"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import FoxyShooterWindow from "./FoxyShooterWindow";
import FoxyShooterSetupCard from "./FoxyShooterSetupCard";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import { getMultiplier, type SelectedZones } from "./foxyShooterConstants";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, AudioLines } from "lucide-react";
import { Howl } from "howler";

// Animation phase for the soccer game flow
export type AnimationPhase =
    | "idle"             // Setup / waiting for bet
    | "kick-off"         // Ball appears at starting position
    | "shooting"         // Ball moves tile-by-tile toward goal
    | "result"           // Show goal scored or saved
    | "zoom-out"         // Camera zooms back out, field resets
    | "next-kick";       // Next ball appears for another shot

interface FoxyShooterComponentProps {
    game?: Game;
}

const FoxyShooterComponent: React.FC<FoxyShooterComponentProps> = ({ game }) => {
    // Default game object to satisfy child component requirements
    const defaultGame: Game = {
        title: "Foxy Shooter",
        description: "Can you score against Foxy the goalkeeper?",
        gameAddress: "",
        gameBackground: "/submissions/foxy-shooter/soccer-goal-bg.png",
        card: "/submissions/foxy-shooter/card.png",
        banner: "/submissions/foxy-shooter/banner.png",
        themeColorBackground: game?.themeColorBackground || "#1a1a1a",
        payouts: {},
    };
    
    const gameData = game || defaultGame;
    const themeColorBackground = gameData.themeColorBackground;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");
    const walletBalance = 25;
    const [isGameOngoing, setIsGameOngoing] = React.useState<boolean>(false);
    const [currentView, setCurrentView] = React.useState<0 | 1 | 2>(0);
    
    // Audio control state
    const [muteMusic, setMuteMusic] = useState(false); // Start unmuted for better user experience
    const [muteSfx, setMuteSfx] = useState(false);
    const [musicStarted, setMusicStarted] = useState(false);
    
    // Audio references
    const musicRef = useRef<Howl | null>(null);
    const diceSoundRef = useRef<Howl | null>(null);
    const kickSoundRef = useRef<Howl | null>(null);
    const chantSoundRef = useRef<Howl | null>(null);
    
    useEffect(() => {
        // Initialize music
        musicRef.current = new Howl({
            src: ['/submissions/foxy-shooter/audio/soccermusic.mp3'],
            loop: true,
            volume: 0.5,
            html5: true,
            onload: () => console.log('Music loaded successfully'),
            onloaderror: (id, error) => console.log('Music load error:', error),
        });
        
        // Initialize dice sound
        diceSoundRef.current = new Howl({
            src: ['/submissions/foxy-shooter/audio/soccerdice.mp3'],
            volume: 1.0,
            html5: true,
            onload: () => console.log('Dice sound loaded successfully'),
            onloaderror: (id, error) => console.log('Dice sound load error:', error),
        });
        
        // Initialize kick sound
        kickSoundRef.current = new Howl({
            src: ['/submissions/foxy-shooter/audio/soccerkick.mp3'],
            volume: 1.0,
            html5: true,
            onload: () => console.log('Kick sound loaded successfully'),
            onloaderror: (id, error) => console.log('Kick sound load error:', error),
        });

        // Initialize chant sound
        chantSoundRef.current = new Howl({
            src: ['/submissions/foxy-shooter/audio/soccerchant.mp3'],
            volume: 0.8,
            html5: true,
            onload: () => console.log('Chant sound loaded successfully'),
            onloaderror: (id, error) => console.log('Chant sound load error:', error),
        });
        
        return () => {
            if (musicRef.current) {
                musicRef.current.unload();
            }
            if (diceSoundRef.current) {
                diceSoundRef.current.unload();
            }
            if (kickSoundRef.current) {
                kickSoundRef.current.unload();
            }
            if (chantSoundRef.current) {
                chantSoundRef.current.unload();
            }
        };
    }, []);
    
    // Handle music mute/unmute and auto-play when entering game
    useEffect(() => {
        if (musicRef.current) {
            if (muteMusic) {
                musicRef.current.pause();
            } else {
                if (!musicStarted) {
                    musicRef.current.play();
                    setMusicStarted(true);
                }
            }
        }
    }, [muteMusic, musicStarted]);

    // Auto-start audio when game becomes active
    useEffect(() => {
        if (isGameOngoing && !musicStarted) {
            // Start music if game begins and music hasn't started yet
            musicRef.current?.play();
            setMusicStarted(true);
        }
    }, [isGameOngoing, musicStarted]);

    // Auto-start chant when entering game or when game becomes active
    useEffect(() => {
        if ((isGameOngoing || currentView === 0) && chantSoundRef.current && !muteSfx) {
            chantSoundRef.current.loop(true);
            chantSoundRef.current.play();
        }
    }, [isGameOngoing, currentView, muteSfx]);

    // Handle SFX mute/unmute
    useEffect(() => {
        if (diceSoundRef.current) {
            diceSoundRef.current.mute(muteSfx);
        }
        if (kickSoundRef.current) {
            kickSoundRef.current.mute(muteSfx);
        }
        if (chantSoundRef.current) {
            chantSoundRef.current.mute(muteSfx);
        }
    }, [muteSfx]);

    // Start continuous chant loop during betting and gameplay
    useEffect(() => {
        if (chantSoundRef.current && (isGameOngoing || currentView === 0) && !muteSfx) {
            chantSoundRef.current.loop(true);
            chantSoundRef.current.play();
        } else if (chantSoundRef.current && (!isGameOngoing && currentView !== 0) || muteSfx) {
            chantSoundRef.current?.stop();
        }
    }, [isGameOngoing, currentView, muteSfx]);
    
    // Foxy Shooter specific state
    const [betAmount, setBetAmount] = React.useState<number>(0);
    const [selectedZones, setSelectedZones] = React.useState<SelectedZones>(new Map());
    const [diceResult, setDiceResult] = React.useState<[number, number] | null>(null);
    const [rolledSum, setRolledSum] = React.useState<number | null>(null);
    const [isRolling, setIsRolling] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [payout, setPayout] = React.useState<number | null>(null);
    const [gameOver, setGameOver] = React.useState<boolean>(false);
    const [isWin, setIsWin] = React.useState<boolean>(false);
    const [numberOfRolls, setNumberOfRolls] = React.useState<number>(1);

    // Multi-roll session state
    const [currentRollIndex, setCurrentRollIndex] = React.useState<number>(0);
    const [sessionResults, setSessionResults] = React.useState<Array<{
        dice: [number, number];
        sum: number;
        won: boolean;
        payout: number;
    }>>([]);
    const [isMultiRollSession, setIsMultiRollSession] = React.useState<boolean>(false);
    const [sessionTotalPayout, setSessionTotalPayout] = React.useState<number>(0);

    // Animation phase state
    const [animationPhase, setAnimationPhase] = React.useState<AnimationPhase>("idle");
    // Current tile the balloon is on during "moving" phase (index into sorted selected zones path)
    const [balloonTileIndex, setBalloonTileIndex] = React.useState<number>(-1);

    const shouldShowPNL: boolean = !!payout && payout > 0 && payout > betAmount;
    const playAgainText = "Defend Again!";

    // Game ID and Random Word
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

    // HELPER: distribute bet evenly across selected zones
    // Always return selected zones for visual display, even if bet is 0
    const getZoneBets = useCallback((): SelectedZones => {
        if (selectedZones.size === 0) return new Map();
        const perZone = betAmount > 0 ? betAmount / selectedZones.size : 0;
        const zones = new Map<number, number>();
        for (const sum of selectedZones.keys()) {
            zones.set(sum, perZone);
        }
        return zones;
    }, [selectedZones, betAmount]);

    const getTotalPayout = (): number => {
        return payout ?? 0;
    };

    const getMaxPotentialWin = (): number => {
        if (selectedZones.size === 0 || betAmount <= 0) return 0;
        const multiplier = getMultiplier(Array.from(selectedZones.keys()));
        return betAmount * multiplier;
    };

    // Toggle a zone in the selected zones
    const toggleZone = (sum: number) => {
        setSelectedZones(prev => {
            const next = new Map(prev);
            if (next.has(sum)) {
                next.delete(sum);
            } else {
                next.set(sum, 0);
            }
            return next;
        });
    };

    // GAME FUNCTIONS
    const playGame = async (
        gameId?: bigint,
        randomWord?: Hex,
    ) => {
        if (selectedZones.size === 0) {
            toast.error("Select at least one Safe Zone!");
            return;
        }
        if (betAmount <= 0) {
            toast.error("Enter a bet amount!");
            return;
        }

        setIsLoading(true);
        setIsGameOngoing(true);

        // Initialize multi-roll session
        if (numberOfRolls > 1) {
            setIsMultiRollSession(true);
        } else {
            setIsMultiRollSession(false);
        }
        setCurrentRollIndex(0);
        setSessionResults([]);
        setSessionTotalPayout(0);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;

        try {
            const receiptSuccess = true;

            if (receiptSuccess) {
                toast.success("Balloon launched!");
                setTimeout(() => {
                    setIsLoading(false);
                    setCurrentView(1);
                    // Start the float-to-start animation
                    setAnimationPhase("kick-off");
                }, 800);
            } else {
                toast.info("Something went wrong..");
                setIsLoading(false);
                setIsGameOngoing(false);
            }
        } catch (error) {
            if (
                (error instanceof Error && error.message.includes("Transaction not found")) ||
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

    const handleRollDiceRef = React.useRef<() => void>(() => {});

    const handleRollDice = () => {
        if (isRolling || animationPhase === "shooting") return;

        // Play dice sound when rolling starts
        if (diceSoundRef.current && !muteSfx) {
            diceSoundRef.current.play();
        }

        setIsRolling(true);
        setDiceResult(null);
        setRolledSum(null);
        setBalloonTileIndex(-1);

        // Generate dice results
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const sum = die1 + die2;

        // Start the "moving" animation after a brief dice roll visual
        setTimeout(() => {
            setDiceResult([die1, die2]);
            setRolledSum(sum);
            setIsRolling(false);

            // Calculate payout using Model A: combined bet
            // Win if rolled sum is any of the selected zones
            const won = selectedZones.has(sum);
            setIsWin(won);

            let rollPayout = 0;
            if (won) {
                const multiplier = getMultiplier(Array.from(selectedZones.keys()));
                rollPayout = betAmount * multiplier;
                setPayout(rollPayout);
            } else {
                setPayout(0);
            }

            // Track result in session
            const rollResult = { dice: [die1, die2] as [number, number], sum, won, payout: rollPayout };
            setSessionResults(prev => [...prev, rollResult]);
            setSessionTotalPayout(prev => prev + rollPayout);

            // Start balloon moving along the path
            setAnimationPhase("shooting");
        }, 1500);
    };

    // Keep ref updated so auto-advance setTimeout always calls the latest version
    handleRollDiceRef.current = handleRollDice;

    // When animation phase reaches "moving", step the balloon tile-by-tile
    useEffect(() => {
        if (animationPhase !== "shooting" || rolledSum === null) return;

        // The path goes from 2 to rolledSum
        const allTiles = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const pathEnd = allTiles.indexOf(rolledSum);
        if (pathEnd < 0) return;

        let currentIdx = 0;
        setBalloonTileIndex(0);

        const stepInterval = setInterval(() => {
            currentIdx++;
            
            // Play kick sound on first ball movement with delay
            if (currentIdx === 1 && kickSoundRef.current && !muteSfx) {
                setTimeout(() => {
                    kickSoundRef.current?.play();
                }, 280);
            }
            
            if (currentIdx > pathEnd) {
                clearInterval(stepInterval);
                // Arrived at destination - show result after a brief pause
                setTimeout(() => {
                    setAnimationPhase("result");
                }, 400);
                return;
            }
            setBalloonTileIndex(currentIdx);
        }, 280); // 280ms per tile hop

        return () => clearInterval(stepInterval);
    }, [animationPhase, rolledSum]);

    // After result phase: if multi-roll and more rolls remain, auto-advance; otherwise zoom out to finish
    useEffect(() => {
        if (animationPhase !== "result") return;

        const resultDelay = isWin ? 2000 : 1500;

        const timer = setTimeout(() => {
            const nextIndex = currentRollIndex + 1;

            if (isMultiRollSession && nextIndex < numberOfRolls) {
                // More rolls to go -- reset for next roll
                setCurrentRollIndex(nextIndex);
                setDiceResult(null);
                setRolledSum(null);
                setIsRolling(false);
                setPayout(null);
                setIsWin(false);
                setBalloonTileIndex(-1);
                setAnimationPhase("next-kick");

                // After brief reset animation, auto-roll
                setTimeout(() => {
                    setAnimationPhase("kick-off");
                    // Auto-trigger the next dice roll after balloon floats in
                    setTimeout(() => {
                        handleRollDiceRef.current();
                    }, 800);
                }, 600);
            } else {
                // All rolls done -- zoom out to finish
                setAnimationPhase("zoom-out");
            }
        }, resultDelay);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animationPhase, isWin, currentRollIndex, numberOfRolls, isMultiRollSession]);

    useEffect(() => {
        if (animationPhase !== "zoom-out") return;

        const finishTimer = setTimeout(() => {
            // Set the final session payout for the results modal
            if (isMultiRollSession) {
                setPayout(sessionTotalPayout);
                setIsWin(sessionTotalPayout > 0);
            }
            setCurrentView(2);
            setGameOver(true);
            setIsGameOngoing(false);
        }, 1000);

        return () => clearTimeout(finishTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animationPhase]);

    const handleReset = (isPlayingAgain: boolean = false) => {
        if (!isPlayingAgain) {
            const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
            const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
            setCurrentGameId(newGameId);
            setUserRandomWord(newUserWord);
            setSelectedZones(new Map());
        }

        setIsRolling(false);
        setDiceResult(null);
        setRolledSum(null);
        setIsWin(false);
        setCurrentView(0);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setAnimationPhase("idle");
        setBalloonTileIndex(-1);
        setCurrentRollIndex(0);
        setSessionResults([]);
        setSessionTotalPayout(0);
        setIsMultiRollSession(false);

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

        // Reset game state but keep zones and bet
        setIsRolling(false);
        setDiceResult(null);
        setRolledSum(null);
        setIsWin(false);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setCurrentView(0);
        setAnimationPhase("idle");
        setBalloonTileIndex(-1);
        setCurrentRollIndex(0);
        setSessionResults([]);
        setSessionTotalPayout(0);
        setIsMultiRollSession(false);

        // Auto-play with same zones and bet
        setTimeout(async () => {
            await playGame(newGameId, newUserWord);
        }, 100);
    };

    const handleRewatch = () => {
        setCurrentView(1);
        setDiceResult(null);
        setRolledSum(null);
        setIsRolling(false);
        setPayout(null);
        setGameOver(false);
        setIsWin(false);
        setIsGameOngoing(false);
        setAnimationPhase("kick-off");
        setBalloonTileIndex(-1);
    };

    return (
        <div className="foxy-shooter-container">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10 relative">
                <style jsx global>{`
                    @import url('https://fonts.googleapis.com/css2?family=Sour+Gummy:wght@700&display=swap');
                    
                    /* Override slider value color for foxy-shooter */
                    .foxy-shooter-container .font-semibold.text-lg {
                        color: #38B6FF !important;
                    }
                    
                    .absolute.bottom-4.right-4.z-30 {
                        visibility: hidden !important;
                        pointer-events: none !important;
                        opacity: 0 !important;
                    }
                    div[class*="absolute bottom-4 right-4"] {
                        visibility: hidden !important;
                        pointer-events: none !important;
                        opacity: 0 !important;
                    }
                    [class*="absolute"][class*="bottom-4"][class*="right-4"] {
                        visibility: hidden !important;
                        pointer-events: none !important;
                        opacity: 0 !important;
                    }
                `}</style>
                {/* Game Window */}
                <GameWindow
                    game={gameData}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={gameOver}
                    onPlayAgain={handlePlayAgain}
                    playAgainText={playAgainText}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={isMultiRollSession ? betAmount * numberOfRolls : betAmount}
                    payout={isMultiRollSession ? sessionTotalPayout : payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    disableBuiltInSong={true}
                >
                    <FoxyShooterWindow
                        game={gameData}
                        selectedZones={getZoneBets()}
                        diceResult={diceResult}
                        rolledSum={rolledSum}
                        isRolling={isRolling}
                        isWin={isWin}
                        gameCompleted={gameOver}
                        betAmount={betAmount}
                        payoutAmount={getTotalPayout()}
                        maxPotentialWin={getMaxPotentialWin()}
                        currentView={currentView}
                        animationPhase={animationPhase}
                        numberOfRolls={numberOfRolls}
                        onToggleZone={toggleZone}
                    />
                </GameWindow>

                {/* Custom Audio Controls - Upper Left Corner */}
                <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 bg-[#151C21]/40 rounded-[8px] text-[#91989C]"
                        onClick={() => setMuteSfx(!muteSfx)}
                        title={muteSfx ? "Unmute SFX" : "Mute SFX"}
                    >
                        {muteSfx ? (
                            <AudioLines className="w-5 h-5 opacity-40" />
                        ) : (
                            <AudioLines className="w-5 h-5" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 bg-[#151C21]/40 rounded-[8px] text-[#91989C]"
                        onClick={() => setMuteMusic(!muteMusic)}
                        title={muteMusic ? "Unmute music" : "Mute music"}
                    >
                        {muteMusic ? (
                            <VolumeX className="w-6 h-6 opacity-40" />
                        ) : (
                            <Volume2 className="w-6 h-6" />
                        )}
                    </Button>
                </div>

                {/* Game Setup Card */}
                <FoxyShooterSetupCard
                    game={gameData}
                    onPlay={async () => await playGame()}
                    onRollDice={handleRollDice}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={async () => await handlePlayAgain()}
                    playAgainText={playAgainText}
                    currentView={currentView}
                    betAmount={currentView === 0 ? betAmount : betAmount}
                    setBetAmount={setBetAmount}
                    selectedZones={selectedZones}
                    toggleZone={toggleZone}
                    isLoading={isLoading}
                    isRolling={isRolling}
                    payout={payout}
                    diceResult={diceResult}
                    rolledSum={rolledSum}
                    isWin={isWin}
                    maxPotentialWin={getMaxPotentialWin()}
                    inReplayMode={replayIdString !== null}
                    account={undefined}
                    walletBalance={walletBalance}
                    playerAddress={undefined}
                    isGamePaused={false}
                    profile={undefined}
                    minBet={1}
                    maxBet={100}
                    animationPhase={animationPhase}
                    numberOfRolls={numberOfRolls}
                    setNumberOfRolls={setNumberOfRolls}
                    currentRollIndex={currentRollIndex}
                    sessionResults={sessionResults}
                    isMultiRollSession={isMultiRollSession}
                    sessionTotalPayout={sessionTotalPayout}
                />
            </div>
        </div>
    );
};

export default FoxyShooterComponent;
