"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Info, Zap } from "lucide-react";
import { GAME_CONFIG } from "./paydirtConfig";

interface PaydirtSetupCardProps {
    currentView: 0 | 1 | 2;
    bet: number;
    setBet: (v: number) => void;
    balance: number;
    isLoading: boolean;
    inReplayMode: boolean;
    canReplay: boolean;
    onPlay: () => void;
    onSpin: () => void;
    onPlayAgain: () => void;
    onRewatch: () => void;
    onReset: () => void;
    lastWin: number;
    autoSpinsRemaining: number;
    onStartAutoSpin: (count: number) => void;
    /** Spin speed preset. */
    speed: "slow" | "fast" | "turbo";
    onSetSpeed: (next: "slow" | "fast" | "turbo") => void;
}


export default function PaydirtSetupCard({
    currentView,
    bet,
    setBet,
    balance,
    isLoading,
    inReplayMode,
    canReplay,
    onPlay,
    onPlayAgain,
    onRewatch,
    onReset,
    lastWin,
    autoSpinsRemaining,
    onStartAutoSpin,
    speed,
    onSetSpeed,
}: PaydirtSetupCardProps) {
    const themeColor = "#D4902A";
    const canPlay = bet > 0 && bet <= balance && !isLoading;
    const autoSpinning = autoSpinsRemaining > 0;
    const maxAffordable = Math.max(1, Math.floor(balance / Math.max(bet, 0.01)));
    // Cap the slider at 100 spins per purchase or whatever balance allows.
    const sliderMax = Math.min(100, maxAffordable);
    const [bulkCount, setBulkCount] = React.useState(10);
    const clampedCount = Math.max(1, Math.min(sliderMax, bulkCount));
    const bulkCost = bet * clampedCount;
    const canBuyBulk = !autoSpinning && !isLoading && bulkCost <= balance && clampedCount >= 1;

    // During a bulk-spin purchase, the setup card becomes a status-only
    // readout. No STOP / Change Bet controls — the whole bulk purchase is
    // a single on-chain transaction that must play out to completion.
    if (autoSpinning) {
        return (
            <Card className="lg:basis-1/3 p-3 lg:p-6 flex flex-col">
                <CardContent className="font-roboto flex flex-col gap-6 grow justify-center">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            Bulk Spin Playing
                        </p>
                        <p className="text-2xl font-semibold" style={{ color: themeColor }}>
                            {autoSpinsRemaining} spin{autoSpinsRemaining === 1 ? "" : "s"} left
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {bet.toFixed(2)} APE each
                        </p>
                    </div>
                    {lastWin > 0 && (
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                Last Win
                            </p>
                            <p className="text-xl font-bold" style={{ color: themeColor }}>
                                {lastWin.toFixed(2)} APE
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    const maxBet = Math.min(GAME_CONFIG.MAX_BET, balance);
    const betIncrements = [0.1, 0.5, 1, 5];
    const spinPresets = [10, 25, 50];
    const clampBet = (next: number) => Math.max(GAME_CONFIG.MIN_BET, Math.min(maxBet, Math.round(next * 10) / 10));
    const maxPayoutPerGame = bet * GAME_CONFIG.JACKPOT_GRAND_START;

    return (
        <Card className="lg:basis-1/3 p-3 lg:p-6 flex flex-col">
            {currentView === 0 && (
                <>
                    {/* Single flex column for view 0 so mobile and desktop
                        can re-order via Tailwind `order`/`lg:order` without
                        duplicating markup.
                          Mobile  (<lg): Buy → Bet → Spins → Speed → Stats → Dev
                          Desktop (lg+): Bet → Spins → Stats → Speed → Buy → Dev */}
                    <CardContent className="font-roboto flex flex-col gap-3 lg:gap-7">
                        {/* ──────────── Bet Amount ──────────── */}
                        <div className="order-2 lg:order-1 flex flex-col gap-2 lg:gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs lg:text-sm text-muted-foreground">Bet Amount</h3>
                                <div className="flex items-center gap-2 text-xs lg:text-sm">
                                    <Wallet size={14} className="text-muted-foreground" />
                                    <span className="tabular-nums font-medium">{balance.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border/70 bg-background/40 px-3 lg:px-4 py-1.5 lg:py-3 flex items-center gap-2 lg:gap-3">
                                <Image
                                    src="/shared/ape_coin.png"
                                    alt="APE"
                                    width={18}
                                    height={18}
                                    className="shrink-0"
                                />
                                <span className="text-xl lg:text-3xl font-semibold tabular-nums tracking-tight">
                                    {bet.toFixed(2)}
                                </span>
                            </div>

                            <input
                                type="range"
                                aria-label="Bet amount"
                                min={GAME_CONFIG.MIN_BET}
                                max={maxBet}
                                step={0.1}
                                value={bet}
                                onChange={(e) => setBet(parseFloat(e.target.value))}
                                disabled={isLoading}
                                className="w-full h-2 cursor-pointer"
                                style={{ accentColor: themeColor }}
                            />

                            <div className="grid grid-cols-4 gap-1.5 lg:gap-2">
                                {betIncrements.map((inc) => {
                                    const disabled = isLoading || bet + inc > maxBet;
                                    return (
                                        <button
                                            key={inc}
                                            type="button"
                                            onClick={() => setBet(clampBet(bet + inc))}
                                            disabled={disabled}
                                            className="rounded-lg border border-border/70 bg-background/40 py-1.5 lg:py-2.5 text-xs lg:text-sm font-medium tabular-nums hover:bg-background/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            +{inc.toFixed(inc < 1 ? 1 : 0)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ──────────── Number of Spins ──────────── */}
                        <div className="order-3 lg:order-2 flex flex-col gap-2 lg:gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs lg:text-sm text-muted-foreground">Number of Spins</h3>
                                <span className="text-lg lg:text-2xl font-bold tabular-nums" style={{ color: themeColor }}>
                                    {clampedCount}
                                </span>
                            </div>

                            <input
                                type="range"
                                aria-label="Number of spins"
                                min={1}
                                max={sliderMax}
                                step={1}
                                value={clampedCount}
                                onChange={(e) => setBulkCount(parseInt(e.target.value, 10))}
                                disabled={isLoading || sliderMax < 2}
                                className="w-full h-2 cursor-pointer"
                                style={{ accentColor: themeColor }}
                            />

                            <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                                {spinPresets.map((count) => {
                                    const disabled = count > sliderMax;
                                    const selected = clampedCount === count;
                                    return (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setBulkCount(count)}
                                            disabled={disabled}
                                            className="rounded-lg py-1.5 lg:py-2.5 text-xs lg:text-sm font-semibold tabular-nums transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={
                                                selected
                                                    ? { backgroundColor: themeColor, color: "#1a0f2a", border: `1px solid ${themeColor}` }
                                                    : { backgroundColor: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)" }
                                            }
                                        >
                                            {count}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ──────────── Stats ──────────── */}
                        <div className="order-5 lg:order-3 flex flex-col gap-1 lg:gap-2 text-xs lg:text-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <span>Total Bet Amount</span>
                                    <Info size={14} className="opacity-60" />
                                </div>
                                <span className="tabular-nums">{bulkCost.toFixed(2)} APE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Bet Per Spin</span>
                                <span className="tabular-nums">{bet.toFixed(2)} APE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Max Payout Per Game</span>
                                <span className="tabular-nums">{maxPayoutPerGame.toFixed(0)} APE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Max Bet Amount</span>
                                <span className="tabular-nums">{GAME_CONFIG.MAX_BET.toFixed(2)} APE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Minimum Bet Per Spin</span>
                                <span className="tabular-nums">{GAME_CONFIG.MIN_BET.toFixed(2)} APE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">RTP</span>
                                <span className="tabular-nums">{(GAME_CONFIG.TARGET_RTP * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Speed preset — three-way segmented control.
                            Slow = cinematic (original timings).
                            Fast = tightened default.
                            Turbo = base-spin blast mode; bonus still plays
                            at Fast so gems are legible.
                            Mobile: order 4 (below sliders, above stats... actually above stats since stats is order-5). Desktop: order 4 (below stats, above buy). */}
                        <div
                            role="radiogroup"
                            aria-label="Spin speed"
                            className="order-4 lg:order-4 w-full grid grid-cols-3 gap-1 rounded-lg border p-0.5 lg:p-1"
                            style={{
                                backgroundColor: "rgba(0,0,0,0.25)",
                                borderColor: "rgba(255,255,255,0.08)",
                            }}
                        >
                            {(["slow", "fast", "turbo"] as const).map((mode) => {
                                const selected = speed === mode;
                                const label = mode === "slow" ? "Slow" : mode === "fast" ? "Fast" : "Turbo";
                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => onSetSpeed(mode)}
                                        disabled={isLoading}
                                        className="flex items-center justify-center gap-1.5 rounded-md py-1 lg:py-1.5 text-xs lg:text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={
                                            selected
                                                ? { backgroundColor: themeColor, color: "#1a0f2a" }
                                                : { backgroundColor: "transparent", color: "rgba(255,255,255,0.7)" }
                                        }
                                    >
                                        {mode === "turbo" && (
                                            <Zap size={13} fill={selected ? "#1a0f2a" : "none"} />
                                        )}
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Buy button — mobile order 1 (top of card), desktop
                            order 5 (between speed switcher and dev buttons). */}
                        <Button
                            onClick={() => {
                                if (clampedCount === 1) onPlay();
                                else onStartAutoSpin(clampedCount);
                            }}
                            disabled={!canPlay || autoSpinning || (clampedCount > 1 && !canBuyBulk)}
                            className="order-1 lg:order-5 w-full text-base lg:text-lg font-bold py-3 lg:py-6"
                            style={{
                                backgroundColor: themeColor,
                                borderColor: themeColor,
                            }}
                        >
                            {isLoading
                                ? "Spinning..."
                                : clampedCount === 1
                                    ? `Spin — ${bet.toFixed(2)} APE`
                                    : `Buy ${clampedCount} Spins — ${bulkCost.toFixed(2)} APE`}
                        </Button>
                    </CardContent>
                </>
            )}

            {currentView === 1 && (
                <CardContent className="flex flex-col items-center justify-center gap-4 grow">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Bet</p>
                        <p className="text-2xl font-semibold" style={{ color: themeColor }}>
                            {bet.toFixed(2)} APE
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center italic">
                        Panning the river...
                    </p>
                </CardContent>
            )}

            {currentView === 2 && (
                <CardContent className="flex flex-col gap-6 grow">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Last Win</p>
                        <p
                            className="text-3xl font-bold"
                            style={{
                                color: lastWin > 0 ? themeColor : "var(--muted-foreground)",
                            }}
                        >
                            {lastWin.toFixed(2)} APE
                        </p>
                        {inReplayMode && (
                            <p className="mt-2 text-sm italic" style={{ color: themeColor }}>
                                Replay Mode
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 mt-auto">
                        {canReplay ? (
                            <Button
                                onClick={() => {
                                    // Play Again honors whatever bulk count was
                                    // selected before the previous game. Single
                                    // spin → onPlayAgain; bulk → re-queue the
                                    // same count via onStartAutoSpin.
                                    if (clampedCount === 1) onPlayAgain();
                                    else onStartAutoSpin(clampedCount);
                                }}
                                disabled={
                                    bet > balance ||
                                    isLoading ||
                                    (clampedCount > 1 && !canBuyBulk)
                                }
                                className="w-full"
                                style={{
                                    backgroundColor: themeColor,
                                    borderColor: themeColor,
                                }}
                            >
                                {clampedCount === 1
                                    ? `Play Again — ${bet.toFixed(2)} APE`
                                    : `Buy ${clampedCount} Spins — ${bulkCost.toFixed(2)} APE`}
                            </Button>
                        ) : (
                            <Button
                                onClick={onRewatch}
                                variant="secondary"
                                className="w-full"
                            >
                                Rewatch
                            </Button>
                        )}
                        <Button
                            onClick={onReset}
                            variant="secondary"
                            className="w-full"
                        >
                            Change Bet
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
