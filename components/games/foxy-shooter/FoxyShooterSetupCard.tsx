import React from "react";
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Info, Shield } from "lucide-react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { CustomSlider } from "@/components/shared/CustomSlider";
import {
    MULTIPLIERS,
    DICE_SUMS,

    type SelectedZones,
} from "./foxyShooterConstants";
import { type AnimationPhase } from "./FoxyShooter";

interface MyGameSetupCardProps {
    game: Game;
    onPlay: () => void;
    onRollDice: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    playAgainText?: string;
    currentView: 0 | 1 | 2;

    // game related data
    betAmount: number;
    setBetAmount: (amount: number) => void;
    selectedZones: SelectedZones;
    toggleZone: (sum: number) => void;
    isLoading: boolean;
    isRolling: boolean;
    payout: number | null;
    diceResult: [number, number] | null;
    rolledSum: number | null;
    isWin: boolean;
    maxPotentialWin: number;
    inReplayMode: boolean;

    account?: any;
    walletBalance: number;
    playerAddress?: string;
    isGamePaused?: boolean;
    profile?: any;
    minBet: number;
    maxBet: number;
    animationPhase: AnimationPhase;
    numberOfRolls: number;
    setNumberOfRolls: (value: number) => void;
    currentRollIndex: number;
    sessionResults: Array<{
        dice: [number, number];
        sum: number;
        won: boolean;
        payout: number;
    }>;
    isMultiRollSession: boolean;
    sessionTotalPayout: number;
}

const MAX_WIN_INFO =
    "The maximum possible win from a single roll based on your selected Safe Zones and bet distribution.";
const ZONE_COVERAGE_INFO =
    "The combined probability of your selected Safe Zones being rolled.";

