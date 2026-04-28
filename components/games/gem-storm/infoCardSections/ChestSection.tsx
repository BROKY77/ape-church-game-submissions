"use client";

import React, { useEffect, useRef, useState } from "react";

const CYCLE = [2, 3, 5, 10, 25, 100];
const SETTLE = 5;

/** Mirrors the in-game chest reveal flow (Paydirt.tsx:620-670):
 *  the chest tile sits in a cell, then the spinning multiplier reveal
 *  (`pd-chest-flip-spin` keyframe — 3D rotateY, 1080° in 900ms) overlays it,
 *  cycling through candidate multipliers and settling on the rolled value. */
export default function ChestSection() {
    const [label, setLabel] = useState<string>(`${CYCLE[0]}×`);
    const [stage, setStage] = useState<"spin" | "settle" | "fade">("spin");
    const cycleIdxRef = useRef(0);

    useEffect(() => {
        let intervalId: number | null = null;
        let settleTimeout: number;
        let fadeTimeout: number;
        let restartTimeout: number;

        const start = () => {
            setStage("spin");
            cycleIdxRef.current = 0;
            setLabel(`${CYCLE[0]}×`);
            intervalId = window.setInterval(() => {
                cycleIdxRef.current = (cycleIdxRef.current + 1) % CYCLE.length;
                setLabel(`${CYCLE[cycleIdxRef.current]}×`);
            }, 95);

            settleTimeout = window.setTimeout(() => {
                if (intervalId !== null) window.clearInterval(intervalId);
                setLabel(`${SETTLE}×`);
                setStage("settle");
            }, 900);

            fadeTimeout = window.setTimeout(() => {
                setStage("fade");
            }, 900 + 700);

            restartTimeout = window.setTimeout(start, 900 + 700 + 1100);
        };

        start();
        return () => {
            if (intervalId !== null) window.clearInterval(intervalId);
            window.clearTimeout(settleTimeout);
            window.clearTimeout(fadeTimeout);
            window.clearTimeout(restartTimeout);
        };
    }, []);

    return (
        <section className="pd-info-section">
            <h3 className="pd-info-section__title">Chests</h3>
            <p className="pd-info-section__body">
                Some respin landings drop a chest instead of a gem. Each chest reveals
                a multiplier between <strong>2× and 100×</strong> and applies it to
                every gem already on the board.
            </p>

            <div className="pd-info-chest-demo" aria-hidden="true">
                <div className="pd-info-chest-cell">
                    {/* Real chest tile from the game */}
                    <img
                        src="/submissions/gem-storm/gems/gem-chest.webp"
                        alt=""
                        className="pd-info-chest-cell__img"
                        draggable={false}
                    />
                    {/* Spinning multiplier reveal — same DOM/animation as the
                        live game (see startChestCoinFlip in Paydirt.tsx) */}
                    <div
                        className={`pd-chest-flip pd-info-chest-flip${stage === "settle" ? " pd-chest-flip--settled" : ""}${stage === "fade" ? " pd-chest-flip--fade" : ""}`}
                        key={stage === "spin" ? "spin" : stage}
                    >
                        <div className="pd-chest-flip__face">
                            <img
                                className="pd-chest-flip__gem"
                                src="/submissions/gem-storm/gems/gem-octagon.webp"
                                alt=""
                                draggable={false}
                            />
                            <span className="pd-chest-flip__label">{label}</span>
                        </div>
                    </div>
                </div>
            </div>

            <p className="pd-info-section__caption">
                You can get multiple chests in a single round, but chests don't
                multiply each other — each one only multiplies the gems already on
                the board when it lands.
            </p>
        </section>
    );
}
