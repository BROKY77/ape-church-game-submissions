"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import useSound from "use-sound";
import { Game } from "@/lib/games";
import {
    DICE_SUMS,
    type SelectedZones,
} from "./foxyShooterConstants";
import { type AnimationPhase } from "./FoxyShooter";

interface MyGameWindowProps {
  game: Game;
  selectedZones: SelectedZones;
  diceResult: [number, number] | null;
  rolledSum: number | null;
  isRolling: boolean;
  isWin: boolean;
  gameCompleted: boolean;
  betAmount: number;
  payoutAmount: number;
  maxPotentialWin: number;
  currentView: 0 | 1 | 2;
  animationPhase: AnimationPhase;
  numberOfRolls: number;
  onToggleZone?: (sum: number) => void;
  }

// ─── ZONE COLORS ─────────────────────────────────────────
// All selected zones use the same green color (like zone 6)
// Unselected target zones (where ball is going) show as red
function getZoneColor(
    isSelected: boolean, 
    isUnselectedTarget: boolean
): { bg: string; border: string; text: string } {
    if (isUnselectedTarget) {
        // Red color for unselected zones that are the target (ball going there)
        return { bg: "#ef4444", border: "#dc2626", text: "#ffffff" };
    }
    if (isSelected) {
        // Green color for all selected/defended zones
        return { bg: "#22c55e", border: "#16a34a", text: "#ffffff" };
    }
    // Gray for unselected zones
    return { bg: "rgba(100,100,100,0.4)", border: "rgba(150,150,150,0.6)", text: "#ffffff80" };
}

// ─── GOAL ZONE POSITIONS ─────────────────────────────────
// Goal: 75% width x 45% height, centered in game area (center at 50%, 50%)
// Each grid cell: 15% x 15%, Zone circles: 10% x 10%
// Column centers (5 cols at 15% each): 20%, 35%, 50%, 65%, 80%
// Row centers (3 rows at 15% each, middle row at y=50%): 35%, 50%, 65%
const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
    // Row 3 (bottom, y=65%): zone 2 left, zone 12 right
    2:  { x: 20, y: 65 },
    12: { x: 80, y: 65 },
    // Row 2 (middle, y=50%): zones 3, 6, 8, 11
    3:  { x: 20, y: 50 },
    6:  { x: 35, y: 50 },
    8:  { x: 65, y: 50 },
    11: { x: 80, y: 50 },
    // Row 1 (top, y=35%): zones 4, 5, 7, 9, 10
    4:  { x: 20, y: 35 },
    5:  { x: 35, y: 35 },
    7:  { x: 50, y: 35 },
    9:  { x: 65, y: 35 },
    10: { x: 80, y: 35 },
};

// ─── GOAL ZONE ───────────────────────────────────────────
function GoalZone({
    sum,
    isSelected,
    isResultMatch,
    isTargetPulsing,
    isUnselectedTarget,
    isClickable,
    onClick,
    size,
    position,
}: {
    sum: number;
    isSelected: boolean;
    isResultMatch: boolean;
    isTargetPulsing: boolean;
    isUnselectedTarget: boolean;
    isClickable: boolean;
    onClick?: () => void;
    size: number;
    position: { x: number; y: number };
}) {
    const colors = getZoneColor(isSelected, isUnselectedTarget);
    // Pulse when: (1) selected and result matches, OR (2) target is pulsing before kick, OR (3) unselected target
    const shouldPulse = (isSelected && isResultMatch) || isTargetPulsing || isUnselectedTarget;

    
    // Use a wrapper div for positioning (stays fixed) and inner div for animation
    return (
        <div
            className={`absolute ${isClickable ? "cursor-pointer" : ""}`}
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: "translate(-50%, -50%)",
                width: size,
                height: size,
                zIndex: isClickable ? 50 : 1,
                pointerEvents: isClickable ? "auto" : "none",
            }}
            onClick={isClickable ? onClick : undefined}
                    >
            <motion.div
                className={`w-full h-full flex items-center justify-center rounded-full ${isClickable ? "hover:brightness-110 active:scale-95" : ""}`}
                style={{
                    backgroundColor: colors.bg,
                    border: `3px solid ${colors.border}`,
                    boxShadow: shouldPulse
                        ? `0 0 25px 8px ${colors.bg}, 0 0 50px 15px ${colors.bg}80`
                        : isSelected
                            ? `0 0 12px 3px ${colors.bg}60`
                            : "none",
                }}
                animate={
                    shouldPulse
                        ? {
                            scale: [1, 1.15, 1],
                            boxShadow: [
                                `0 0 25px 8px ${colors.bg}, 0 0 50px 15px ${colors.bg}80`,
                                `0 0 40px 15px ${colors.bg}, 0 0 80px 25px ${colors.bg}90`,
                                `0 0 25px 8px ${colors.bg}, 0 0 50px 15px ${colors.bg}80`,
                            ],
                        }
                        : { scale: 1 }
                }
                transition={
                    shouldPulse
                        ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.2 }
                }
            >
                <span
                    className="text-center flex items-center justify-center"
                    style={{
                        color: colors.text,
                        fontSize: size * 0.5,
                        fontFamily: "'Sour Gummy', sans-serif",
                        fontWeight: "700",
                        lineHeight: 1,
                        height: size * 0.5,
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                    }}
                >
                    {sum}
                </span>
            </motion.div>
        </div>
    );
}

