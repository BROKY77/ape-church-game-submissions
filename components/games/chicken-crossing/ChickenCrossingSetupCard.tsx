import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/games";
import {
    Difficulty,
    getChickenMultiplier,
    getCrashProbability,
} from "./chickenGameConfig";
import BetAmountInput from "@/components/shared/BetAmountInput";

interface ChickenCrossingSetupCardProps {
    game: Game;
    onPlay: () => void;
    onJump: () => void;
    onCashOut: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    playAgainText?: string;
    currentView: 0 | 1 | 2; // 0 = setup, 1 = ongoing, 2 = finished

    // game related data
    betAmount: number;
    setBetAmount: (amount: number) => void;
    difficulty: Difficulty;
    setDifficulty: (diff: Difficulty) => void;
    isLoading: boolean;
    payout: number | null;
    currentMultiplier: number;
    isJumping: boolean;

    inReplayMode: boolean;
    walletBalance: number;
    isGamePaused?: boolean;
    minBet: number;
    maxBet: number;
    difficultyMaxSafeLanes: number;
    finishLane: number;
    autoJumpEnabled: boolean;
    onToggleAutoJump: () => void;
    musicMuted: boolean;
    sfxMuted: boolean;
    onToggleMusicMuted: () => void;
    onToggleSfxMuted: () => void;
}

const FEATHER_PARTICLES = [
    { left: 5, size: 14, fall: 12, delay: 2, sway: 4.8, rotate: -8, tint: "white" },
    { left: 14, size: 18, fall: 16, delay: 8, sway: 5.6, rotate: 12, tint: "accent" },
    { left: 23, size: 12, fall: 11, delay: 4, sway: 4.2, rotate: -18, tint: "warm" },
    { left: 31, size: 16, fall: 14, delay: 10, sway: 5.0, rotate: 9, tint: "white" },
    { left: 40, size: 13, fall: 13, delay: 1, sway: 4.4, rotate: -14, tint: "accent" },
    { left: 48, size: 20, fall: 18, delay: 6, sway: 6.0, rotate: 6, tint: "warm" },
    { left: 56, size: 15, fall: 15, delay: 9, sway: 5.1, rotate: -10, tint: "white" },
    { left: 65, size: 17, fall: 17, delay: 3, sway: 5.8, rotate: 15, tint: "accent" },
    { left: 73, size: 11, fall: 10, delay: 5, sway: 4.0, rotate: -22, tint: "white" },
    { left: 82, size: 19, fall: 19, delay: 12, sway: 6.2, rotate: 8, tint: "warm" },
    { left: 90, size: 13, fall: 13, delay: 7, sway: 4.6, rotate: -11, tint: "accent" },
] as const;