const MyGameSetupCard: React.FC<MyGameSetupCardProps> = ({
    game,
    onPlay,
    onRollDice,
    onRewatch,
    onReset,
    onPlayAgain,
    playAgainText = "Defend Again!",
    currentView,
    betAmount,
    setBetAmount,
    selectedZones,
    toggleZone,
    isLoading,
    isRolling,
    payout,
    diceResult,
    rolledSum,
    isWin,
    maxPotentialWin,
    inReplayMode,
    account = undefined,
    playerAddress = undefined,
    walletBalance,
    isGamePaused = false,
    profile = undefined,
    maxBet,
    minBet,
    animationPhase,
    numberOfRolls,
    setNumberOfRolls,
    currentRollIndex,
    sessionResults,
    isMultiRollSession,
    sessionTotalPayout,
}) => {
    const themeColorBackground = game.themeColorBackground;
    const usdMode = false;

    const getCurrentWalletAmount = (): number => walletBalance;
    const getCurrentWalletAmountMinusReduction = (): number => walletBalance;
    const getCurrentWalletAmountString = (): string => `${walletBalance.toFixed(2)} APE`;

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

    const getPerZoneBet = (): number => {
        if (selectedZones.size === 0 || betAmount <= 0) return 0;
        return betAmount / selectedZones.size;
    };

    const getZoneCoverage = (): string => {
        // Calculate the probability coverage of selected zones
        const probabilities: Record<number, number> = {
            2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
        };
        let totalWays = 0;
        for (const sum of selectedZones.keys()) {
            totalWays += probabilities[sum] || 0;
        }
        return `${((totalWays / 36) * 100).toFixed(1)}%`;
    };

    const canReplay = (): boolean => {
        if (!playerAddress) return false;
        if (!account) return false;
        if (inReplayMode) return false;
        return playerAddress.toLowerCase() === account.address.toLowerCase();
    };

    // Selected zones summary for ongoing view
    const SelectedZonesSummary = () => {
        if (selectedZones.size === 0) return null;
        return (
            <div className="flex flex-wrap gap-1.5">
                {Array.from(selectedZones.keys())
                    .sort((a, b) => a - b)
                    .map((sum) => {
                        const isMatchingZone = rolledSum === sum;
                        return (
                            <div
                                key={sum}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${
                                    isMatchingZone && isWin
                                        ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                                        : isMatchingZone && !isWin
                                            ? "bg-destructive/20 border-destructive text-destructive"
                                            : rolledSum !== null
                                                ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]/60"
                                                : "bg-[#22c55e]/10 border-[#22c55e]/50 text-foreground/80"
                                }`}
                            >
                                <div
                                    className="w-2 h-2 rounded-full bg-[#22c55e]"
                                />
                                <span>{sum}</span>
                            </div>
                        );
                    })}
            </div>
        );
    };

    return (
        <Card className="lg:basis-1/3 p-6 flex flex-col">
            {/* ===== SETUP VIEW ===== */}
            {currentView === 0 && (
                <>
                    <CardContent className="font-roboto">
                        {/* Defend button - mobile */}
                        <Button
                            onClick={onPlay}
                            className="lg:hidden w-full font-semibold"
                            style={{
                                backgroundColor: (betAmount === null || betAmount <= 0 || selectedZones.size === 0 || isGamePaused) ? "#316A8D" : "#38B6FF",
                                borderColor: (betAmount === null || betAmount <= 0 || selectedZones.size === 0 || isGamePaused) ? "#316A8D" : "#38B6FF",
                                color: "#313131",
                            }}
                            disabled={
                                betAmount === null ||
                                betAmount <= 0 ||
                                selectedZones.size === 0 ||
                                isGamePaused
                            }
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Defend!
                        </Button>

                        {/* Bet amount */}
                        <div className="mt-5">
                            <BetAmountInput
                                min={0}
                                max={getCurrentWalletAmountMinusReduction()}
                                step={0.1}
                                value={betAmount}
                                onChange={setBetAmount}
                                balance={getCurrentWalletAmount()}
                                usdMode={usdMode}
                                setUsdMode={() => {}}
                                disabled={isLoading}
                                themeColorBackground={themeColorBackground}
                            />
                        </div>

                        {/* Number of Rolls Slider */}
                        <div className="mt-5">
                            <CustomSlider
                                label="Number of Rolls"
                                min={1}
                                max={25}
                                step={1}
                                value={numberOfRolls}
                                onChange={setNumberOfRolls}
                                presets={[1, 5, 10, 15, 20, 25]}
                                themeColor={themeColorBackground}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Safe Zone Selector */}
                        <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4 text-foreground/70" />
                                <p className="text-sm font-semibold text-foreground">
                                    Select Safe Zones
                                </p>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {DICE_SUMS.map((sum) => {
                                    const isSelected = selectedZones.has(sum);
                                    return (
                                        <button
                                            key={sum}
                                            onClick={() => toggleZone(sum)}
                                            className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 ${
                                                isSelected
                                                    ? "border-[#22c55e] bg-[#22c55e]/15"
                                                    : "border-border bg-card/50 hover:border-foreground/30"
                                            }`}
                                        >
                                            <span
                                                className={`font-bold text-sm ${
                                                    isSelected ? "text-[#22c55e]" : "text-foreground/60"
                                                }`}
                                            >
                                                {sum}
                                            </span>
                                            {isSelected && (
                                                <div
                                                    className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#22c55e]"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                    </CardContent>

                    <div className="grow"></div>

                    <CardFooter className="mt-6 w-full flex flex-col font-roboto">
                        {/* Stats */}
                        <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Bet Per Roll</p>
                                <p className="text-right">{getBetAmountText()}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Rolls</p>
                                <p className="text-right">{numberOfRolls}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Bet</p>
                                <p className="text-right font-semibold text-foreground">
                                    {(betAmount * numberOfRolls).toLocaleString([], {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })}{" "}APE
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Safe Zones</p>
                                <p className="text-right">{selectedZones.size} selected</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Zone Coverage</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={14} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{ZONE_COVERAGE_INFO}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">{getZoneCoverage()}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Max Potential Win</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={14} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{MAX_WIN_INFO}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">
                                    {maxPotentialWin.toLocaleString([], {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })}{" "}
                                    APE
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Max Bet</p>
                                <p className="text-right">
                                    {maxBet.toLocaleString([], { maximumFractionDigits: 0 })} APE
                                </p>
                            </div>
                        </div>

                        {/* Defend button - desktop */}
                        <Button
                            onClick={onPlay}
                            className="hidden lg:flex mt-6 w-full font-semibold"
                            style={{
                                backgroundColor: (betAmount === null || betAmount <= 0 || selectedZones.size === 0 || isGamePaused) ? "#316A8D" : "#38B6FF",
                                borderColor: (betAmount === null || betAmount <= 0 || selectedZones.size === 0 || isGamePaused) ? "#316A8D" : "#38B6FF",
                                color: "#313131",
                            }}
                            disabled={
                                betAmount === null ||
                                betAmount <= 0 ||
                                selectedZones.size === 0 ||
                                isGamePaused
                            }
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Defend!
                        </Button>
                    </CardFooter>
                </>
            )}

            {/* ===== ONGOING VIEW ===== */}
            {currentView === 1 && (
                <CardContent className="grow font-roboto flex flex-col gap-4">
                    {/* Session Progress Header */}
                    {isMultiRollSession && (
                        <div className="flex items-center justify-between">
                            <p className="text-foreground text-sm font-semibold">
                                Roll {Math.min(currentRollIndex + 1, numberOfRolls)} of {numberOfRolls}
                            </p>
                            <div className="flex items-center gap-3 text-xs font-medium">
                                <span className="text-[#22c55e]">
                                    {sessionResults.filter(r => r.won).length}W
                                </span>
                                <span className="text-[#ef4444]">
                                    {sessionResults.filter(r => !r.won).length}L
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Progress bar for multi-roll */}
                    {isMultiRollSession && (
                        <div className="w-full h-2 rounded-full bg-card/50 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${(sessionResults.length / numberOfRolls) * 100}%`,
                                    backgroundColor: themeColorBackground,
                                }}
                            />
                        </div>
                    )}

                    {/* Stats */}
                    <div className="w-full flex flex-col gap-2 font-medium text-xs text-[#91989C]">
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Bet Per Roll</p>
                            <p className="text-right">{getBetAmountText()}</p>
                        </div>
                        {isMultiRollSession && (
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Bet</p>
                                <p className="text-right">
                                    {(betAmount * numberOfRolls).toLocaleString([], {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })} APE
                                </p>
                            </div>
                        )}
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Session Payout</p>
                            <p className={`text-right font-semibold ${sessionTotalPayout > 0 ? "text-[#22c55e]" : "text-foreground"}`}>
                                {sessionTotalPayout.toLocaleString([], {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 3,
                                })} APE
                            </p>
                        </div>
                    </div>

                    {/* Selected zones summary */}
                    <div>
                        <p className="text-xs text-[#91989C] mb-2">Your Safe Zones:</p>
                        <SelectedZonesSummary />
                    </div>

                    {/* Roll History - scrollable list */}
                    {sessionResults.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <p className="text-xs text-[#91989C] mb-1">Roll History:</p>
                            <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                                {sessionResults.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                                            result.won
                                                ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]"
                                                : "bg-destructive/10 border-destructive/30 text-destructive"
                                        }`}
                                    >
                                        <span>#{idx + 1} - Rolled {result.sum}</span>
                                        <span>
                                            {result.won
                                                ? `+${result.payout.toFixed(2)}`
                                                : "0.00"
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grow" />

                    {/* Current roll result */}
                    {diceResult && !isRolling && (
                        <div className="text-center py-2">
                            <p className="text-sm text-[#91989C]">
                                Rolled: {diceResult[0]} + {diceResult[1]} = {rolledSum}
                            </p>
                        </div>
                    )}

                    {/* Roll button - only show for first roll (auto-rolls after that) */}
                    {!diceResult && currentRollIndex === 0 && (
                        <Button
                            onClick={onRollDice}
                            className="w-full font-bold text-lg py-6"
                            style={{
                                backgroundColor: (isRolling || animationPhase === "shooting") ? "#316A8D" : "#38B6FF",
                                borderColor: (isRolling || animationPhase === "shooting") ? "#316A8D" : "#38B6FF",
                                color: "#313131",
                            }}
                            disabled={isRolling || animationPhase === "shooting"}
                        >
                            {isRolling || animationPhase === "shooting"
                                ? "Rolling..."
                                : isMultiRollSession
                                    ? `Roll All ${numberOfRolls} Dice`
                                    : "Roll Dice"
                            }
                        </Button>
                    )}
                </CardContent>
            )}

            {/* ===== GAME OVER VIEW ===== */}
            {currentView === 2 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-6">
                    {/* Action buttons - mobile */}
                    <div className="lg:hidden">
                        {canReplay() ? (
                            <Button
                                className="w-full text-card"
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
                                className="w-full text-card"
                                style={{
                                    backgroundColor: themeColorBackground,
                                    borderColor: themeColorBackground,
                                }}
                                onClick={onPlayAgain}
                                disabled={isGamePaused}
                            >
                                {playAgainText}
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

                    {/* Stats */}
                    <div className="flex flex-col gap-4">
                        {inReplayMode && (
                            <p
                                className="mt-2 font-semibold text-3xl text-center"
                                style={{ color: themeColorBackground }}
                            >
                                Replay Mode
                            </p>
                        )}

                        {/* Session summary for multi-roll */}
                        {isMultiRollSession && sessionResults.length > 0 && (
                            <div className="flex items-center justify-between py-2">
                                <p className="text-foreground text-sm font-semibold">
                                    Session Complete
                                </p>
                                <div className="flex items-center gap-3 text-xs font-medium">
                                    <span className="text-[#22c55e]">
                                        {sessionResults.filter(r => r.won).length}W
                                    </span>
                                    <span className="text-[#ef4444]">
                                        {sessionResults.filter(r => !r.won).length}L
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Game result stats */}
                        <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                            {isMultiRollSession && (
                                <div className="w-full flex justify-between items-center gap-2">
                                    <p>Rolls Played</p>
                                    <p className="text-right">{sessionResults.length}</p>
                                </div>
                            )}
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Bet</p>
                                <p className="text-right">
                                    {(isMultiRollSession ? betAmount * numberOfRolls : betAmount).toLocaleString([], {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })} APE
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Payout</p>
                                <p className={`text-right font-semibold ${
                                    (isMultiRollSession ? sessionTotalPayout : (payout ?? 0)) > 0 ? "text-[#22c55e]" : "text-foreground"
                                }`}>
                                    {(isMultiRollSession ? sessionTotalPayout : (payout ?? 0)).toLocaleString([], {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })} APE
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Net Profit</p>
                                {(() => {
                                    const totalBet = isMultiRollSession ? betAmount * numberOfRolls : betAmount;
                                    const totalPay = isMultiRollSession ? sessionTotalPayout : (payout ?? 0);
                                    const net = totalPay - totalBet;
                                    return (
                                        <p className={`text-right font-semibold ${
                                            net > 0 ? "text-[#22c55e]" : net < 0 ? "text-[#ef4444]" : "text-foreground"
                                        }`}>
                                            {net >= 0 ? "+" : ""}{net.toLocaleString([], {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 3,
                                            })} APE
                                        </p>
                                    );
                                })()}
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Wallet Balance</p>
                                <p className="text-right">{getCurrentWalletAmountString()}</p>
                            </div>
                        </div>

                        {/* Roll History for multi-roll */}
                        {isMultiRollSession && sessionResults.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-[#91989C] mb-1">Roll History:</p>
                                <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                                    {sessionResults.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                                                result.won
                                                    ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]"
                                                    : "bg-destructive/10 border-destructive/30 text-destructive"
                                            }`}
                                        >
                                            <span>#{idx + 1} - Rolled {result.sum}</span>
                                            <span>
                                                {result.won
                                                    ? `+${result.payout.toFixed(2)}`
                                                    : "0.00"
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Zones summary */}
                        <div>
                            <p className="text-xs text-[#91989C] mb-2">Your Safe Zones:</p>
                            <SelectedZonesSummary />
                        </div>
                    </div>

                    {/* Action buttons - desktop */}
                    <CardFooter className="w-full hidden lg:block">
                        <div className="w-full flex flex-col gap-4">
                            <Button
                                className="w-full text-card"
                                style={{
                                    backgroundColor: themeColorBackground,
                                    borderColor: themeColorBackground,
                                }}
                                onClick={onPlayAgain}
                                disabled={isGamePaused}
                            >
                                {playAgainText}
                            </Button>
                            <Button
                                className="w-full"
                                variant="secondary"
                                onClick={onReset}
                            >
                                Change Bet
                            </Button>
                        </div>
                    </CardFooter>
                </CardContent>
            )}
        </Card>
    );
};

export default MyGameSetupCard;
