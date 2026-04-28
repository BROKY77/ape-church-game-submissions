"use client";

import React, { useEffect, useState } from "react";

const SEEN_KEY = "gemstorm:info_seen";

interface Props {
    onOpen: () => void;
}

/** "i" trigger pinned to the top-left of the setup card. Faceted gem
 *  silhouette via clip-path (no SVG), gold gradient + glow. Pulses gently
 *  on first-ever session so new players notice it; flag persists in
 *  localStorage so returning players see it static. */
export default function PaydirtInfoButton({ onOpen }: Props) {
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            if (!window.localStorage.getItem(SEEN_KEY)) setPulse(true);
        } catch {
            // localStorage unavailable (private mode, etc.) — just don't pulse.
        }
    }, []);

    const handleClick = () => {
        if (pulse) {
            setPulse(false);
            try {
                window.localStorage.setItem(SEEN_KEY, "1");
            } catch {
                /* noop */
            }
        }
        onOpen();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`pd-info-btn${pulse ? " pd-info-btn--pulse" : ""}`}
            aria-label="How to play"
            title="How to play"
        >
            <span className="pd-info-btn__glyph" aria-hidden="true">i</span>
        </button>
    );
}
