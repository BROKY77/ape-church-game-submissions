"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useSound from "use-sound";
import { WHEEL_SLICES } from "./axeRouletteConfig";
import "./axe-roulette.styles.css";

export type SpinPhase = "idle" | "spinning" | "hitting" | "stopped";

interface AxeRouletteWindowProps {
  spinPhase: SpinPhase;
  wheelRotation: number;
  gameResult: "win" | "loss" | null;
  isGameOver: boolean;
  muteSfx: boolean;
}

const CX = 200;
const CY = 200;
const R = 178;
const AXE_FRAME_COUNT = 11;
// Full rotation ends back on frame 1 (same orientation as throw start)
const STUCK_FRAME = 1;
// 30ms per frame × 11 frames = 330ms total (matches AXE_FLIGHT in AxeRoulette.tsx)
const FRAME_INTERVAL_MS = 30;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

// Pixelated circle clip — step=12, R=192, cx=200, cy=200
const PIXEL_CIRCLE_POINTS =
  "128,20 272,20 272,32 296,32 296,44 308,44 308,56 332,56 332,68 344,68 " +
  "344,92 356,92 356,104 368,104 368,128 380,128 380,164 392,164 392,236 " +
  "380,236 380,272 368,272 368,296 356,296 356,308 344,308 344,332 332,332 " +
  "332,344 308,344 308,356 296,356 296,368 272,368 272,380 128,380 128,368 " +
  "104,368 104,356 92,356 92,344 68,344 68,332 56,332 56,308 44,308 44,296 " +
  "32,296 32,272 20,272 20,236 8,236 8,164 20,164 20,128 32,128 32,104 " +
  "44,104 44,92 56,92 56,68 68,68 68,56 92,56 92,44 104,44 104,32 128,32";

