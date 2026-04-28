"use client";

import React from "react";
import PaydirtGem from "../PaydirtGem";
import { GAME_CONFIG } from "../paydirtConfig";

const TIERS = [
    { tier: "mini" as const,  label: "MINI",  payout: GAME_CONFIG.JACKPOT_MINI },
    { tier: "minor" as const, label: "MINOR", payout: GAME_CONFIG.JACKPOT_MINOR },
    { tier: "major" as const, label: "MAJOR", payout: GAME_CONFIG.JACKPOT_MAJOR_START },
    { tier: "grand" as const, label: "GRAND", payout: GAME_CONFIG.JACKPOT_GRAND_START },
];

export default function JackpotsSection() {
    return (
        <section className="pd-info-section">
            <h3 className="pd-info-section__title">Jackpots</h3>
            <p className="pd-info-section__body">
                Four jackpot tiers. The Grand triggers when you fill the entire 5×5
                grid during the bonus round.
            </p>
            <div className="pd-info-jackpot-row" aria-hidden="true">
                {TIERS.map(({ tier, label, payout }, i) => (
                    <div key={tier} className="pd-info-jackpot-cell">
                        <div className="pd-info-jackpot-gem">
                            <PaydirtGem
                                tier={tier}
                                label=""
                                labelFontSize={0}
                                seed={i}
                                simplified
                            />
                        </div>
                        <div className="pd-info-jackpot-name">{label}</div>
                        <div className="pd-info-jackpot-payout">{payout}× bet</div>
                    </div>
                ))}
            </div>
            <p className="pd-info-section__caption">
                Jackpot gems can land on a marker — when they do, that tier carries
                straight into the bonus.
            </p>
        </section>
    );
}
