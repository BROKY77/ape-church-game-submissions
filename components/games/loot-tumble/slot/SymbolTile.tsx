'use client';

import { motion } from 'framer-motion';
import { SymbolId } from '@/components/games/loot-tumble/types';
import { SYMBOL_MAP } from '@/components/games/loot-tumble/config/symbols';
import { SYMBOL_IMAGES } from '@/components/games/loot-tumble/config/symbol-icons';

interface Props {
  symbolId: SymbolId;
  isHighlighted: boolean;
  isRemoving: boolean;
  /** True when this cell just finished a gravity fall or new-symbol drop */
  isLanded?: boolean;
  /** True when the reel is currently spinning rapidly */
  isSpinning?: boolean;
  bonusActive?: boolean;
  bonusEffectMode?: 'none' | 'transition' | 'full';
  multiplierValue?: number;
  onClick?: (symbolId: SymbolId) => void;
}

export function SymbolTile({
  symbolId,
  isHighlighted,
  isRemoving,
  isLanded = false,
  isSpinning = false,
  bonusActive = false,
  bonusEffectMode = 'full',
  multiplierValue,
  onClick,
}: Props) {
  const symbol = SYMBOL_MAP[symbolId];
  if (!symbol) return null;

  const imageSrc = SYMBOL_IMAGES[symbolId];
  const resolvedBonusEffectMode = bonusActive ? bonusEffectMode : 'none';
  const showTransitionBonusEffect = resolvedBonusEffectMode === 'transition';
  const showFullBonusEffect = resolvedBonusEffectMode === 'full';
  const bonusChargeFilter = isSpinning
    ? `brightness(1.18) saturate(1.2) contrast(1.08) drop-shadow(0 0 2px rgba(255,255,255,0.45)) drop-shadow(0 0 5px ${symbol.color}bb) drop-shadow(0 0 10px ${symbol.color}80)`
    : `brightness(1.2) saturate(1.24) contrast(1.1) drop-shadow(0 0 2px rgba(255,255,255,0.75)) drop-shadow(0 0 6px ${symbol.color}ff) drop-shadow(0 0 12px ${symbol.color}d0) drop-shadow(0 0 18px ${symbol.color}8c)`;
  const bonusSparkFilter = isSpinning
    ? `brightness(1.12) saturate(1.05) drop-shadow(0 0 4px rgba(255,255,255,0.38))`
    : `brightness(1.4) saturate(0.95) contrast(1.12) drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 0 8px rgba(255,245,195,0.75))`;
  const bonusTransitionFilter = isSpinning
    ? `brightness(1.08) saturate(1.12) drop-shadow(0 0 3px ${symbol.color}70)`
    : `brightness(1.14) saturate(1.18) contrast(1.06) drop-shadow(0 0 2px rgba(255,255,255,0.42)) drop-shadow(0 0 7px ${symbol.color}b3)`;
  const bonusTransitionImageFilter = isSpinning
    ? `brightness(1.04) saturate(1.08) drop-shadow(0px 3px 5px rgba(0,0,0,0.28))`
    : `brightness(1.06) saturate(1.1) contrast(1.03) drop-shadow(0px 5px 8px rgba(0,0,0,0.38)) drop-shadow(0px 0px 7px ${symbol.color}6e)`;
  const bonusImageFilter = isSpinning
    ? `brightness(1.05) saturate(1.08) drop-shadow(0px 3px 5px rgba(0,0,0,0.3))`
    : `brightness(1.08) saturate(1.14) contrast(1.04) drop-shadow(0px 6px 10px rgba(0,0,0,0.45)) drop-shadow(0px 0px 10px ${symbol.color}96)`;

  // Determine animation state
  const getAnimate = () => {
    if (isHighlighted) {
      return {
        scale: [1, 1.25, 1.15, 1.2],
        rotate: [0, -5, 5, -2, 2, 0],
        filter: ["brightness(1)", "brightness(1.5)", "brightness(1.1)"],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          repeatType: "reverse" as const,
        },
      };
    }
    if (isRemoving) {
      return {
        scale: 0,
        opacity: 0,
        rotate: 45,
        filter: "brightness(2)",
        transition: { type: "spring" as const, stiffness: 300, damping: 20 },
      };
    }
    if (isLanded) {
      return {
        scale: [1, 1.15, 0.95, 1],
        y: [0, -10, 5, 0],
        transition: { duration: 0.3, ease: 'easeOut' as const },
      };
    }
    return { scale: 1, opacity: 1, rotate: 0, y: 0, filter: "brightness(1)" };
  };

  return (
    <motion.div
      suppressHydrationWarning
      className={`
        aspect-square w-full h-full flex items-center justify-center relative
        transition-all duration-300
        ${isHighlighted ? 'z-20' : 'z-10'}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      animate={getAnimate()}
      onClick={onClick ? () => onClick(symbolId) : undefined}
    >
      {/* Glowing Aura on Win */}
      {isHighlighted && (
        <div
          className="absolute inset-0 rounded-full blur-2xl scale-125 saturate-200"
          style={{ backgroundColor: `${symbol.color}66` }}
        />
      )}

      {/* Symbol PNG Image */}
      {imageSrc ? (
        <div className="relative z-10 w-[80%] h-[80%] flex items-center justify-center">
          {showTransitionBonusEffect && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none opacity-80"
                style={{
                  filter: bonusTransitionFilter,
                  transform: 'scale(1.02)',
                }}
                draggable={false}
                loading="eager"
              />
            </>
          )}

          {showFullBonusEffect && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 h-full w-full object-contain pointer-events-none ${isSpinning ? 'opacity-70' : 'animate-[bonusSymbolCharge_1.35s_ease-in-out_infinite]'}`}
                style={{
                  filter: bonusChargeFilter,
                  transform: 'scale(1.035)',
                  mixBlendMode: 'screen',
                }}
                draggable={false}
                loading="eager"
              />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 h-full w-full object-contain pointer-events-none ${isSpinning ? 'opacity-0' : 'animate-[bonusSymbolArc_1.1s_ease-in-out_infinite]'}`}
                style={{
                  filter: bonusSparkFilter,
                  transform: 'scale(1.015)',
                  mixBlendMode: 'screen',
                }}
                draggable={false}
                loading="eager"
              />
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={symbol.name}
              className="w-full h-full object-contain"
              style={{
                filter: resolvedBonusEffectMode === 'full'
                  ? bonusImageFilter
                  : resolvedBonusEffectMode === 'transition'
                    ? bonusTransitionImageFilter
                    : isSpinning
                      ? 'none'
                  : `drop-shadow(0px 4px 6px rgba(0,0,0,0.5)) drop-shadow(0px 0px 10px ${symbol.color}30)`,
            }}
            draggable={false}
            loading="eager"
          />

          {symbolId === 'multiplier' && multiplierValue && (
            <div className="absolute right-[2%] top-[6%] z-20 pointer-events-none">
              <span className="flex min-w-[2rem] items-center justify-center rounded-full border border-amber-200/70 bg-[#1a1107]/88 px-1.5 py-0.5 text-[0.62rem] font-black leading-none text-amber-200 shadow-[0_0_10px_rgba(250,204,21,0.55)] md:min-w-[2.4rem] md:text-[0.74rem]">
                x{multiplierValue}
              </span>
            </div>
          )}
        </div>
      ) : (
        <span className="select-none text-2xl font-black text-white">?</span>
      )}
    </motion.div>
  );
}