const AxeRouletteWindow: React.FC<AxeRouletteWindowProps> = ({
  spinPhase,
  wheelRotation,
  gameResult,
  isGameOver,
  muteSfx,
}) => {
  const sfxOpts = { interrupt: true, soundEnabled: !muteSfx };
  const [winSFX]     = useSound("/submissions/axe-roulette/sfx/win.mp3",          { ...sfxOpts, volume: 0.6 });
  const [loseSFX]    = useSound("/submissions/axe-roulette/sfx/lose.mp3",         { ...sfxOpts, volume: 0.6 });
  const [axeThrowSFX] = useSound("/submissions/axe-roulette/sfx/axe_throw.mp3",   { ...sfxOpts, volume: 0.8 });
  const [gameEndSFX] = useSound("/submissions/axe-roulette/sfx/snd_game_end.mp3", { ...sfxOpts, volume: 0.7 });
  const [axeFrame, setAxeFrame] = useState(1);

  useEffect(() => {
    if (gameResult === "win") winSFX();
    else if (gameResult === "loss") loseSFX();
  }, [gameResult]);

  useEffect(() => {
    if (isGameOver) gameEndSFX();
  }, [isGameOver]);

  // Play through all 11 frames exactly once during the throw
  useEffect(() => {
    if (spinPhase !== "hitting") {
      if (spinPhase === "stopped") setAxeFrame(STUCK_FRAME);
      return;
    }
    axeThrowSFX();
    setAxeFrame(1);
    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      if (current > AXE_FRAME_COUNT) {
        clearInterval(interval);
        return;
      }
      setAxeFrame(current);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [spinPhase]);

  const isWheelSpinning = spinPhase === "spinning" || spinPhase === "hitting";
  const axeFlying = spinPhase === "hitting";
  const axeStuck  = spinPhase === "stopped";

  const wheelStyle: React.CSSProperties = isWheelSpinning
    ? { animation: "axeWheelSpin 0.55s linear infinite" }
    : { transform: `rotate(${wheelRotation}deg)`, transition: "none" };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-0 overflow-hidden">
      <style>{`
        @keyframes axeWheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Forest background */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/submissions/axe-roulette/forest-bg.png"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Square container */}
      <div
        className="relative flex-shrink-0"
        style={{ width: "min(100%, 540px)", aspectRatio: "1" }}
      >

        {/* Axe — starts full-height at screen center, shrinks to wheel top on impact */}
        <div
          className="absolute z-10 overflow-visible"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}
        >
          <motion.div
            style={{ originX: 0.5, originY: 0.5 }}
            initial={{ y: 0, scale: 4.0, opacity: 0 }}
            animate={
              axeFlying
                ? {
                    y: -70,
                    scale: 0.22,
                    opacity: 1,
                    transition: {
                      duration: 0.33,
                      ease: "easeIn",
                      opacity: { duration: 0 },
                    },
                  }
                : axeStuck
                ? { y: -70, scale: 0.22, opacity: 1, transition: { duration: 0 } }
                : { y: 0, scale: 4.0, opacity: 0, transition: { duration: 0 } }
            }
          >
            {/* Preload all frames to avoid flicker */}
            {Array.from({ length: AXE_FRAME_COUNT }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i + 1}
                src={`/submissions/axe-roulette/axe-sprites/axe${i + 1}.png`}
                alt=""
                style={{
                  width: 250,
                  height: "auto",
                  display: axeFrame === i + 1 ? "block" : "none",
                  pointerEvents: "none",
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* Spinning wheel */}
        <div className="absolute" style={{ inset: "10%", ...wheelStyle }}>
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full drop-shadow-2xl"
            shapeRendering="crispEdges"
          >
            <defs>
              <clipPath id="pixelCircleClip">
                <polygon points={PIXEL_CIRCLE_POINTS} />
              </clipPath>
            </defs>

            <g clipPath="url(#pixelCircleClip)">
              {/* Outer rim */}
              <circle cx={CX} cy={CY} r={R + 14} fill="#4A2800" />
              <circle cx={CX} cy={CY} r={R + 10} fill="#7A4800" />
              <circle cx={CX} cy={CY} r={R + 6}  fill="#4A2800" />

              {/* Slices */}
              {WHEEL_SLICES.map((slice, i) => {
                const midAngle = (slice.startAngle + slice.endAngle) / 2;
                const sliceDeg = slice.endAngle - slice.startAngle;
                const rawLabelPos = polarToCartesian(CX, CY, R * 0.62, midAngle);
                const labelPos = {
                  x: Math.round(rawLabelPos.x * 1000) / 1000,
                  y: Math.round(rawLabelPos.y * 1000) / 1000,
                };
                const showLabel = sliceDeg >= 12 && slice.label !== "";
                const fontSize = sliceDeg >= 35 ? 18 : sliceDeg >= 22 ? 14 : 10;

                return (
                  <g key={i}>
                    <path
                      d={slicePath(CX, CY, R, slice.startAngle, slice.endAngle)}
                      fill={slice.color}
                    />
                    {slice.multiplier === 0 ? (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={sliceDeg >= 15 ? 14 : 10}
                        style={{ userSelect: "none", pointerEvents: "none" }}
                      >
                        💀
                      </text>
                    ) : (
                      showLabel && (
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={fontSize}
                          fontWeight="bold"
                          fontFamily="'Silkscreen', monospace"
                          style={{ userSelect: "none", pointerEvents: "none" }}
                        >
                          {slice.label}
                        </text>
                      )
                    )}
                  </g>
                );
              })}

              {/* Divider lines */}
              {WHEEL_SLICES.map((slice, i) => {
                const rawPt = polarToCartesian(CX, CY, R, slice.startAngle);
                const pt = {
                  x: Math.round(rawPt.x * 1000) / 1000,
                  y: Math.round(rawPt.y * 1000) / 1000,
                };
                return (
                  <line
                    key={`div-${i}`}
                    x1={CX} y1={CY}
                    x2={pt.x} y2={pt.y}
                    stroke="none"
                  />
                );
              })}

              {/* Hub */}
              <rect x={CX - 22} y={CY - 22} width="44" height="44" fill="#4A2800" />
              <rect x={CX - 16} y={CY - 16} width="32" height="32" fill="#7A4800" />
              <rect x={CX - 8}  y={CY - 8}  width="16" height="16" fill="#B87830" />
              <rect x={CX - 4}  y={CY - 4}  width="8"  height="8"  fill="#D4A040" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AxeRouletteWindow;
