"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CelebrationTier } from "./paydirtConfig";
import { GemBackdrop } from "./PaydirtGemBackdrop";

interface PaydirtCelebrationProps {
    tier: CelebrationTier | null;
    payoutApe: number;
}

export default function PaydirtCelebration({ tier, payoutApe }: PaydirtCelebrationProps) {
    const [displayed, setDisplayed] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!tier || tier.threshold === 0) {
            setDisplayed(0);
            return;
        }
        const start = performance.now();
        const duration = Math.min(tier.duration * 0.6, 3000);
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            // Ease-out-quart for satisfying deceleration at the end.
            const eased = 1 - Math.pow(1 - t, 4);
            setDisplayed(payoutApe * eased);
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [tier, payoutApe]);

    if (!tier || tier.threshold === 0) return null;

    return (
        <div className="pd-celebration" aria-live="polite" aria-atomic="true">
            {tier.overlay && (
                <div className="pd-celebration__text">
                    <GemBackdrop palette="amethyst" />
                    <span className="pd-celebration__text-inner">{tier.overlay}</span>
                </div>
            )}
            <div className="pd-celebration__amount">
                <GemBackdrop palette="gold" />
                <span className="pd-celebration__amount-inner">
                    {displayed.toFixed(2)} APE
                </span>
            </div>
        </div>
    );
}

interface TriggerOverlayProps {
    visible: boolean;
}

export function TriggerOverlay({ visible }: TriggerOverlayProps) {
    if (!visible) return null;
    const text = "HOLD THE GEMS";
    return (
        <div className="pd-trigger-overlay" aria-live="polite">
            <div className="pd-trigger-overlay__text">
                <GemBackdrop palette="amethyst" />
                <span className="pd-trigger-overlay__text-inner">
                    {text.split("").map((ch, i) => (
                        <span key={i} style={{ animationDelay: `${i * 30}ms` }}>
                            {ch === " " ? "\u00A0" : ch}
                        </span>
                    ))}
                </span>
            </div>
        </div>
    );
}