// ─── SOCCER BALL ─────────────────────────────────────────
// Sprite sheet: 640x512px, 5 columns x 4 rows = 20 frames, 128x128 per frame
const BALL_SPRITE_SHEET = "/submissions/foxy-shooter/soccer-ball-spritesheet.png";
const BALL_SPRITE_WIDTH = 640;
const BALL_SPRITE_HEIGHT = 512;
const BALL_FRAME_SIZE = 128;
const BALL_COLS = 5;
const BALL_ROWS = 4;
const BALL_FRAME_COUNT = 20; // 5x4 grid

// Bounce positions for undefended shots (unused grid cells at bottom row)
const BOUNCE_POSITIONS = {
    left: { x: 35, y: 65 },   // Below zone 6
    right: { x: 65, y: 65 },  // Below zone 8
};

type BallAnimationPhase = "idle" | "waiting" | "shooting" | "caught" | "bouncing" | "scored";

function SoccerBall({
    size,
    animationPhase,
    targetPosition,
    isDefended,
    onPhaseComplete,
}: {
    size: number;
    animationPhase: BallAnimationPhase;
    targetPosition: { x: number; y: number } | null;
    isDefended: boolean;
    onPhaseComplete?: (phase: BallAnimationPhase) => void;
}) {
    const [frame, setFrame] = useState(0);
    const frameRef = useRef(0);
    const startPos = { x: 60, y: 105 }; // Start partially cut off at bottom, offset 10% right of center

    // Determine bounce position (alternate left/right based on target x position)
    const bouncePos = targetPosition && targetPosition.x < 50 
        ? BOUNCE_POSITIONS.left 
        : BOUNCE_POSITIONS.right;

    // Animate ball rotation frames - only spin during shooting and bouncing
    useEffect(() => {
        if (animationPhase !== "shooting" && animationPhase !== "bouncing") {
            return;
        }
        const interval = setInterval(() => {
            frameRef.current = (frameRef.current + 1) % BALL_FRAME_COUNT;
            setFrame(frameRef.current);
        }, 35);
        return () => clearInterval(interval);
    }, [animationPhase]);

    // Reset frame when idle
    useEffect(() => {
        if (animationPhase === "idle") {
            frameRef.current = 0;
            setFrame(0);
        }
    }, [animationPhase]);

    const row = Math.floor(frame / BALL_COLS);
    const col = frame % BALL_COLS;
    const spriteX = col * BALL_FRAME_SIZE;
    const spriteY = row * BALL_FRAME_SIZE;
    const scale = size / BALL_FRAME_SIZE;

    // Determine position based on animation phase
    const getPositionProps = () => {
        switch (animationPhase) {
            case "shooting":
            case "caught":
                return targetPosition ? {
                    left: `${targetPosition.x}%`,
                    top: `${targetPosition.y}%`,
                } : {
                    left: `${startPos.x}%`,
                    top: `${startPos.y}%`,
                };
            case "bouncing":
            case "scored":
                return {
                    left: `${bouncePos.x}%`,
                    top: `${bouncePos.y}%`,
                };
            default:
                return {
                    left: `${startPos.x}%`,
                    top: `${startPos.y}%`,
                };
        }
    };

    // Determine scale based on animation phase
    const getScale = () => {
        switch (animationPhase) {
            case "shooting":
                return [1, 0.6, 0.5];
            case "caught":
            case "bouncing":
            case "scored":
                return 0.5;
            default:
                return 1;
        }
    };

    const getTransition = () => {
        switch (animationPhase) {
            case "shooting":
                return { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const };
            case "bouncing":
                return { duration: 0.4, ease: "easeOut" as const };
            default:
                return { duration: 0.4, ease: "easeOut" as const };
        }
    };

    // Use wrapper for positioning (with translate for centering) and inner for scale
    return (
        <motion.div
            className="absolute pointer-events-none z-20"
            style={{
                width: size,
                height: size,
            }}
            initial={{
                left: `${startPos.x}%`,
                top: `${startPos.y}%`,
                x: "-50%",
                y: "-50%",
            }}
            animate={{
                ...getPositionProps(),
                x: "-50%",
                y: "-50%",
            }}
            transition={getTransition()}
            onAnimationComplete={() => {
                if (onPhaseComplete) {
                    onPhaseComplete(animationPhase);
                }
            }}
        >
            <motion.div
                className="overflow-hidden"
                style={{ width: size, height: size }}
                animate={{ scale: getScale() }}
                transition={getTransition()}
            >
                <div
                    style={{
                        width: BALL_FRAME_SIZE,
                        height: BALL_FRAME_SIZE,
                        backgroundImage: `url(${BALL_SPRITE_SHEET})`,
                        backgroundPosition: `-${spriteX}px -${spriteY}px`,
                        backgroundSize: `${BALL_SPRITE_WIDTH}px ${BALL_SPRITE_HEIGHT}px`,
                        backgroundRepeat: "no-repeat",
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

// ─── GOALIE ──────────────────────────────────────────────
// Sprite sheet: 1500x1800, 2 columns x 4 rows, each frame 750x450
// Matches the goal area grid (75% x 45% of game area)
const GOALIE_SPRITE_SHEET = "/submissions/foxy-shooter/goalie-spritesheet.png";
const GOALIE_FRAME_WIDTH = 750;
const GOALIE_FRAME_HEIGHT = 450;
const GOALIE_SHEET_WIDTH = 1500;
const GOALIE_SHEET_HEIGHT = 1800;

// Frame positions: { row, col } in spritesheet
// Spritesheet layout (750x450 per frame, 2 cols x 4 rows):
// Row 0, Col 0: idle
// Row 0, Col 1: defend 7 (jump up center)
// Row 1, Col 0: defend 8 (dive to goalie's left / viewer's right)
// Row 1, Col 1: defend 9 (dive to goalie's right / viewer's left... wait, need to check)
// Row 2, Col 0: defend 10
// Row 2, Col 1: defend 11
// Row 3, Col 0: defend 12
//
// RIGHT side zones (8,9,10,11,12) use sprites directly
// LEFT side zones (2,3,4,5,6) use MIRRORED sprites:
//   2 mirrors 12, 3 mirrors 11, 4 mirrors 10, 5 mirrors 9, 6 mirrors 8
const GOALIE_FRAMES: Record<number | "idle", { row: number; col: number; mirror: boolean }> = {
    idle: { row: 0, col: 0, mirror: false },
    // Center - jump up
    7:    { row: 0, col: 1, mirror: false },
    // RIGHT side of goal (zones 8-12) - use sprites directly (no mirror)
    8:    { row: 1, col: 0, mirror: false },
    9:    { row: 1, col: 1, mirror: false },
    10:   { row: 2, col: 0, mirror: false },
    11:   { row: 2, col: 1, mirror: false },
    12:   { row: 3, col: 0, mirror: false },
    // LEFT side of goal (zones 2-6) - use MIRRORED sprites
    2:    { row: 3, col: 0, mirror: true },  // Mirror of 12
    3:    { row: 2, col: 1, mirror: true },  // Mirror of 11
    4:    { row: 2, col: 0, mirror: true },  // Mirror of 10
    5:    { row: 1, col: 1, mirror: true },  // Mirror of 9
    6:    { row: 1, col: 0, mirror: true },  // Mirror of 8
};

type GoalieState = "idle" | "defending" | "missed";

function Goalie({
    state,
    targetZone,
    missedDiveZone,
    containerWidth,
    containerHeight,
}: {
    state: GoalieState;
    targetZone: number | null;
    missedDiveZone: number | null;
    containerWidth: number;
    containerHeight: number;
}) {
    // Determine which frame to show
    let frameData = GOALIE_FRAMES.idle;
    
    if (state === "defending" && targetZone !== null) {
        // Show goalie diving to defend the target zone
        frameData = GOALIE_FRAMES[targetZone] || GOALIE_FRAMES.idle;
    } else if (state === "missed" && missedDiveZone !== null) {
        // Goalie dives to wrong zone (predetermined)
        frameData = GOALIE_FRAMES[missedDiveZone] || GOALIE_FRAMES.idle;
    }

    const { row, col, mirror } = frameData;
    const spriteX = col * GOALIE_FRAME_WIDTH;
    const spriteY = row * GOALIE_FRAME_HEIGHT;

    // Goalie covers the goal area: 75% width x 45% height, centered
    const goalieWidth = containerWidth * 0.75;
    const goalieHeight = containerHeight * 0.45;
    const scale = goalieWidth / GOALIE_FRAME_WIDTH;

    // For mirroring: scale first, then use a wrapper to flip horizontally
    // This ensures the mirrored sprite stays centered in the goal area
    return (
        <div
            className="absolute pointer-events-none"
            style={{
                width: goalieWidth,
                height: goalieHeight,
                left: "12.5%",
                top: "27.5%",
                overflow: "hidden",
                // Apply mirror transform to the container so sprite stays centered
                transform: mirror ? "scaleX(-1)" : "none",
            }}
        >
            <div
                style={{
                    width: GOALIE_FRAME_WIDTH,
                    height: GOALIE_FRAME_HEIGHT,
                    backgroundImage: `url(${GOALIE_SPRITE_SHEET})`,
                    backgroundPosition: `-${spriteX}px -${spriteY}px`,
                    backgroundSize: `${GOALIE_SHEET_WIDTH}px ${GOALIE_SHEET_HEIGHT}px`,
                    backgroundRepeat: "no-repeat",
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                }}
            />
        </div>
    );
}

// ─── SPRITE DICE ─────────────────────────────────────────
// Sprite sheet: 1024x256px, 8 columns x 2 rows of 128x128 frames
// Row 0 cols 0-7: rolling animation frames (8 frames)
// Row 1 cols 0-5: final dice faces 1-6
const SPRITE_FRAME = 128;
const SPRITE_SHEET_WIDTH = 1024;
const SPRITE_SHEET_HEIGHT = 256;
const SPRITE_SHEET = "/submissions/foxy-shooter/dice-spritesheet.png";
const ROLL_FRAME_COUNT = 8;
const ROLL_FRAME_MS = 60; // ms per frame

function getSpritePos(row: number, col: number): { x: number; y: number } {
    return { x: col * SPRITE_FRAME, y: row * SPRITE_FRAME };
}

function SpriteDice({
    value,
    isRolling,
    size = 48,
    frameOffset = 0,
    transitionPhase,
}: {
    value: number;
    isRolling: boolean;
    size?: number;
    frameOffset?: number;
    transitionPhase: "idle" | "toss-up" | "toss-down" | "bounce" | "settled";
}) {
    const [rollFrame, setRollFrame] = useState(frameOffset % ROLL_FRAME_COUNT);
    const frameCounter = useRef(0);

    // Cycle tumbling sprite frames while toss-up is active
    useEffect(() => {
        if (transitionPhase !== "toss-up") {
            frameCounter.current = 0;
            return;
        }
        frameCounter.current = frameOffset;
        const interval = setInterval(() => {
            frameCounter.current += 1;
            setRollFrame(frameCounter.current % ROLL_FRAME_COUNT);
        }, ROLL_FRAME_MS);
        return () => clearInterval(interval);
    }, [transitionPhase, frameOffset]);

    // Determine sprite row/col based on phase
    // New spritesheet: Row 0 = rolling frames, Row 1 = final dice faces
    const faceCol = Math.max(0, Math.min(5, value - 1));
    let spriteX: number;
    let spriteY: number;

    if (transitionPhase === "toss-up") {
        // Tumbling frames (row 0) while rising
        const pos = getSpritePos(0, rollFrame);
        spriteX = pos.x;
        spriteY = pos.y;
    } else {
        // All other phases use final dice faces (row 1)
        const pos = getSpritePos(1, faceCol);
        spriteX = pos.x;
        spriteY = pos.y;
    }

    const baseScale = SPRITE_FRAME > 0 ? size / SPRITE_FRAME : 1;

    // Motion animation values per phase
    const getMotionStyle = (): { y: number; scaleX: number; scaleY: number; opacity: number } => {
        switch (transitionPhase) {
            case "toss-up":
                // Rise high, shrink (far away perspective)
                return { y: -size * 0.8, scaleX: 0.5, scaleY: 0.5, opacity: 0.8 };
            case "toss-down":
                // Fall back: overshoot slightly past resting (approaching fast)
                return { y: size * 0.04, scaleX: 1.12, scaleY: 1.12, opacity: 1 };
            case "bounce":
                // Small bounce with squash-stretch
                return { y: -size * 0.1, scaleX: 0.94, scaleY: 1.06, opacity: 1 };
            case "settled":
                return { y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
            default:
                // idle
                return { y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
        }
    };

    const getMotionTransition = () => {
        switch (transitionPhase) {
            case "toss-up":
                return { duration: 0.45, ease: "easeOut" as const };
            case "toss-down":
                // Gravity-like: slow at top, fast at bottom
                return { duration: 0.28, ease: [0.55, 0, 1, 0.45] as const };
            case "bounce":
                return { duration: 0.16, ease: "easeOut" as const };
            case "settled":
                return { duration: 0.14, ease: "easeIn" as const };
            default:
                return { duration: 0.15 };
        }
    };

    return (
        <motion.div
            className="relative"
            style={{
                width: size,
                height: size,
            }}
            animate={getMotionStyle()}
            transition={getMotionTransition()}
        >
            <div
                className="overflow-hidden"
                style={{ width: size, height: size }}
            >
                <div
                    style={{
                        width: SPRITE_FRAME,
                        height: SPRITE_FRAME,
                        backgroundImage: `url(${SPRITE_SHEET})`,
                        backgroundPosition: `-${spriteX}px -${spriteY}px`,
                        backgroundSize: `${SPRITE_SHEET_WIDTH}px ${SPRITE_SHEET_HEIGHT}px`,
                        backgroundRepeat: "no-repeat",
                        transform: `scale(${baseScale})`,
                        transformOrigin: "top left",
                    }}
                />
            </div>
            {/* Shadow beneath die */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: size * 0.7,
                    height: size * 0.15,
                    left: size * 0.15,
                    bottom: -size * 0.1,
                    background: "radial-gradient(ellipse, rgba(0,0,0,0.3), transparent 70%)",
                }}
                animate={{
                    opacity: transitionPhase === "toss-up" ? 0.1 : transitionPhase === "toss-down" ? 0.25 : 0.35,
                    scaleX: transitionPhase === "toss-up" ? 0.4 : 1,
                }}
                transition={{ duration: 0.25 }}
            />
        </motion.div>
    );
}



// ─── HUD PANEL STYLE ─────────────────────────────────────
const hudPanelStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.2)",
};

function BetPanel({ betAmount, numberOfRolls }: { betAmount: number; numberOfRolls: number }) {
    return (
        <div
            className="h-full rounded-lg border-2 px-2 py-1.5 flex items-center justify-center gap-3"
            style={hudPanelStyle}
        >
            <div className="flex flex-col items-center min-w-0">
                <span className="text-[10px] text-black/60 uppercase tracking-wide">Bet</span>
                <span className="text-[13px] font-bold text-black truncate">
                    {betAmount > 0 ? `${betAmount.toFixed(2)}` : "--"}
                </span>
            </div>
            <div className="w-px h-5 bg-black/20 shrink-0" />
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-black/60 uppercase tracking-wide">Rolls</span>
                <span className="text-[13px] font-bold text-black">{numberOfRolls}</span>
            </div>
        </div>
    );
}

function PayoutPanel({ maxPotentialWin }: {
    maxPotentialWin: number;
}) {
    return (
        <div
            className="h-full rounded-lg border-2 px-3 py-1.5 flex flex-col justify-center items-end"
            style={hudPanelStyle}
        >
            <span className="text-[11px] text-black/60 uppercase tracking-wide">Potential Win</span>
            <span className="text-[15px] font-bold text-black truncate">
                {maxPotentialWin > 0 ? `${maxPotentialWin.toFixed(2)}` : "--"}
            </span>
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────
const MyGameWindow: React.FC<MyGameWindowProps> = ({
    game,
    selectedZones,
    diceResult,
    rolledSum,
    isRolling,
    isWin,
    gameCompleted,
    betAmount,
    payoutAmount,
    maxPotentialWin,
    currentView,
    animationPhase,
    numberOfRolls,
    onToggleZone,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(600);
    const [containerHeight, setContainerHeight] = useState(400);

    useEffect(() => {
        const obs = new ResizeObserver(([entry]) => {
            if (entry) {
                setContainerWidth(entry.contentRect.width);
                setContainerHeight(entry.contentRect.height);
            }
        });
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
            setContainerHeight(containerRef.current.offsetHeight);
            obs.observe(containerRef.current);
        }
        return () => obs.disconnect();
    }, []);

    const muteSfx = false;
    const sfxVolume = 0.5;
    const [winSFX] = useSound("/submissions/example-game/sfx/win.mp3", { volume: sfxVolume, soundEnabled: !muteSfx, interrupt: true });
    const [loseSFX] = useSound("/submissions/example-game/sfx/lose.mp3", { volume: sfxVolume, soundEnabled: !muteSfx, interrupt: true });

    useEffect(() => {
        if (animationPhase === "result") {
            if (isWin) winSFX();
            else loseSFX();
        }
    }, [animationPhase]);

    // Dice transition: idle -> toss-up -> toss-down -> bounce -> settled
    const [diceTransition, setDiceTransition] = useState<"idle" | "toss-up" | "toss-down" | "bounce" | "settled">("idle");
    const prevIsRollingRef = useRef(false);
    // Remember last rolled values so dice retain their result between rolls
    const lastDice = useRef<[number, number]>([1, 4]);
    // Track active toss timeouts so we can clean up
    const tossTimers = useRef<NodeJS.Timeout[]>([]);

    // Rolling START: immediately toss dice up
    useEffect(() => {
        if (isRolling) {
            tossTimers.current.forEach(clearTimeout);
            tossTimers.current = [];
            setDiceTransition("toss-up");
            prevIsRollingRef.current = true;
        }
    }, [isRolling]);

    // Rolling STOP: dice result arrives, bring dice back down
    // Sequence: toss-down (top-down face falls fast)
    //         -> bounce (isometric face, squash-stretch bounce)
    //         -> settled (isometric face, rest)
    useEffect(() => {
        if (!isRolling && prevIsRollingRef.current && diceResult) {
            prevIsRollingRef.current = false;

            // Phase 1: fall down with top-down face
            setDiceTransition("toss-down");
            // Phase 2: bounce with isometric face
            const t1 = setTimeout(() => setDiceTransition("bounce"), 280);
            // Phase 3: settle
            const t2 = setTimeout(() => setDiceTransition("settled"), 440);
            tossTimers.current = [t1, t2];
        }
    }, [isRolling, diceResult]);

    // Reset when game clears (no dice result, not rolling)
    useEffect(() => {
        if (!isRolling && !diceResult) {
            prevIsRollingRef.current = false;
            tossTimers.current.forEach(clearTimeout);
            tossTimers.current = [];
            setDiceTransition("idle");
        }
    }, [isRolling, diceResult]);

    // Update last dice when we get a new result
    useEffect(() => {
        if (diceResult) {
            lastDice.current = diceResult;
        }
    }, [diceResult]);

    // Display values: if we have a current result, use it; otherwise show last rolled values
    const displayDie1 = diceResult ? diceResult[0] : lastDice.current[0];
    const displayDie2 = diceResult ? diceResult[1] : lastDice.current[1];

    // Maintain 1:1 aspect ratio for the game area
    const gameSize = Math.min(containerWidth, containerHeight);

    // Zone layout - zones are 10% of game area (square)
    const allSums = DICE_SUMS as readonly number[];
    const zoneSize = gameSize * 0.10;

    // Ball size based on game area (21% of square)
    const ballSize = Math.round(gameSize * 0.21);

    // Determine if we're showing result (dice settled on a value)
    const showResult = animationPhase === "result" || animationPhase === "zoom-out" || diceTransition === "settled";

    // Ball animation state - added "waiting" phase for zone pulse before kick
    type BallPhase = "idle" | "waiting" | "shooting" | "caught" | "bouncing" | "scored";
    const [ballAnimPhase, setBallAnimPhase] = useState<BallPhase>("idle");
    const [ballTarget, setBallTarget] = useState<{ x: number; y: number } | null>(null);
    const [isBallDefended, setIsBallDefended] = useState(false);
    const [targetZoneNum, setTargetZoneNum] = useState<number | null>(null);
    const prevRollingRef = useRef(false);

    // When rolling STOPS and we have a result, start waiting phase (zone pulses)
    useEffect(() => {
        // Detect transition from rolling to not rolling (dice landed)
        if (prevRollingRef.current && !isRolling && diceResult) {
            const sum = diceResult[0] + diceResult[1];
            const targetPos = ZONE_POSITIONS[sum];
            const defended = selectedZones.has(sum);
            if (targetPos) {
                setBallTarget(targetPos);
                setIsBallDefended(defended);
                setTargetZoneNum(sum);
                // Enter waiting phase - zone will pulse, then kick after delay
                setBallAnimPhase("waiting");
            }
        }
        prevRollingRef.current = isRolling;
    }, [isRolling, diceResult, selectedZones]);

    // After waiting phase, kick the ball after a delay
    useEffect(() => {
        if (ballAnimPhase === "waiting") {
            const timer = setTimeout(() => {
                setBallAnimPhase("shooting");
            }, 800); // 800ms delay for zone to pulse before kick
            return () => clearTimeout(timer);
        }
    }, [ballAnimPhase]);

    // Goalie state - tracks when goalie should dive
    const [goalieState, setGoalieState] = useState<GoalieState>("idle");
    const [missedDiveZone, setMissedDiveZone] = useState<number | null>(null);
    
    // Track if we've already processed this shooting phase to prevent double execution
    const hasProcessedShootingRef = useRef(false);
    // Store defended zones at the moment of waiting phase (before shooting)
    const defendedZonesAtShootRef = useRef<number[]>([]);

    // Capture defended zones when entering waiting phase and reset processing flag
    useEffect(() => {
        if (ballAnimPhase === "waiting") {
            defendedZonesAtShootRef.current = Array.from(selectedZones.keys());
            hasProcessedShootingRef.current = false;
        } else if (ballAnimPhase === "idle") {
            hasProcessedShootingRef.current = false;
        }
    }, [ballAnimPhase, selectedZones]);

    // When ball starts shooting, goalie reacts - only run once per shooting phase
    useEffect(() => {
        if (ballAnimPhase === "shooting" && !hasProcessedShootingRef.current) {
            hasProcessedShootingRef.current = true;
            
            if (isBallDefended) {
                setGoalieState("defending");
                setMissedDiveZone(null);
            } else {
                // Goalie dives to a random defended zone (where the ball ISN'T going)
                const defendedZones = defendedZonesAtShootRef.current;
                let diveZone: number;
                if (defendedZones.length > 0) {
                    // Pick a random defended zone for the goalie to dive to
                    diveZone = defendedZones[Math.floor(Math.random() * defendedZones.length)];
                } else {
                    // No zones defended - goalie dives to a random zone anyway
                    const allZones = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                    diveZone = allZones[Math.floor(Math.random() * allZones.length)];
                }
                setMissedDiveZone(diveZone);
                setGoalieState("missed");
            }
        }
    }, [ballAnimPhase, isBallDefended]);

    // Reset ball when game resets (no dice result)
    useEffect(() => {
        if (!diceResult) {
            setBallAnimPhase("idle");
            setBallTarget(null);
            setIsBallDefended(false);
            setGoalieState("idle");
            setMissedDiveZone(null);
            setTargetZoneNum(null);
        }
    }, [diceResult]);

    const handleBallPhaseComplete = (phase: BallPhase) => {
        if (phase === "shooting") {
            if (isBallDefended) {
                // Ball was defended - stop and stay (caught)
                setBallAnimPhase("caught");
            } else {
                // Ball was not defended - bounce to unused zone
                setBallAnimPhase("bouncing");
            }
        } else if (phase === "bouncing") {
            // Ball finished bouncing - it's a goal
            setBallAnimPhase("scored");
        }
    };

    return (
        <div ref={containerRef} className="absolute inset-0 z-0 flex items-center justify-center bg-black overflow-visible">
            {/* Square game area container - 1:1 aspect ratio, overflow visible for ball animation */}
            <div
                className="relative overflow-visible"
                style={{
                    width: gameSize,
                    height: gameSize,
                }}
            >
                {/* Soccer field background - square image covering entire area */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url(/submissions/foxy-shooter/soccer-goal-bg.png)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />

            {/* Goal zones layer - positioned over the goal net (z-10) */}
            <div className="absolute inset-0 z-10">
                {allSums.map((sum) => (
                    <GoalZone
                        key={sum}
                        sum={sum}
                        isSelected={selectedZones.has(sum)}
                        isResultMatch={showResult && rolledSum === sum}
                        isTargetPulsing={ballAnimPhase === "waiting" && targetZoneNum === sum}
                        isUnselectedTarget={ballAnimPhase === "waiting" && targetZoneNum === sum && !selectedZones.has(sum)}
                        isClickable={currentView === 0 && (animationPhase === "idle" || animationPhase === "kick-off") && !!onToggleZone}
                        onClick={() => onToggleZone?.(sum)}
                        size={zoneSize}
                        position={ZONE_POSITIONS[sum]}
                    />
                ))}
            </div>

            {/* Goalie layer - in front of zones, behind ball (z-15) */}
            <div className="absolute inset-0 z-[15] pointer-events-none">
                <Goalie
                    state={goalieState}
                    targetZone={targetZoneNum}
                    missedDiveZone={missedDiveZone}
                    containerWidth={gameSize}
                    containerHeight={gameSize}
                />
            </div>

            {/* Soccer ball - in front of goalie (z-20), behind goalie when bouncing or scored (z-[12]) */}
            <div 
                className={`absolute inset-0 overflow-visible pointer-events-none ${
                    ballAnimPhase === "bouncing" || ballAnimPhase === "scored" ? "z-[12]" : "z-20"
                }`}
            >
                <SoccerBall
                    size={ballSize}
                    animationPhase={ballAnimPhase}
                    targetPosition={ballTarget}
                    isDefended={isBallDefended}
                    onPhaseComplete={handleBallPhaseComplete}
                />
            </div>

            {/* BOTTOM HUD - three panels: Bet (left), Dice (center 40%w x 22.5%h), Payout (right) */}
            {(() => {
                const diceAreaW = Math.max(containerWidth * 0.40, 120);
                const diceAreaH = Math.max(containerHeight * 0.225, 60); // Reduced by 25% (0.30 * 0.75 = 0.225)
                // Each die fills ~70% of the dice area height (adjusted for smaller container)
                const diceSize = Math.min(diceAreaH * 0.70, diceAreaW * 0.30, 96);
                const sidePanelH = Math.max(containerHeight * 0.14, 64);
                return (
                    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between gap-1.5 p-1.5 sm:gap-2 sm:p-2">
                        {/* Bet Panel - lower left */}
                        <div className="flex-1" style={{ height: sidePanelH, maxWidth: "22%" }}>
                            <BetPanel betAmount={betAmount} numberOfRolls={numberOfRolls} />
                        </div>

                        {/* Dice Area - bottom center, 40% x 22.5% */}
                        <div
                            className="flex flex-col items-center justify-end pb-2 rounded-lg border-2 overflow-visible"
                            style={{
                                ...hudPanelStyle,
                                width: diceAreaW,
                                height: diceAreaH,
                                flexShrink: 0,
                            }}
                        >
                            <div className="flex items-center gap-4 sm:gap-6">
                                <SpriteDice
                                    value={displayDie1}
                                    isRolling={isRolling}
                                    size={diceSize}
                                    frameOffset={0}
                                    transitionPhase={diceTransition}
                                />
                                <SpriteDice
                                    value={displayDie2}
                                    isRolling={isRolling}
                                    size={diceSize}
                                    frameOffset={4}
                                    transitionPhase={diceTransition}
                                />
                            </div>
                        </div>

                        {/* Payout Panel - lower right */}
                        <div className="flex-1" style={{ height: sidePanelH, maxWidth: "22%" }}>
                            <PayoutPanel maxPotentialWin={maxPotentialWin} />
                        </div>
                    </div>
                );
            })()}


            </div>
        </div>
    );
};

export default MyGameWindow;
