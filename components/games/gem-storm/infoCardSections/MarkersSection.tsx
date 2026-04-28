"use client";

import React from "react";
import { GAME_CONFIG } from "../paydirtConfig";

const TOTAL = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS;
const MARKERS = new Set<number>(GAME_CONFIG.MARKER_POSITIONS as readonly number[]);

export default function MarkersSection() {
    return (
        <section className="pd-info-section">
            <h3 className="pd-info-section__title">Diamond Markers</h3>
            <p className="pd-info-section__body">
                Four markers sit in a diamond formation around the centre. Land any
                gem on a marker to light it up.
            </p>
            <div
                className="pd-info-mini-grid"
                data-active="1"
                aria-hidden="true"
            >
                {Array.from({ length: TOTAL }).map((_, i) => (
                    <div
                        key={i}
                        className={`pd-info-mini-cell${MARKERS.has(i) ? " pd-info-mini-cell--marker" : ""}`}
                    />
                ))}
            </div>
        </section>
    );
}
