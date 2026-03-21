'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlotState } from '@/components/games/loot-tumble/types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  currentWin: number;
  totalWin: number;
  state: SlotState;
  cascadeDepth: number;
  betAmount: number;
  multiplierTotal?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Cascade depth → text colour (hotter as depth grows). */
function cascadeTextColor(depth: number): string {
  if (depth >= 4) return 'text-red-400';
  if (depth === 3) return 'text-orange-400';
  return 'text-amber-400';
}

/** Cascade depth → badge background / border. */
function cascadeBadgeColor(depth: number): string {
  if (depth >= 4) return 'bg-red-500/20 border-red-500/40';
  if (depth === 3) return 'bg-orange-500/20 border-orange-500/40';
  return 'bg-amber-500/20 border-amber-500/40';
}

function getWinTier(totalWin: number, betAmount: number): 'BIG' | 'MEGA' | 'LEGENDARY' {
  const multiplier = betAmount > 0 ? totalWin / betAmount : 0;
  if (multiplier >= 100) return 'LEGENDARY';
  if (multiplier >= 50) return 'MEGA';
  return 'BIG';
}

function formatWinAmount(amount: number): string {
  return amount.toLocaleString([], {
    minimumFractionDigits: amount > 0 && amount < 0.01 ? 3 : 2,
    maximumFractionDigits: 3,
  });
}

/* ------------------------------------------------------------------ */
/*  Count-up hook (pure rAF, no extra deps)                            */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, active: boolean) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!active || target <= 0) {
      prevRef.current = 0;
      return;
    }

    const from = prevRef.current;
    const to = target;
    prevRef.current = to;

    if (from === to) {
      return;
    }

    const duration = 400; // ms
    const start = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (to - from) * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, active]);

  return active && target > 0 ? displayed : 0;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WinDisplay({
  currentWin,
  totalWin,
  state,
  cascadeDepth,
  betAmount,
  multiplierTotal = 0,
}: Props) {
  /* --- derived state ------------------------------------------------ */
  const showWin =
    state === 'WIN_DISPLAY' ||
    (state === 'CASCADING' && currentWin > 0) ||
    (state === 'RESOLVING' && currentWin > 0);

  const displayAmount = state === 'WIN_DISPLAY' ? totalWin : currentWin;

  const isBigWin = state === 'WIN_DISPLAY' && totalWin > betAmount * 20;

  const showCascadeBadge =
    cascadeDepth > 1 &&
    (state === 'CASCADING' || state === 'RESOLVING');

  /* --- count-up ----------------------------------------------------- */
  const animatedAmount = useCountUp(displayAmount, state === 'WIN_DISPLAY' && showWin);
  const visibleAmount = state === 'WIN_DISPLAY' ? animatedAmount : displayAmount;

  /* --- render ------------------------------------------------------- */
  return (
    <div className="min-h-[5rem] flex flex-col items-center justify-center gap-1">
      <AnimatePresence mode="wait">
        {showWin && displayAmount > 0 && (
          <motion.div
            key="win"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-center flex flex-col items-center gap-1"
          >
            {/* ---------- BIG WIN label ---------- */}
            {isBigWin && (
                <motion.div
                key="bigwin"
                initial={{ scale: 0, rotate: -10 }}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{
                  scale: { repeat: Infinity, duration: 0.6, ease: 'easeInOut' },
                  rotate: { repeat: Infinity, duration: 0.4, ease: 'easeInOut' },
                }}
                className="w-40 sm:w-48 h-auto drop-shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src={getWinTier(totalWin, betAmount) === 'LEGENDARY' ? '/submissions/loot-tumble/epic win.png' : getWinTier(totalWin, betAmount) === 'MEGA' ? '/submissions/loot-tumble/mega win.png' : '/submissions/loot-tumble/big win.png'} 
                    alt="Win Tier" 
                    className="w-full h-auto object-contain"
                    draggable={false}
                />
              </motion.div>
            )}

            {/* ---------- Cascade badge ---------- */}
            {showCascadeBadge && (
              <motion.div
                key={`cascade-${cascadeDepth}`}
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className={`
                  inline-flex items-center gap-1 px-3 py-0.5 rounded-full border
                  font-bold text-sm
                  ${cascadeBadgeColor(cascadeDepth)}
                  ${cascadeTextColor(cascadeDepth)}
                `}
              >
                <motion.span
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                >
                  ⚡
                </motion.span>
                Cascade x{cascadeDepth}!
              </motion.div>
            )}

            {/* ---------- Win amount ---------- */}
            {state === 'WIN_DISPLAY' && multiplierTotal > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-full border border-cyan-300/60 bg-cyan-400/15 px-3 py-1 text-sm font-black uppercase tracking-wider text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.35)]"
              >
                Bonus x{multiplierTotal}
              </motion.div>
            )}

            <motion.p
              className={`font-bold tabular-nums ${
                state === 'WIN_DISPLAY'
                  ? 'text-3xl text-amber-300'
                  : 'text-2xl text-amber-400'
              }`}
              animate={
                state === 'WIN_DISPLAY'
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={
                state === 'WIN_DISPLAY'
                  ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                  : {}
              }
            >
              {formatWinAmount(visibleAmount)} APE
            </motion.p>
          </motion.div>
        )}

        {state === 'SPINNING' && (
          <motion.p
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-purple-400 text-lg"
          >
            Spinning...
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

