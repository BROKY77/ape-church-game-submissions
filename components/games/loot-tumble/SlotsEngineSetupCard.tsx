"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { CustomSlider } from "@/components/shared/CustomSlider";
import type { Game } from "@/lib/games";
import type { SessionStats } from "@/components/games/loot-tumble/hooks/useSessionStats";

interface SlotsEngineSetupCardProps {
    game: Game;
    onPlay: () => void;
    onSpin: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    playAgainText?: string;
    currentView: 0 | 1 | 2;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    numberOfSpins: number;
    setNumberOfSpins: (spins: number) => void;
    spinsLeft: number;
    isLoading: boolean;
    isSpinning: boolean;
    totalWin: number;
    walletBalance: number;
    stats: SessionStats;
    turboMode: boolean;
    toggleTurbo: () => void;
    isGamePaused?: boolean;
    autoSpinEnabled?: boolean;
    onAutoSpinToggle?: (enabled: boolean) => void;
    onShowInfo: () => void;
    bonusActive?: boolean;
    bonusSpinsRemaining?: number;
}

const MAX_SPINS = 50;

const SlotsEngineSetupCard: React.FC<SlotsEngineSetupCardProps> = ({
    onPlay,
    onSpin,
    onRewatch,
    onReset,
    onPlayAgain,
    currentView,
    betAmount,
    setBetAmount,
    numberOfSpins,
    setNumberOfSpins,
    spinsLeft,
    isLoading,
    isSpinning,
    totalWin,
    walletBalance,
    turboMode,
    toggleTurbo,
    isGamePaused = false,
    autoSpinEnabled = false,
    onAutoSpinToggle,
    onShowInfo,
    bonusActive = false,
    bonusSpinsRemaining = 0,
}) => {
    const themeColor = "#2d2d2d";
    const betPerSpin = betAmount / (numberOfSpins || 1);
    const totalBuyIn = betAmount;
    const availableSpins = bonusActive ? bonusSpinsRemaining : spinsLeft;

    const getTotalPayoutText = () =>
        `${totalWin.toLocaleString([], { minimumFractionDigits: 0, maximumFractionDigits: 3 })} APE`;

    return (
        <Card className="lg:basis-1/3 p-4 md:p-6 flex flex-col relative overflow-hidden text-white shadow-2xl rounded-2xl md:rounded-3xl border border-white/10 z-20">
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[6px] transform scale-110 opacity-70"
                style={{ backgroundImage: "url('/submissions/loot-tumble/loot tumble loading bg.webp')" }}
            />
            <div className="absolute inset-0 z-0 bg-black/50" />

            <div className="relative z-10 flex flex-col h-full w-full">
                {currentView === 0 && (
                    <>
                        <CardContent className="font-roboto p-2 md:p-4">
                            <Button
                                onClick={onPlay}
                                className="lg:hidden w-full text-lg font-bold uppercase tracking-wider h-14 rounded-full bg-gradient-to-b from-lime-400 to-green-600 hover:from-lime-300 hover:to-green-500 text-black border-2 border-green-800 shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all"
                                disabled={betAmount <= 0 || isGamePaused}
                            >
                                Place Your Bet
                            </Button>

                            <div className="mt-5">
                                <BetAmountInput
                                    min={0}
                                    max={walletBalance}
                                    step={0.1}
                                    value={betAmount}
                                    onChange={setBetAmount}
                                    balance={walletBalance}
                                    usdMode={false}
                                    setUsdMode={() => {}}
                                    disabled={isLoading}
                                    themeColorBackground={themeColor}
                                />
                            </div>

                            <div className="mt-8">
                                <CustomSlider
                                    label="Number of Spins"
                                    min={1}
                                    max={MAX_SPINS}
                                    step={1}
                                    value={numberOfSpins}
                                    onChange={setNumberOfSpins}
                                    presets={[5, 10, 25, 50]}
                                    themeColor={themeColor}
                                />
                            </div>
                        </CardContent>

                        <div className="grow" />

                        <CardFooter className="mt-4 md:mt-8 w-full flex flex-col font-roboto p-2 md:p-4">
                            <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-slate-300 bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="w-full flex justify-between items-center gap-2">
                                    <p>Configured Spins</p>
                                    <p className="text-right text-white">{numberOfSpins}</p>
                                </div>
                                <div className="w-full flex justify-between items-center gap-2">
                                    <p>Bet Per Spin</p>
                                    <p className="text-right text-white">{betPerSpin.toFixed(3)} APE</p>
                                </div>
                                <div className="w-full flex justify-between items-center gap-2">
                                    <p>Total Buy In</p>
                                    <p className="text-right text-white">{totalBuyIn.toFixed(3)} APE</p>
                                </div>
                                <div className="w-full flex justify-between items-center gap-2 text-amber-300 mt-2 pt-2 border-t border-white/10">
                                    <p>Wallet Balance</p>
                                    <p className="text-right">{walletBalance.toFixed(2)} APE</p>
                                </div>
                            </div>

                            <div className="hidden lg:flex items-center gap-4 mt-6 w-full">
                                <button
                                    onClick={onShowInfo}
                                    className="shrink-0 hover:scale-110 active:scale-95 transition-transform cursor-pointer drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                    aria-label="Game Info"
                                >
                                    <img src="/submissions/loot-tumble/info.webp" alt="Info" className="w-16 h-16 object-contain" draggable={false} />
                                </button>
                                <Button
                                    onClick={onPlay}
                                    className="flex-grow text-xl font-bold uppercase tracking-wider h-16 rounded-full bg-gradient-to-b from-lime-400 to-green-600 hover:from-lime-300 hover:to-green-500 text-black border-2 border-green-800 shadow-[0_6px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all"
                                    disabled={betAmount <= 0 || isGamePaused}
                                >
                                    Place Your Bet
                                </Button>
                            </div>

                            <div className="lg:hidden mt-4 self-start">
                                <button
                                    onClick={onShowInfo}
                                    className="hover:scale-110 active:scale-95 transition-transform cursor-pointer drop-shadow-md"
                                    aria-label="Game Info"
                                >
                                    <img src="/submissions/loot-tumble/info.webp" alt="Info" className="w-12 h-12 object-contain" draggable={false} />
                                </button>
                            </div>
                        </CardFooter>
                    </>
                )}

                {currentView === 1 && (
                    <CardContent className="grow font-roboto flex flex-col-reverse lg:flex-col lg:justify-between gap-6 p-2 md:p-4">
                        {bonusActive && (
                            <div className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-center shadow-[0_0_20px_rgba(34,211,238,0.18)]">
                                <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">Bonus Round</p>
                                <p className="mt-1 text-lg font-black text-amber-200">{bonusSpinsRemaining} Free Spins Left</p>
                                <p className="text-xs text-slate-300 mt-1">3 touching scatters add 3 more free spins.</p>
                            </div>
                        )}

                        <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-slate-300 bg-black/40 p-4 rounded-xl border border-white/10 shadow-inner">
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Bet Per Spin</p>
                                <p className="text-right text-white font-bold">{betPerSpin.toFixed(3)}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Buy In</p>
                                <p className="text-right text-white font-bold">{totalBuyIn.toFixed(3)}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2 mt-2 pt-2 border-t border-white/10">
                                <p>Total Payout</p>
                                <p className={`text-right font-bold text-lg ${totalWin > totalBuyIn ? "text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]" : "text-white"}`}>
                                    {getTotalPayoutText()}
                                </p>
                            </div>
                        </div>

                        <div className={`hidden lg:flex flex-col items-center justify-center rounded-2xl py-6 border-4 shadow-inner ${bonusActive ? "bg-[#06141c] border-cyan-500/40 shadow-[0_0_18px_rgba(34,211,238,0.18)]" : "bg-[#1a1a1a] border-[#333]"}`}>
                            <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${bonusActive ? "text-cyan-300" : "text-slate-400"}`}>
                                {bonusActive ? "Bonus Spins" : "Spins Left"}
                            </p>
                            <p className="font-black text-5xl text-white drop-shadow-md">
                                {availableSpins}
                                {!bonusActive && <span className="text-slate-500 text-3xl"> / {numberOfSpins}</span>}
                            </p>
                            {bonusActive && <p className="mt-2 text-xs text-slate-400">Base spins paused: {spinsLeft}</p>}
                        </div>

                        <div className="flex lg:flex-col justify-evenly items-center w-full mt-4">
                            <div className={`lg:hidden flex flex-col items-center justify-center rounded-xl px-4 py-2 border-2 shadow-inner mr-4 ${bonusActive ? "bg-[#06141c] border-cyan-500/40" : "bg-[#1a1a1a] border-[#333]"}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${bonusActive ? "text-cyan-300" : "text-slate-400"}`}>
                                    {bonusActive ? "Bonus" : "Spins"}
                                </p>
                                <p className="font-black text-2xl text-white">
                                    {availableSpins}
                                    {!bonusActive && <span className="text-slate-500 text-sm">/{numberOfSpins}</span>}
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-4 grow lg:w-full">
                                <button
                                    onClick={onSpin}
                                    className="w-full max-w-[280px] h-20 md:h-24 mx-auto transition-transform active:scale-95 disabled:active:scale-100 disabled:opacity-80 disabled:cursor-not-allowed"
                                    disabled={isSpinning || isGamePaused || (availableSpins <= 0 && !autoSpinEnabled)}
                                    aria-label="Spin"
                                >
                                    <img
                                        src={
                                            (isSpinning || isGamePaused || (availableSpins <= 0 && !autoSpinEnabled))
                                                ? "/submissions/loot-tumble/spin disabled.png"
                                                : isSpinning
                                                    ? "/submissions/loot-tumble/spin pressed.png"
                                                    : "/submissions/loot-tumble/spin.png"
                                        }
                                        alt="Spin"
                                        className="w-full h-full object-contain drop-shadow-lg"
                                        draggable={false}
                                    />
                                </button>

                                <div className={`flex items-center justify-center gap-6 w-full bg-black/30 rounded-full py-2 px-4 transition-all duration-300 ${autoSpinEnabled && turboMode ? "shadow-[0_0_15px_rgba(0,255,255,0.5)] border border-cyan-400/50" : ""}`}>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoSpinEnabled}
                                            onChange={(e) => onAutoSpinToggle?.(e.target.checked)}
                                            disabled={availableSpins <= 0 || isGamePaused}
                                            className={`w-5 h-5 rounded border-gray-500 cursor-pointer ${autoSpinEnabled && turboMode ? "accent-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] animate-pulse" : "accent-lime-500"}`}
                                        />
                                        <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${autoSpinEnabled && turboMode ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] animate-pulse" : autoSpinEnabled ? "text-lime-400" : "text-slate-400"}`}>
                                            Auto
                                        </span>
                                    </label>
                                    <div className={`h-6 w-px ${autoSpinEnabled && turboMode ? "bg-cyan-400/50 shadow-[0_0_5px_#0ff]" : "bg-white/20"}`} />
                                    <button
                                        onClick={toggleTurbo}
                                        disabled={isGamePaused}
                                        className="relative w-24 h-10 transition-all active:translate-y-1 active:scale-95 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:translate-y-0 disabled:active:scale-100"
                                    >
                                        <img
                                            src="/submissions/loot-tumble/turbo.png"
                                            alt="Turbo Spin"
                                            className={`w-full h-full object-contain transition-all ${autoSpinEnabled && turboMode ? "drop-shadow-[0_0_15px_rgba(0,255,255,0.8)] animate-pulse" : turboMode ? "drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" : "opacity-70 grayscale-[50%]"}`}
                                            draggable={false}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}

                {currentView === 2 && (
                    <CardContent className="grow font-roboto flex flex-col justify-between gap-6 p-2 md:p-4">
                        <div className="text-center bg-black/50 py-6 rounded-2xl border-2 border-white/10 mb-4">
                            <p className={`text-4xl font-black uppercase tracking-widest drop-shadow-lg ${totalWin > totalBuyIn ? "text-lime-400" : "text-amber-500"}`}>
                                {totalWin > totalBuyIn ? "Total Win!" : "Game Over"}
                            </p>
                            {totalWin > totalBuyIn && (
                                <p className="text-3xl font-bold text-white mt-2">
                                    +{(totalWin - totalBuyIn).toFixed(2)} APE
                                </p>
                            )}
                        </div>

                        <div className="w-full flex flex-col items-center gap-3 font-medium text-sm text-slate-300 bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Spins</p>
                                <p className="text-right text-white">{numberOfSpins}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Buy In</p>
                                <p className="text-right text-white">{totalBuyIn.toFixed(3)}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Total Payout</p>
                                <p className={`text-right font-bold ${totalWin > totalBuyIn ? "text-lime-400" : "text-white"}`}>
                                    {getTotalPayoutText()}
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2 mt-2 pt-2 border-t border-white/10 text-amber-300">
                                <p>Wallet Balance</p>
                                <p className="text-right">{walletBalance.toFixed(2)} APE</p>
                            </div>
                        </div>

                        <div className="w-full flex flex-col gap-3 mt-auto">
                            <Button
                                className="w-full h-14 text-lg font-bold uppercase tracking-widest rounded-full bg-gradient-to-b from-lime-400 to-green-600 hover:from-lime-300 hover:to-green-500 text-black border-2 border-green-800 shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all"
                                onClick={onPlayAgain}
                                disabled={isGamePaused}
                            >
                                Play Again
                            </Button>
                            <div className="flex gap-3">
                                <Button
                                    className="w-1/2 h-12 rounded-full font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white"
                                    variant="ghost"
                                    onClick={onRewatch}
                                >
                                    Rewatch
                                </Button>
                                <Button
                                    className="w-1/2 h-12 rounded-full font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white"
                                    variant="ghost"
                                    onClick={onReset}
                                >
                                    Change Bet
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </div>
        </Card>
    );
};

export default SlotsEngineSetupCard;

