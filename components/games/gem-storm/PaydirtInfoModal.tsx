"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GemBackdrop } from "./PaydirtGemBackdrop";
import MarkersSection from "./infoCardSections/MarkersSection";
import HoldGemsSection from "./infoCardSections/HoldGemsSection";
import RespinsSection from "./infoCardSections/RespinsSection";
import ChestSection from "./infoCardSections/ChestSection";
import JackpotsSection from "./infoCardSections/JackpotsSection";

interface Props {
    onClose: () => void;
}

export default function PaydirtInfoModal({ onClose }: Props) {
    const [mounted, setMounted] = useState(false);

    // Render-into-body via portal so the modal escapes any transformed
    // ancestor stacking context (the GameWindow or its parents may create
    // one, which would trap our z-index and let the bottom-right mute
    // buttons z-30 paint OVER the modal). Portals render into a node
    // that's a direct child of <body> — no ancestor transforms in scope.
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            className="pd-info-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-info-title"
        >
            <div className="pd-info-card" onClick={(e) => e.stopPropagation()}>
                <header className="pd-info-card__header">
                    <div className="pd-info-card__title-wrap">
                        <GemBackdrop palette="gold" />
                        <span id="pd-info-title" className="pd-info-card__title">
                            How To Play
                        </span>
                    </div>
                    <button
                        type="button"
                        className="pd-info-card__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <div className="pd-info-card__body">
                    <MarkersSection />
                    <HoldGemsSection />
                    <RespinsSection />
                    <ChestSection />
                    <JackpotsSection />
                </div>
            </div>
        </div>,
        document.body,
    );
}
