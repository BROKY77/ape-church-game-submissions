import { Game } from "@/lib/games";

export const FULL_SPINS = 7;

export interface WheelSliceConfig {
  multiplier: number; // 0 = miss
  label: string;
  startAngle: number; // degrees from 12 o'clock, clockwise
  endAngle: number;
  color: string;
}

// Total probability strictly decreasing with multiplier (higher mult = smaller slice).
// Total degrees: 0.5×(88°) > 1×(80°) > 2×(64°) > 5×(32°) > 10×(18°) > 25×(6°) > 50×(4°)
// Per-slice:     0.5×=44°  > 1×=40°  > 2×=32°  > 5×=16°  > 10×=9°   > 25×=6°  > 50×=4°
// Total = 360°:
//   0.5× →  88° (24.4%, 2 slices × 44°)
//   1×   →  80° (22.2%, 2 slices × 40°)
//   2×   →  64° (17.8%, 2 slices × 32°)
//   5×   →  32° ( 8.9%, 2 slices × 16°)
//   10×  →  18° ( 5.0%, 2 slices ×  9°)
//   25×  →   6° ( 1.7%, 1 slice)
//   50×  →   4° ( 1.1%, 1 slice)
//   MISS →  68° (18.9%, 4 slices × 17°)
export const WHEEL_SLICES: WheelSliceConfig[] = [
  { multiplier: 2,   label: "2×",   startAngle: 0,   endAngle: 32,  color: "#2563EB" },
  { multiplier: 0.5, label: "0.5×", startAngle: 32,  endAngle: 76,  color: "#EA580C" },
  { multiplier: 0,   label: "",     startAngle: 76,  endAngle: 93,  color: "#CC2222" },
  { multiplier: 5,   label: "5×",   startAngle: 93,  endAngle: 109, color: "#16A34A" },
  { multiplier: 1,   label: "1×",   startAngle: 109, endAngle: 149, color: "#D97706" },
  { multiplier: 10,  label: "10×",  startAngle: 149, endAngle: 158, color: "#7C3AED" },
  { multiplier: 0,   label: "",     startAngle: 158, endAngle: 175, color: "#CC2222" },
  { multiplier: 2,   label: "2×",   startAngle: 175, endAngle: 207, color: "#2563EB" },
  { multiplier: 0.5, label: "0.5×", startAngle: 207, endAngle: 251, color: "#EA580C" },
  { multiplier: 5,   label: "5×",   startAngle: 251, endAngle: 267, color: "#16A34A" },
  { multiplier: 25,  label: "25×",  startAngle: 267, endAngle: 273, color: "#00D8E8" },
  { multiplier: 1,   label: "1×",   startAngle: 273, endAngle: 313, color: "#D97706" },
  { multiplier: 0,   label: "",     startAngle: 313, endAngle: 330, color: "#CC2222" },
  { multiplier: 10,  label: "10×",  startAngle: 330, endAngle: 339, color: "#7C3AED" },
  { multiplier: 50,  label: "50×",  startAngle: 339, endAngle: 343, color: "#FFD700" },
  { multiplier: 0,   label: "",     startAngle: 343, endAngle: 360, color: "#CC2222" },
];

export const axeRouletteGame: Game = {
  title: "Axe Roulette",
  description:
    "Pick your multiplier, place your bet, and throw the axe at the spinning wheel. The higher the multiplier, the lower the odds — but the bigger the reward.",
  gameAddress: "0x0000000000000000000000000000000000000000",
  gameBackground: "/axe-roulette/pixel_forest_squarebg.png",
  card: "/axe-roulette/card.png",
  banner: "/axe-roulette/banner.png",
  advanceToNextStateAsset: undefined,
  themeColorBackground: "#8B1A1A",
  song: "/axe-roulette/audio/song.mp3",
  payouts: {},
};
