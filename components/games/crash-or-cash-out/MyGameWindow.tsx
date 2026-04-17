"use client";

import React from "react";
import useSound from 'use-sound';
import { Game } from "@/lib/games";
import { Rocket } from "lucide-react";

interface MyGameWindowProps {
    game: Game;
    currentMultiplier: number;
    isClimbing: boolean;
    hasCrashed: boolean;
    hasCashedOut: boolean;
    cashedOutAt: number | null;
}

const MyGameWindow: React.FC<MyGameWindowProps> = ({
    game,
    currentMultiplier,
    isClimbing,
    hasCrashed,
    hasCashedOut,
    cashedOutAt,
}) => {
    const muteSfx = false;
    const sfxVolume = 0.5;

    const [winSFX] = useSound('/submissions/crash-or-cash-out/sfx/win.mp3', {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true
    });
    const [loseSFX] = useSound('/submissions/crash-or-cash-out/sfx/lose.mp3', {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true
    });

    const getStatusText = () => {
        if (hasCashedOut && cashedOutAt) {
            return `Cashed Out at ${cashedOutAt.toFixed(2)}x`;
        }
        if (hasCrashed) {
            return `CRASHED at ${currentMultiplier.toFixed(2)}x`;
        }
        if (isClimbing) {
            return "Cash out before it crashes!";
        }
        return "Place your bet to start";
    };

    const getStatusColor = () => {
        if (hasCashedOut) return "text-green-400";
        if (hasCrashed) return "text-red-500";
        if (isClimbing) return "text-yellow-400";
        return "text-white/70";
    };

    return (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-white">
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
                <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8">
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
                            Crash or Cash Out
                        </h2>

                        <div className={`relative transition-all duration-300 ${isClimbing ? 'animate-bounce' : ''}`}>
                            <Rocket
                                className={`w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 transition-all duration-500 ${
                                    hasCrashed
                                        ? 'text-red-500 opacity-30 rotate-180'
                                        : hasCashedOut
                                        ? 'text-green-400'
                                        : isClimbing
                                        ? 'text-yellow-400'
                                        : 'text-white/50'
                                }`}
                            />
                            {hasCrashed && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-6xl sm:text-7xl md:text-8xl animate-pulse">
                                        💥
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                        <div className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold transition-all duration-200 ${
                            hasCrashed
                                ? 'text-red-500'
                                : hasCashedOut
                                ? 'text-green-400'
                                : isClimbing
                                ? 'text-yellow-400 animate-pulse'
                                : 'text-white'
                        }`}>
                            {currentMultiplier.toFixed(2)}x
                        </div>

                        <p className={`text-sm sm:text-base md:text-lg font-semibold ${getStatusColor()}`}>
                            {getStatusText()}
                        </p>
                    </div>

                    {!isClimbing && !hasCrashed && !hasCashedOut && (
                        <div className="text-center text-white/60 text-xs sm:text-sm space-y-1 max-w-md">
                            <p className="font-medium">How to Play:</p>
                            <p>Place a bet and watch the multiplier climb</p>
                            <p>Cash out before the rocket crashes to win!</p>
                            <p className="text-yellow-400/80 mt-2">Higher multiplier = Higher risk!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyGameWindow;
