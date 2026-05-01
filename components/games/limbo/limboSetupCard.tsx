import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BetAmountInput from "@/components/shared/BetAmountInput";

interface MyGameSetupCardProps {
    currentView: 0 | 1 | 2;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    numberOfSpins: number;
    setNumberOfSpins: (rounds: number) => void;
    betMode: "manual" | "auto";
    setBetMode: (mode: "manual" | "auto") => void;
    autoBetCount: number;
    setAutoBetCount: (count: number) => void;
    isAutoBetting: boolean;
    remainingAutoBets: number;
    autoRoundsPlayed: number;
    autoTotalPayout: number;
    hasActivePackage: boolean;
    manualRoundsRemaining: number;
    onStart: () => void;
    onStartAutobet: () => void;
    onStopAutobet: () => void;
    isLoading: boolean;
    isResolving: boolean;
    walletBalance: number;
    maxPayoutPerGame: number;
}

const MyGameSetupCard: React.FC<MyGameSetupCardProps> = ({
    currentView,
    betAmount,
    setBetAmount,
    numberOfSpins,
    setNumberOfSpins,
    betMode,
    setBetMode,
    autoBetCount,
    setAutoBetCount,
    isAutoBetting,
    remainingAutoBets,
    autoRoundsPlayed,
    autoTotalPayout,
    hasActivePackage,
    manualRoundsRemaining,
    onStart,
    onStartAutobet,
    onStopAutobet,
    isLoading,
    isResolving,
    walletBalance,
    maxPayoutPerGame,
}) => {
    const disabled = isLoading || isResolving || currentView === 1;
    const stakeLocked = isAutoBetting || hasActivePackage;

    return (
        <Card className="lg:basis-1/3 p-5 flex flex-col border-[#2A3640] bg-[#1A2328] rounded-xl">
            <CardContent className="p-0">
                <div className="flex rounded-lg overflow-hidden mb-3 mygame-bg-selector">
                    {(["manual", "auto"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setBetMode(mode)}
                            className={`flex-1 py-2 text-sm font-semibold transition-all mygame-selector-btn${betMode === mode ? " mygame-selector-btn-active" : ""}${stakeLocked ? " mygame-selector-btn-locked" : ""}`}
                            disabled={stakeLocked}
                        >
                            {mode === "manual" ? "Manual" : "Auto"}
                        </button>
                    ))}
                </div>

                <div className="mb-3">
                    <div className={`limbo-bet-slider-shell ${isAutoBetting ? "pointer-events-none opacity-50" : ""}`}>
                        <BetAmountInput
                            min={1}
                            max={walletBalance}
                            step={1}
                            value={betAmount}
                            onChange={setBetAmount}
                            balance={walletBalance}
                            usdMode={false}
                            setUsdMode={() => {}}
                            disabled={isLoading || isResolving || stakeLocked}
                            themeColorBackground="#8CFF00"
                        />
                    </div>
                </div>

                {betMode === "manual" && (
                    <div className="mb-3">
                        <p className="text-sm text-[#9FC0D4] mb-1 mygame-heading">Rounds to Buy</p>
                        <input
                            type="number"
                            min={1}
                            value={numberOfSpins === 0 ? "" : numberOfSpins}
                            onChange={(event) => {
                                const val = event.target.value;
                                if (val === "") {
                                    setNumberOfSpins(0);
                                } else {
                                    setNumberOfSpins(Math.max(1, parseInt(val, 10) || 1));
                                }
                            }}
                            onBlur={(event) => {
                                if (event.target.value === "" || event.target.value === "0") {
                                    setNumberOfSpins(1);
                                }
                            }}
                            disabled={isAutoBetting}
                            className="w-full px-3 py-2 rounded-lg text-sm mygame-input"
                        />

                        <div className="mt-2 px-3 py-1.5 rounded-lg" style={{ background: "#24323A", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <p className="text-xs" style={{ color: "#fff", fontFamily: "Nohemi, sans-serif", fontWeight: 700 }}>
                                {betAmount.toFixed(2)} APE x {numberOfSpins} rounds = {(betAmount * numberOfSpins).toFixed(2)} APE
                            </p>

                        </div>

                        {hasActivePackage && (
                            <div className="mt-2 p-2 rounded-lg text-center mygame-bg-selector">
                                <p className="text-sm text-[#91989C] mb-1 mygame-body">Rounds Left</p>
                                <p className="mygame-rounds-left">
                                    {manualRoundsRemaining}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {betMode === "auto" && (
                    <div className="mb-3">
                        <p className="text-sm text-[#9FC0D4] mb-1 mygame-heading">Number of Bets</p>
                        <input
                            type="number"
                            min={1}
                            value={autoBetCount === 0 ? "" : autoBetCount}
                            onChange={(event) => {
                                const val = event.target.value;
                                if (val === "") {
                                    setAutoBetCount(0);
                                } else {
                                    setAutoBetCount(Math.max(1, parseInt(val, 10) || 1));
                                }
                            }}
                            onBlur={(event) => {
                                if (event.target.value === "" || event.target.value === "0") {
                                    setAutoBetCount(1);
                                }
                            }}
                            disabled={isAutoBetting || remainingAutoBets > 0}
                            className="w-full px-3 py-2 rounded-lg text-sm mygame-input"
                        />

                        {!isAutoBetting && (
                            <div className="mt-2 px-3 py-1.5 rounded-lg" style={{ background: "#24323A", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <p className="text-xs" style={{ color: "#fff", fontFamily: "Nohemi, sans-serif", fontWeight: 700 }}>
                                    {betAmount.toFixed(2)} APE x {autoBetCount} bets = {(betAmount * autoBetCount).toFixed(2)} APE
                                </p>
                            </div>
                        )}

                        {remainingAutoBets > 0 && (
                            <div className="mt-2 p-2 rounded-lg text-center mygame-bg-selector">
                                <p className="text-sm text-[#91989C] mb-1 mygame-body">Rounds Left</p>
                                <p className="mygame-rounds-left">
                                    {remainingAutoBets}
                                </p>
                            </div>
                        )}

                        {(isAutoBetting || autoRoundsPlayed > 0) && (
                            <div className="mt-2 p-2 rounded-lg text-center mygame-bg-selector">
                                <p className="text-sm text-[#91989C] mb-1 mygame-body">Total Payout ({autoRoundsPlayed})</p>
                                <p className="mygame-rounds-left">
                                    {autoTotalPayout.toFixed(2)} APE
                                </p>
                            </div>
                        )}
                    </div>
                )}

            </CardContent>

            <div className="grow" />

            <CardFooter className="p-0 mt-4">
                <div className="w-full flex flex-col gap-3">
                    <div className="text-sm text-[#D8EAFA] space-y-2 mygame-body">
                        <div className="flex items-center justify-between">
                            <span className="mygame-body">Max Bet</span>
                            <strong className="mygame-heading">{walletBalance.toFixed(2)} APE</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="mygame-body">Max Payout</span>
                            <strong className="mygame-heading">{maxPayoutPerGame.toFixed(2)} APE</strong>
                        </div>
                    </div>

                    <Button
                        onClick={betMode === "auto" ? (isAutoBetting ? onStopAutobet : onStartAutobet) : onStart}
                        disabled={betMode === "auto" && isAutoBetting ? false : disabled || betAmount <= 0}
                        className={`w-full text-base mygame-bet-btn${betMode === "auto" && isAutoBetting ? " mygame-bet-btn-stop" : " mygame-bet-btn-play"}`}
                    >
                        {betMode === "auto"
                            ? (isAutoBetting ? "Stop Autobet" : "Start Autobet")
                            : (isLoading || isResolving ? "Rolling..." : "Bet")}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default MyGameSetupCard;
