import React from "react";
import Image from "next/image";
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
import { Info } from "lucide-react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";

interface MyGameSetupCardProps {
    game: Game;
    onPlay: () => void;
    onCashOut: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    playAgainText?: string;
    currentView: 0 | 1 | 2;

    betAmount: number;
    setBetAmount: (amount: number) => void;
    isLoading: boolean;
    payout: number | null;
    inReplayMode: boolean;

    account?: any;
    walletBalance: number;
    playerAddress?: string;
    isGamePaused?: boolean;
    profile?: any;
    minBet: number;
    maxBet: number;
    isClimbing: boolean;
    hasCashedOut: boolean;
    currentMultiplier: number;
}

const MyGameSetupCard: React.FC<MyGameSetupCardProps> = ({
    game,
    onPlay,
    onCashOut,
    onRewatch,
    onReset,
    onPlayAgain,
    playAgainText = "Play Again",
    currentView,
    betAmount,
    setBetAmount,
    isLoading,
    payout,
    inReplayMode,
    account = undefined,
    playerAddress = undefined,
    walletBalance,
    isGamePaused = false,
    profile = undefined,
    maxBet,
    minBet,
    isClimbing,
    hasCashedOut,
    currentMultiplier,
}) => {
    const themeColorBackground = game.themeColorBackground;

    const usdMode = false;

    const getCurrentWalletAmount = (): number => {
        return walletBalance;
    };

    const getCurrentWalletAmountMinusReduction = (): number => {
        return walletBalance;
    };

    const getCurrentWalletAmountString = (): string => {
        return `${walletBalance.toFixed(2)} APE`;
    };

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

    const getPotentialWinText = (): string => {
        const potentialWin = betAmount * currentMultiplier;
        return `${(potentialWin || 0).toLocaleString([], {
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

                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-foreground text-lg font-semibold">
                            Show Bets in USD
                        </p>
                        <p className="text-sm">
                            Your bets are valued in {usdMode ? "US Dollars" : "APE"}
                        </p>
                    </div>
                    <Switch
                        checked={usdMode}
                        onCheckedChange={() => {}}
                        aria-readonly
                    />
                </div>

                <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Bet Amount</p>
                        <p className="text-right">{getBetAmountText()}</p>
                    </div>
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Potential Win</p>
                        <p className={`text-right text-green-500 font-semibold`}>
                            {getPotentialWinText()}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const ShowInUsdAndStatsFinalView = (invertOnDesktop: boolean) => {
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

                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-foreground text-lg font-semibold">
                            Show Bets in USD
                        </p>
                        <p className="text-sm">Your bets are valued in US Dollars</p>
                    </div>
                    <Switch
                        checked={usdMode}
                        onCheckedChange={() => {}}
                        aria-readonly
                    />
                </div>

                <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Bet Amount</p>
                        <p className="text-right">{getBetAmountText()}</p>
                    </div>
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Total Payout</p>
                        <p className={`text-right ${showGreenText ? "text-success" : ""}`}>
                            {getTotalPayoutText()}
                        </p>
                    </div>
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Wallet Balance</p>
                        <p className="text-right">{getCurrentWalletAmountString()}</p>
                    </div>
                </div>
            </div>
        );
    };

    const canReplay = (): boolean => {
        if (!playerAddress) {
            return false;
        }
        if (!account) {
            return false;
        }
        if (inReplayMode) {
            return false;
        }
        return playerAddress.toLowerCase() === account.address.toLowerCase();
    };

    return (
        <Card className="lg:basis-1/3 p-6 flex flex-col">
            {currentView === 0 && (
                <>
                    <CardContent className="font-roboto">
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

                        <div className="mt-5">
                            <BetAmountInput
                                min={0}
                                max={getCurrentWalletAmountMinusReduction()}
                                step={0.1}
                                value={betAmount}
                                onChange={setBetAmount}
                                balance={getCurrentWalletAmount()}
                                usdMode={usdMode}
                                setUsdMode={() => { }}
                                disabled={isLoading}
                                themeColorBackground={themeColorBackground}
                            />
                        </div>
                    </CardContent>

                    <div className="grow"></div>

                    <CardFooter className="mt-8 w-full flex flex-col font-roboto">
                        <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Max Bet Per Game</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={16} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Maximum amount you can bet per round</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">
                                    {maxBet.toLocaleString([], { maximumFractionDigits: 0 })} APE
                                </p>
                            </div>
                        </div>

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
                <CardContent className="grow font-roboto flex flex-col-reverse lg:flex-col lg:justify-between gap-8">
                    {ShowInUsdAndStats(true)}

                    <div className="flex lg:flex-col justify-center items-center">
                        <div className="font-roboto flex flex-col items-center gap-3 w-full">
                            <Button
                                onClick={onCashOut}
                                className="w-full text-lg font-bold py-6"
                                style={{
                                    backgroundColor: isClimbing ? "#22c55e" : "#6b7280",
                                    borderColor: isClimbing ? "#22c55e" : "#6b7280",
                                }}
                                disabled={!isClimbing || hasCashedOut}
                            >
                                {hasCashedOut ? "Cashed Out!" : isClimbing ? "CASH OUT" : "Waiting..."}
                            </Button>

                            {isClimbing && (
                                <p className="text-sm text-center text-muted-foreground animate-pulse">
                                    Click to cash out at {currentMultiplier.toFixed(2)}x
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}
            {currentView === 2 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-8">
                    <div className="lg:hidden">
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

                        <Button
                            className="w-full mt-3"
                            variant="secondary"
                            onClick={onReset}
                        >
                            Change Bet
                        </Button>
                    </div>

                    {ShowInUsdAndStatsFinalView(false)}

                    <CardFooter className="w-full hidden lg:block">
                        <div className="w-full flex flex-col gap-4">
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
