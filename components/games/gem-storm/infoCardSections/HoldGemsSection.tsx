"use client";

import React from "react";
import { GAME_CONFIG } from "../paydirtConfig";

const TOTAL = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS;
const MARKERS = GAME_CONFIG.MARKER_POSITIONS as readonly number[];
const MARKER_SET = new Set<number>(MARKERS);
const FILL_INDEX: Record<number, number> = {};
MARKERS.forEach((idx, i) => { FILL_INDEX[idx] = i; });

export default function HoldGemsSection() {
    return (
        <section className="pd-info-section">
            <h3 className="pd-info-section__title">Hold the Gems</h3>
            <p className="pd-info-section__body">
                Fill <strong>all four markers</strong> on a single spin to lock the
                board and trigger the bonus round.
            </p>
            <div
                className="pd-info-mini-grid pd-info-mini-grid--hold"
                data-active="1"
                aria-hidden="true"
            >
                {Array.from({ length: TOTAL }).map((_, i) => {
                    const isMarker = MARKER_SET.has(i);
                    const fillIdx = isMarker ? FILL_INDEX[i] : -1;
                    return (
                        <div
                            key={i}
                            className={`pd-info-mini-cell${isMarker ? " pd-info-mini-cell--marker pd-info-mini-cell--fills" : ""}`}
                            style={isMarker ? { animationDelay: `${fillIdx * 220}ms` } : undefined}
                        />
                    );
                })}
            </div>
            <p className="pd-info-section__caption">"HOLD THE GEMS" appears, every gem freezes in place.</p>
        </section>
    );
}