const FeatherDriftOverlay: React.FC<{ accentColor: string }> = ({ accentColor }) => {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <style>{`
                @keyframes chickenPanelFeatherFall {
                    0% { transform: translateY(-70px); opacity: 0; }
                    8% { opacity: 1; }
                    92% { opacity: 1; }
                    100% { transform: translateY(980px); opacity: 0; }
                }
                @keyframes chickenPanelFeatherSway {
                    0% { transform: translateX(-7px) rotate(-10deg); }
                    50% { transform: translateX(8px) rotate(12deg); }
                    100% { transform: translateX(-7px) rotate(-10deg); }
                }
            `}</style>

            <div className="absolute inset-0 opacity-20">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(120% 55% at 15% 0%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `linear-gradient(125deg, transparent 0%, transparent 38%, ${accentColor}18 50%, transparent 62%, transparent 100%)`,
                        backgroundSize: "320px 320px",
                        backgroundPosition: "-40px -70px",
                    }}
                />

                {FEATHER_PARTICLES.map((particle, idx) => {
                    const featherColor =
                        particle.tint === "accent"
                            ? accentColor
                            : particle.tint === "warm"
                                ? "#FDE68A"
                                : "#E5E7EB";

                    return (
                        <div
                            key={`${particle.left}-${idx}`}
                            className="absolute -top-16"
                            style={{
                                left: `${particle.left}%`,
                                animation: `chickenPanelFeatherFall ${particle.fall}s linear infinite`,
                                animationDelay: `-${particle.delay}s`,
                            }}
                        >
                            <div
                                style={{
                                    animation: `chickenPanelFeatherSway ${particle.sway}s ease-in-out infinite`,
                                    transform: `rotate(${particle.rotate}deg)`,
                                }}
                            >
                                <svg
                                    viewBox="0 0 22 38"
                                    style={{ width: particle.size, height: Math.round(particle.size * 1.8), color: featherColor }}
                                >
                                    <path
                                        d="M11 2 C16 5 19 12 18 19 C17 26 12 32 7 35 C8 31 8 28 7 24 C6 19 4 14 4 10 C4 5 7 2 11 2 Z"
                                        fill="currentColor"
                                        fillOpacity="0.55"
                                    />
                                    <path
                                        d="M10.8 4 L9.8 34"
                                        stroke="currentColor"
                                        strokeOpacity="0.85"
                                        strokeWidth="1.3"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M10.3 10 C13.5 11.5 15.2 14.5 15.7 17"
                                        stroke="currentColor"
                                        strokeOpacity="0.55"
                                        strokeWidth="1"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M10 15 C12.6 16.8 13.8 19.2 14.1 21.7"
                                        stroke="currentColor"
                                        strokeOpacity="0.45"
                                        strokeWidth="1"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ChickenCrossingSetupCard: React.FC<ChickenCrossingSetupCardProps> = ({
    game,
    onPlay,
    onJump,
    onCashOut,
    onRewatch,
    onReset,
    onPlayAgain,
    playAgainText = "Play Again",
    currentView,
    betAmount,
    setBetAmount,
    difficulty,
    setDifficulty,
    isLoading,
    payout,
    currentMultiplier,
    isJumping,
    inReplayMode,
    walletBalance,
    isGamePaused = false,
    maxBet,
    minBet,
    difficultyMaxSafeLanes,
    finishLane,
    autoJumpEnabled,
    onToggleAutoJump,
    musicMuted,
    sfxMuted,
    onToggleMusicMuted,
    onToggleSfxMuted,
}) => {
    const themeColorBackground = game.themeColorBackground;
    const [usdMode, setUsdMode] = useState(false);
    const currentCrashChance = getCrashProbability(difficulty);
    const currentMaxRoadMultiplier = getChickenMultiplier(difficultyMaxSafeLanes, difficulty);

    const getBetAmountText = (): string => {
        return `${(betAmount || 0).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;
    };

    const getTotalPayoutText = (): string => {
        return `${(payout || 0).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;
    };

    const ShowInUsdAndStats = (invertOnDesktop: boolean) => {
        const showGreenText = (payout || 0) > (betAmount || 0);

        return (
            <div
                className={`${invertOnDesktop ? "flex-col-reverse lg:flex-col" : "flex-col"
                    } font-roboto flex gap-12 lg:gap-8`}
            >
                {inReplayMode && (
                    <p
                        className="mt-2 font-semibold text-3xl sm:text-3xl text-center"
                        style={{ color: themeColorBackground }}
                    >
                        Replay Mode
                    </p>
                )}

                {/* summary header */}
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-foreground text-lg font-semibold">
                            Bet Summary
                        </p>
                        <p className="text-sm">Values shown in APE</p>
                    </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onToggleMusicMuted}
                        aria-pressed={!musicMuted}
                        className="rounded-lg border px-3 py-2 text-left transition-colors"
                        style={{
                            borderColor: musicMuted ? "rgba(145,152,156,0.25)" : `${themeColorBackground}66`,
                            backgroundColor: musicMuted ? "rgba(255,255,255,0.02)" : `${themeColorBackground}14`,
                        }}
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91989C]">
                            Music
                        </p>
                        <p
                            className="mt-1 text-xs font-semibold"
                            style={{ color: musicMuted ? "#DCE2E6" : themeColorBackground }}
                        >
                            {musicMuted ? "Muted" : "On"}
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={onToggleSfxMuted}
                        aria-pressed={!sfxMuted}
                        className="rounded-lg border px-3 py-2 text-left transition-colors"
                        style={{
                            borderColor: sfxMuted ? "rgba(145,152,156,0.25)" : `${themeColorBackground}66`,
                            backgroundColor: sfxMuted ? "rgba(255,255,255,0.02)" : `${themeColorBackground}14`,
                        }}
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91989C]">
                            SFX
                        </p>
                        <p
                            className="mt-1 text-xs font-semibold"
                            style={{ color: sfxMuted ? "#DCE2E6" : themeColorBackground }}
                        >
                            {sfxMuted ? "Muted" : "On"}
                        </p>
                    </button>
                </div>

                <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Bet Amount</p>
                        <p className="text-right">{getBetAmountText()}</p>
                    </div>
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Total Pay Out</p>
                        <p className={`text-right ${showGreenText ? "text-success" : ""}`}>
                            {getTotalPayoutText()}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const canReplay = (): boolean => {
        return !inReplayMode;
    };

    return (
        <Card className="lg:basis-1/3 p-6 flex flex-col relative overflow-hidden">
            <FeatherDriftOverlay accentColor={themeColorBackground} />

            <div className="relative z-10 flex flex-col grow">
                {currentView === 0 && (
                <>
                    <CardContent className="font-roboto">
                        {/* place your bet button - mobile */}
                        <Button
                            onClick={onPlay}
                            className="lg:hidden w-full"
                            style={{
                                backgroundColor: themeColorBackground,
                                borderColor: themeColorBackground,
                            }}
                            disabled={betAmount === null || betAmount <= 0 || isGamePaused}
                        >
                            Place Your Bet
                        </Button>

                        {/* bet amount */}
                        <div className="mt-5">
                            <BetAmountInput
                                min={minBet}
                                max={Math.min(walletBalance, maxBet)}
                                step={0.1}
                                value={betAmount}
                                onChange={setBetAmount}
                                balance={walletBalance}
                                usdMode={usdMode}
                                setUsdMode={setUsdMode}
                                disabled={isLoading}
                                themeColorBackground={themeColorBackground}
                            />
                        </div>

                        {/* difficulty */}
                        <div className="mt-8">
                            <div className="w-full space-y-2" style={{ '--theme-color': themeColorBackground } as React.CSSProperties}>
                                <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-400">
                                    <p>Difficulty</p>
                                </div>
                                <div className="relative">
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                                        disabled={isLoading}
                                        className="w-full bg-gray-900/70 border border-(--theme-color)/30 hover:border-(--theme-color)/60 transition-colors rounded-[5px] px-3 py-2.5 text-sm font-medium outline-none text-white appearance-none cursor-pointer focus:ring-1 focus:ring-(--theme-color)"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                        <option value="Expert">Expert</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#B1BAD3]">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <div className="grow"></div>

                    <div className="w-full px-6 font-roboto">
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-[1px]">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#91989C]">
                                    Road Intel
                                </p>
                                <div
                                    className="h-[2px] w-14 rounded-full"
                                    style={{
                                        background: `linear-gradient(90deg, ${themeColorBackground}00 0%, ${themeColorBackground}AA 100%)`,
                                    }}
                                />
                            </div>

                            <div className="space-y-2 text-sm font-medium text-[#91989C]">
                                <div className="flex items-center justify-between gap-3">
                                    <p>Finish Line</p>
                                    <p className="text-[#DCE2E6]">{finishLane}</p>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <p>Crash Chance (Start)</p>
                                    <p className="text-[#DCE2E6]">{Math.round(currentCrashChance * 100)}%</p>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <p>Max Road Multiplier</p>
                                    <p style={{ color: themeColorBackground }}>
                                        {currentMaxRoadMultiplier.toFixed(2)}x
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <p>Max Bet Per Game</p>
                                    <p className="text-[#DCE2E6]">
                                        {maxBet.toLocaleString()} APE
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <CardFooter className="mt-8 w-full flex flex-col font-roboto">
                        <Button
                            onClick={onPlay}
                            className="hidden lg:flex mt-6 w-full"
                            style={{
                                backgroundColor: themeColorBackground,
                                borderColor: themeColorBackground,
                            }}
                            disabled={betAmount === null || betAmount <= 0 || isGamePaused}
                        >
                            Place Your Bet
                        </Button>
                    </CardFooter>
                </>
                )}

                {currentView === 1 && (
                <CardContent className="grow font-roboto flex flex-col-reverse lg:flex-col lg:justify-between gap-8 pt-4">
                    {ShowInUsdAndStats(true)}

                    {/* Current Multiplier Block */}
                    <div className="text-center font-nohemia">
                        <p className="text-lg font-medium text-[#91989C]">Current Multiplier</p>
                        <p
                            className="mt-2 font-semibold text-2xl sm:text-5xl"
                            style={{ color: themeColorBackground }}
                        >
                            {currentMultiplier.toFixed(2)}x
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={onCashOut}
                            disabled={isJumping || currentMultiplier <= 0}
                            className="w-full text-black text-lg font-bold py-6 transition-colors border-2"
                            style={{
                                backgroundColor: currentMultiplier > 0 ? themeColorBackground : 'transparent',
                                borderColor: themeColorBackground,
                                color: currentMultiplier > 0 ? 'black' : 'white'
                            }}
                        >
                            Cashout
                        </Button>

                        <Button
                            onClick={onJump}
                            disabled={isJumping}
                            className="w-full text-black text-lg font-bold py-6 transition-colors"
                            style={{ backgroundColor: "#22C55E" }}
                        >
                            Jump
                        </Button>

                        <Button
                            type="button"
                            onClick={onToggleAutoJump}
                            className="w-full text-lg font-bold py-5 transition-colors border-2"
                            style={{
                                backgroundColor: autoJumpEnabled ? "rgba(34,197,94,0.14)" : "transparent",
                                borderColor: autoJumpEnabled ? "#22C55E" : "rgba(145,152,156,0.35)",
                                color: autoJumpEnabled ? "#22C55E" : "#DCE2E6",
                            }}
                        >
                            {autoJumpEnabled ? "Auto Jump: On" : "Auto Jump: Off"}
                        </Button>
                    </div>
                </CardContent>
                )}

                {currentView === 2 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-8 pt-4">
                    <div className="lg:hidden">
                        {canReplay() ? (
                            <Button
                                className="w-full"
                                style={{
                                    backgroundColor: themeColorBackground,
                                    borderColor: themeColorBackground,
                                }}
                                onClick={onPlayAgain}
                                disabled={isGamePaused}
                            >
                                {playAgainText}
                            </Button>
                        ) : (
                            <Button
                                className="w-full"
                                variant="secondary"
                                onClick={onRewatch}
                            >
                                Rewatch Game
                            </Button>
                        )}
                        <Button
                            className="w-full mt-3"
                            variant="secondary"
                            onClick={onReset}
                        >
                            Change Bet
                        </Button>
                    </div>

                    {ShowInUsdAndStats(false)}

                    <CardFooter className="w-full hidden lg:block p-0">
                        <div className="w-full flex flex-col gap-4">
                            {canReplay() ? (
                                <Button
                                    className="w-full"
                                    style={{
                                        backgroundColor: themeColorBackground,
                                        borderColor: themeColorBackground,
                                    }}
                                    onClick={onPlayAgain}
                                    disabled={isGamePaused}
                                >
                                    {playAgainText}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full"
                                    onClick={onRewatch}
                                >
                                    Rewatch Game
                                </Button>
                            )}

                            <Button
                                className="w-full border"
                                variant="secondary"
                                onClick={onReset}
                            >
                                Change Bet
                            </Button>
                        </div>
                    </CardFooter>
                </CardContent>
                )}
            </div>
        </Card>
    );
};

export default ChickenCrossingSetupCard;
