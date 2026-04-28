"use client";

import React from "react";
import PaydirtGem from "../PaydirtGem";
import { GAME_CONFIG } from "../paydirtConfig";

export default function RespinsSection() {
    return (
        <section className="pd-info-section">
            <h3 className="pd-info-section__title">Respins</h3>
            <p className="pd-info-section__body">
                You start with <strong>{GAME_CONFIG.RESPINS_INITIAL} respins</strong>. Every
                new gem that lands resets the counter back to {GAME_CONFIG.RESPINS_INITIAL}.
                The round ends when the counter hits zero or the grid fills up.
            </p>
            <div className="pd-info-respin-demo" data-active="1" aria-hidden="true">
                <div className="pd-info-respin-counter">
                    <span className="pd-info-respin-counter__label">Respins</span>
                    <span className="pd-info-respin-counter__value">
                        <span className="pd-info-respin-counter__digit">3</span>
                        <span className="pd-info-respin-counter__digit pd-info-respin-counter__digit--alt">2</span>
                        <span className="pd-info-respin-counter__digit">3</span>
                    </span>
                </div>
                <div className="pd-info-respin-arrow">›</div>
                <div className="pd-info-respin-cell">
                    {/* Real game gem: tier "low" → blue princess-cut diamond
                        (PaydirtGem.tsx variantIndexFromSeed). simplified=true
                        skips shimmer + halo for a single static instance. */}
                    <div className="pd-info-respin-cell__gem">
                        <PaydirtGem tier="low" label="" labelFontSize={0} seed={3} simplified />
                    </div>
                </div>
            </div>
        </section>
    );
}
