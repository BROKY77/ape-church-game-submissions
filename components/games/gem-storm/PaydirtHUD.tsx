"use client";

import React from "react";
import type { JackpotPools } from "./paydirtState";
import PaydirtGem, { type GemTier } from "./PaydirtGem";
import { GAME_CONFIG } from "./paydirtConfig";

interface JackpotBarProps {
    pools: JackpotPools;
    bet: number;
}

function formatJackpotValue(betMultiple: number, bet: number): string {
    const value = betMultiple * bet;
    if (value >= 10000) return `${(value / 1000).toFixed(1)}K`;
    if (value >= 1000) return `${value.toFixed(0)}`;
    return value.toFixed(2);
}

const TIERS: ReadonlyArray<{ key: keyof JackpotPools; tier: GemTier; label: string; seed: number }> = [
    { key: "mini",  tier: "mini",  label: "MINI",  seed: 1 },
    { key: "minor", tier: "minor", label: "MINOR", seed: 2 },
    { key: "major", tier: "major", label: "MAJOR", seed: 3 },
    { key: "grand", tier: "grand", label: "GRAND", seed: 4 },
];

export function JackpotBar({ pools, bet }: JackpotBarProps) {
    return (
        <div className="pd-jackpot-bar-wrap">
            <div className="pd-jackpot-bar" role="status" aria-label="Jackpot values">
                {TIERS.map(({ key, tier, label, seed }) => {
                    const text = formatJackpotValue(pools[key], bet);
                    const stacked = (
                        <span className="pd-jackpot-gem-label">
                            <span className="pd-jackpot-gem-label__tier">{label}</span>
                            <span className="pd-jackpot-gem-label__value">{text}</span>
                        </span>
                    );
                    return (
                        <div className={`pd-jackpot-tier pd-jackpot-tier--${tier}`} key={key}>
                            <div className="pd-jackpot-tier__gem">
                                <PaydirtGem tier={tier} label={stacked} labelFontSize={12} seed={seed} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="pd-jackpot-disclaimer">
                Fill whole board for {GAME_CONFIG.JACKPOT_GRAND_START}x!
            </div>
        </div>
    );
}

interface RespinCounterProps {
    remaining: number;
    justReset: boolean;
}

export function RespinCounter({ remaining, justReset }: RespinCounterProps) {
    const classes = ["pd-respin-counter"];
    if (remaining === 1) classes.push("pd-respin-counter--danger");
    else if (remaining === 2) classes.push("pd-respin-counter--warn");
    if (justReset) classes.push("pd-respin-counter--reset");

    return (
        <div className={classes.join(" ")} role="status" aria-live="polite">
            <div className="pd-respin-counter__label">RESPINS LEFT</div>
            <div
                className="pd-respin-counter__value"
                key={`${remaining}-${justReset ? "r" : "n"}`}
            >
                {remaining}
            </div>
        </div>
    );
}

interface RunningTotalProps {
    total: number;
    bet: number;
}

export function RunningTotal({ total, bet }: RunningTotalProps) {
    return (
        <div className="pd-running-total">
            <span className="pd-running-total__label">HOLD TOTAL</span>
            <span className="pd-running-total__value">
                {(total * bet).toFixed(2)} APE
            </span>
        </div>
    );
}

