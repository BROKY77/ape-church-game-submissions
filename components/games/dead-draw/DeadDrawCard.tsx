'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Position } from './engine/types';

interface DeadDrawCardProps {
  index: number;
  position: Position | null;
  depth: number;
  revealed: boolean;
  onClick: () => void;
  disabled: boolean;
  revealSpeed: RevealSpeed;
  onShotSound?: () => void;
  onGlassShatter?: () => void;
  currentMode?: 'take' | 'shoot';
  isDestroyed?: boolean;
  cardPhase?: 'ready' | 'flipped' | 'dismissing' | null;
  lockedMode?: 'take' | 'shoot' | null;
  isActiveReveal?: boolean;
  multiplierTier?: number;
  currentMultiplier?: number;
  revengeFlip?: boolean;
}

/** Revenge flip: mounts showing card back, flips to sheriff after a frame */
function RevengeFlipCard({ depth, position, currentMode }: { depth: number; position: Position; currentMode?: string }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    // Trigger flip on next frame so the CSS transition animates
    const raf = requestAnimationFrame(() => setFlipped(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const flipClasses = [
    'dead-draw-card__flip-inner',
    flipped ? 'dead-draw-card__flip-inner--flipped' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className="dead-draw-card__flip-container dead-draw-card__flip-container--revenge"
      style={{ zIndex: depth + 1 }}
    >
      <div className={flipClasses} style={{ '--dd-flip-speed': '300ms' } as React.CSSProperties}>
        <div className="dead-draw-card__flip-front">
          <img
            className="dead-draw-card__back-img"
            src="/submissions/dead-draw/cardback.png"
            alt="Card back"
            draggable={false}
          />
        </div>
        <div className="dead-draw-card__flip-back">
          <CardFace value={0} isSheriff={true} mode="take" showFlash={true} />
        </div>
      </div>
    </div>
  );
}

/**
 * Flip animation duration scales with multiplier tier.
 * Low stakes = fast flip. High stakes = slow, dramatic reveal.
 */
function getFlipDuration(tier: number): number {
  switch (tier) {
    case 0: return 300;  // < 2x — snappy
    case 1: return 500;  // 2–15x — noticeable
    case 2: return 650;  // 15–30x — deliberate
    case 3: return 800;  // 30x+ — dramatic
    default: return 300;
  }
}

/** Emoji fallbacks for loot cards without image assets */
const LOOT_ICONS: Record<number, string> = {
  2: '\u{1F3C7}', 3: '\u{1F0CF}', 4: '\u{1F37E}', 5: '\u{1F52B}',
  6: '\u{1FA99}', 7: '\u{1F9E8}', 8: '\u{1F3C6}', 9: '\u{1F4DC}',
  10: '\u{231A}', 11: '\u{1F5E1}', 12: '\u{1F45C}', 13: '\u{1F40D}',
  14: '\u{1F4F0}', 15: '\u{1F511}',
};

/** Image assets for loot cards — maps card value to asset path */
const LOOT_IMAGES: Record<number, string> = {
  2: '/submissions/dead-draw/spur.png',
  3: '/submissions/dead-draw/oldboot.png',
  4: '/submissions/dead-draw/bulletpile.png',
  5: '/submissions/dead-draw/bottle.png',
  6: '/submissions/dead-draw/cowboyhat.png',
  7: '/submissions/dead-draw/knife.png',
  8: '/submissions/dead-draw/dynamite.png',
  9: '/submissions/dead-draw/coins.png',
  10: '/submissions/dead-draw/beltbuckle.png',
  11: '/submissions/dead-draw/pockwatch.png',
  12: '/submissions/dead-draw/saddlebag.png',
  13: '/submissions/dead-draw/goldcoins.png',
  14: '/submissions/dead-draw/goldbar.png',
  15: '/submissions/dead-draw/diamond.png',
};

/** Sheriff image: gun pointed at player in take mode, badge in shoot mode */
const SHERIFF_IMAGE_TAKE = '/submissions/dead-draw/sheriffontake.png';
const SHERIFF_IMAGE_SHOOT = '/submissions/dead-draw/sheriffonshoot.png';

/** Fallback for loot values without an image */
const LOOT_IMAGE_FALLBACK = '/submissions/dead-draw/bottle.png';

function CardFace({ value, isSheriff, mode, showFlash }: { value: number; isSheriff: boolean; mode?: 'take' | 'shoot'; showFlash?: boolean }) {
  if (isSheriff) {
    const sheriffSrc = mode === 'shoot' ? SHERIFF_IMAGE_SHOOT : SHERIFF_IMAGE_TAKE;
    return (
      <div className="dead-draw-card__face dead-draw-card__face--sheriff dead-draw-card__face--has-img">
        <img
          className="dead-draw-card__loot-img"
          src={sheriffSrc}
          alt="Sheriff"
          draggable={false}
        />
        {showFlash && mode === 'take' && (
          <div className="dead-draw-card__muzzle-flash" />
        )}
      </div>
    );
  }

  const imageSrc = LOOT_IMAGES[value] ?? LOOT_IMAGE_FALLBACK;

  return (
    <div className="dead-draw-card__face dead-draw-card__face--loot dead-draw-card__face--has-img">
      <img
        className="dead-draw-card__loot-img"
        src={imageSrc}
        alt={`Loot ${value}`}
        draggable={false}
      />
    </div>
  );
}

function Shards({ id, children, durationMs }: { id: string; children: React.ReactNode; durationMs: number }) {
  return (
    <div className="dead-draw-card__shatter-overlay" key={id}>
      {['tl', 'tr', 'ml', 'mr', 'bl', 'br'].map((d) => (
        <div
          key={d}
          className={`dead-draw-card__shard dead-draw-card__shard--${d}`}
          style={{ animationDuration: `${durationMs}ms` }}
        >
          <div className="dead-draw-card__shard-content">
            {children}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Returns stack offset in px — smaller on mobile */
function getStackOffset(): number {
  if (typeof window !== 'undefined' && window.innerWidth <= 640) return 3;
  return 6;
}

const LAYER_OFFSET_DESKTOP = 5;
const LAYER_OFFSET_MOBILE = 3;

/** Timing presets for reveal speed */
export type RevealSpeed = 'slow' | 'fast' | 'triggerhappy';
export const REVEAL_TIMINGS: Record<RevealSpeed, { shardMs: number; pauseMs: number }> = {
  slow: { shardMs: 500, pauseMs: 350 },
  fast: { shardMs: 300, pauseMs: 150 },
  triggerhappy: { shardMs: 150, pauseMs: 50 },
};

/**
 * Per-layer state:
 * - 'back': showing card back
 * - 'face': showing card face (loaded on reveal for anti-cheat)
 * - 'shattering': shards flying, content hidden
 * - 'gone': removed from DOM
 */
type LayerState = 'back' | 'face' | 'shattering' | 'gone';

const DeadDrawCard: React.FC<DeadDrawCardProps> = React.memo(
  ({
    index, position, depth, revealed,
    onClick, disabled, revealSpeed, onShotSound,
    currentMode = 'take', isDestroyed = false,
    cardPhase = null, lockedMode = null, isActiveReveal = false,
    multiplierTier = 0, currentMultiplier = 1, revengeFlip = false,
  }) => {
    const revealProgress = position?.revealProgress ?? 0;
    const isSheriff = position?.containsSheriff ?? false;

    // Each layer has its own state. Layer 0 = top, layer depth-1 = bottom.
    const [layers, setLayers] = useState<LayerState[]>(
      () => Array(depth).fill('back') as LayerState[]
    );
    // Which layers have had their face content loaded (anti-cheat)
    const [loadedFaces, setLoadedFaces] = useState<Set<number>>(() => new Set());
    // Increments on each shatter start so React remounts Shards for fresh animation
    const [shatterGen, setShatterGen] = useState(0);
    // Layers whose current shatter is a "back shatter" (shards show card back, not face)
    const [backShatter, setBackShatter] = useState<Set<number>>(() => new Set());
    const timersRef = useRef<NodeJS.Timeout[]>([]);
    const lastRevealProgress = useRef(0);
    const lastRevealed = useRef(false);

    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    const scheduleAt = (ms: number, fn: () => void) => {
      timersRef.current.push(setTimeout(fn, ms));
    };

    const updateLayer = (layerIdx: number, state: LayerState) => {
      setLayers(prev => {
        const next = [...prev];
        next[layerIdx] = state;
        return next;
      });
    };

    const loadFace = (layerIdx: number) => {
      setLoadedFaces(prev => {
        const next = new Set(prev);
        next.add(layerIdx);
        return next;
      });
    };

    // Build animation timeline when revealProgress or revealed changes
    // Skip for take mode — take mode uses the flip/dismiss system instead
    useEffect(() => {
      const prevProg = lastRevealProgress.current;
      const prevRev = lastRevealed.current;
      lastRevealProgress.current = revealProgress;
      lastRevealed.current = revealed;

      // Take mode uses flip rendering, not shatter
      if (currentMode === 'take') return;

      const progChanged = revealProgress > prevProg;
      const revChanged = revealed && !prevRev;

      // Rampage flip: card was already being driven by the flip path (prevProg > 0),
      // now RAMPAGE_FLIP_DONE marked it revealed — skip shatter.
      // But NOT for shoot mode — shoot mode needs the final face shatter when revealed.
      if (prevProg > 0 && revChanged && currentMode !== 'shoot') return;

      if (!progChanged && !revChanged) return;
      if (!position) return;
      if (revealProgress - prevProg <= 0 && !revChanged) return;

      const { shardMs, pauseMs } = REVEAL_TIMINGS[revealSpeed];
      clearTimers();
      let t = 0;
      const isDepthMulti = depth > 1;
      // Final shatter: the last visible face shatters away when the position is fully revealed.
      // In take mode, skip for sheriff positions (bust stops the reveal).
      // In shoot mode, always shatter (the whole stack clears on completion).
      const shouldFinalShatter = revChanged && (currentMode === 'shoot' || !isSheriff);

      // Timeline:
      // Layer 0 (top): back → shattering(back) → face → shattering(face) → gone
      // Layer 1..N-2:  back(hidden) → face → shattering(face) → gone
      // Layer N-1 (bottom): back(hidden) → face (stays if sheriff or depth=1, else shatters → gone)

      // Step through revealProgress increments.
      // Increment 0 = card back shatters on layer 0, reveals layer 0 face.
      // Increment 1+ = layer 0 face shatters (if i=1), then layer i-1's face was showing,
      //   but we're using a single-element model mapped to layers now.
      //
      // Mapping: revealProgress increment i maps to the animation sequence.
      // i=0: layer 0 back shatters → layer 0 shows face
      // i=1: layer 0 face shatters → layer 0 gone, layer 1 shows face
      // i=2: layer 1 face shatters → layer 1 gone, layer 2 shows face
      // ...
      // i=N-1: layer N-2 face shatters → layer N-2 gone, layer N-1 shows face

      for (let i = prevProg; i < revealProgress; i++) {
        if (i === 0) {
          // Card back shatters on layer 0, face loads underneath shards
          // Preload ALL face images now so deeper layers are ready instantly
          scheduleAt(t, () => {
            onShotSound?.();
            setShatterGen(g => g + 1);
            setBackShatter(new Set([0]));
            setLoadedFaces(() => {
              const all = new Set<number>();
              for (let f = 0; f < depth; f++) all.add(f);
              return all;
            });
            updateLayer(0, 'shattering');
          });
          t += shardMs;
          // Shatter done — show face, no pause (shell is just a cover)
          scheduleAt(t, () => {
            setBackShatter(new Set());
            updateLayer(0, 'face');
          });
        } else {
          // Layer (i-1) face shatters → gone, layer i face already visible underneath
          const shatterLayer = i - 1;
          const revealLayer = i;
          // Load + show next face at shatter start — it's behind (lower z-index),
          // so it's hidden by the shattering layer's shards until they fly away
          scheduleAt(t, () => {
            onShotSound?.();
            setShatterGen(g => g + 1);
            loadFace(revealLayer);
            updateLayer(revealLayer, 'face');
            updateLayer(shatterLayer, 'shattering');
          });
          t += shardMs;
          // Shatter done — just remove the shattered layer
          scheduleAt(t, () => {
            updateLayer(shatterLayer, 'gone');
          });
          t += pauseMs;
        }
      }

      // Final shatter: last visible layer shatters to gone
      if (shouldFinalShatter) {
        const lastLayer = depth - 1;
        scheduleAt(t, () => {
          onShotSound?.();
          setShatterGen(g => g + 1);
          updateLayer(lastLayer, 'shattering');
        });
        t += shardMs;
        scheduleAt(t, () => {
          updateLayer(lastLayer, 'gone');
        });
      }

      return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [revealProgress, revealed]);

    // Take mode: when card is revealed/completed, set all layers to gone
    useEffect(() => {
      if (revealed && currentMode === 'take') {
        setLayers(Array(depth).fill('gone') as LayerState[]);
      }
    }, [revealed, currentMode, depth]);

    // Sheriff shot-away: trigger when position gets destroyed in shoot mode

    // Reset on new game
    useEffect(() => {
      if (revealProgress === 0 && !revealed) {
        clearTimers();
        setLayers(Array(depth).fill('back') as LayerState[]);
        setLoadedFaces(new Set());
        setShatterGen(0);
        setBackShatter(new Set());
        lastRevealProgress.current = 0;
        lastRevealed.current = false;
      }
    }, [revealProgress, revealed, depth]);

    // Cleanup
    useEffect(() => () => clearTimers(), []);

    const allGone = layers.every(s => s === 'gone');
    const lastLayerIsSheriffFace = isSheriff && layers[depth - 1] === 'face';
    // In shoot mode, the sheriff may be at any layer (not just bottom).
    // Find which layer is showing the sheriff face.
    const sheriffFaceLayer = isSheriff
      ? layers.findIndex((s, i) => s === 'face' && position?.cards[i]?.isSheriff)
      : -1;
    const anySheriffFaceVisible = sheriffFaceLayer !== -1;

    // Show pseudo-element stack for multi-depth cards (non-active positions only).
    // During active take reveal, the flip path renders its own stack elements.
    const usesPseudoStack = depth > 1 && !revealed && !allGone && !isDestroyed && revealProgress < depth
      && !(isActiveReveal && lockedMode === 'take');
    const buttonClasses = [
      'dead-draw-card',
      (revealed || allGone || isDestroyed) ? 'dead-draw-card--revealed' : 'dead-draw-card--hidden',
      (lastLayerIsSheriffFace || anySheriffFaceVisible) ? 'dead-draw-card--sheriff' : '',
      disabled ? 'dead-draw-card--disabled' : 'dead-draw-card--clickable',
      allGone ? 'dead-draw-card--gone' : '',
      currentMode === 'shoot' && !disabled ? 'dead-draw-card--shoot-mode' : '',
      isDestroyed ? 'dead-draw-card--destroyed' : '',
      usesPseudoStack ? `dead-draw-card--stack-${depth}` : '',
      multiplierTier > 0 ? `dead-draw-card--hover-tier-${multiplierTier}` : '',
    ].filter(Boolean).join(' ');

    // Render each layer as its own element at a fixed offset. Nothing ever moves.
    const renderLayers = () => {
      // --- REVENGE FLIP: sheriffs shoot back on shot_loot bust ---
      if (revengeFlip && position && position.containsSheriff && !revealed && !isDestroyed) {
        return [<RevengeFlipCard key="revenge-flip" depth={depth} position={position} currentMode={currentMode} />];
      }

      // --- TAKE MODE: flip + dismiss rendering ---
      if (isActiveReveal && lockedMode === 'take' && position) {
        // Which card are we on? If flipped, revealProgress-1. If ready, revealProgress.
        const currentCardIdx = position.revealProgress > 0 ? position.revealProgress - 1 : 0;
        const isFlipped = cardPhase === 'flipped' || cardPhase === 'dismissing';
        const isDismissing = cardPhase === 'dismissing';
        const currentCard = position.cards[currentCardIdx];
        // For ready state (next card to flip), use revealProgress as the card index
        const displayIdx = cardPhase === 'ready' ? position.revealProgress : currentCardIdx;
        const offset = displayIdx * getStackOffset();

        const flipClasses = [
          'dead-draw-card__flip-inner',
          isFlipped ? 'dead-draw-card__flip-inner--flipped' : '',
          isDismissing ? 'dead-draw-card__flip-inner--dismissing' : '',
        ].filter(Boolean).join(' ');

        // Render remaining stack cards behind the current flip card
        const stackElements: React.ReactNode[] = [];
        for (let s = depth - 1; s > displayIdx; s--) {
          const sOffset = s * getStackOffset();
          stackElements.push(
            <div
              key={`stack-${s}`}
              className="dead-draw-card__flip-stack-card"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: depth - s,
                transform: `translate(${sOffset}px, ${sOffset}px)`,
                borderRadius: '0.5rem',
                overflow: 'hidden',
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)) brightness(0.7)',
              }}
            >
              <img
                className="dead-draw-card__back-img"
                src="/submissions/dead-draw/cardback.png"
                alt=""
                draggable={false}
              />
            </div>
          );
        }

        // When dismissing, skip the 3D flip entirely — just show the face sliding up
        if (isDismissing) {
          return [
            ...stackElements,
            <div key="dismiss" className="dead-draw-card__flip-container" style={{
              zIndex: depth - displayIdx + 1,
              transform: offset > 0 ? `translate(${offset}px, ${offset}px)` : undefined,
            }}>
              <div className="dead-draw-card__flip-inner dead-draw-card__flip-inner--dismiss-face">
                <CardFace value={currentCard.value} isSheriff={currentCard.isSheriff} mode={currentMode} showFlash={currentCard.isSheriff} />
              </div>
            </div>,
          ];
        }

        return [
          ...stackElements,
          <div key="flip" className="dead-draw-card__flip-container" style={{
            zIndex: depth - displayIdx + 1,
            transform: offset > 0 ? `translate(${offset}px, ${offset}px)` : undefined,
          }}>
            <div className={flipClasses} style={{ '--dd-flip-speed': `${getFlipDuration(multiplierTier)}ms` } as React.CSSProperties}>
              <div className="dead-draw-card__flip-front">
                <img
                  className="dead-draw-card__back-img"
                  src="/submissions/dead-draw/cardback.png"
                  alt="Card back"
                  draggable={false}
                />
              </div>
              <div className="dead-draw-card__flip-back">
                {position.revealProgress > 0 && (
                  <CardFace value={currentCard.value} isSheriff={currentCard.isSheriff} mode={currentMode} showFlash={currentCard.isSheriff} />
                )}
              </div>
            </div>
          </div>,
        ];
      }

      const elements: React.ReactNode[] = [];

      // If position is already revealed, don't render stale layers
      // Skip rendering if fully revealed — unless a shatter is still playing
      const hasActiveAnim = layers.some((s) => s === 'shattering');
      if (revealed && !hasActiveAnim) return elements;

      for (let i = depth - 1; i >= 0; i--) {
        const state = layers[i];
        if (state === 'gone') continue;

        const zIndex = depth - i; // layer 0 = top = highest z-index
        const layerOffset = typeof window !== 'undefined' && window.innerWidth <= 640 ? LAYER_OFFSET_MOBILE : LAYER_OFFSET_DESKTOP;
        const offset = i * layerOffset;
        const isShattering = state === 'shattering';

        // Content: only layer 0 shows card back, other layers are blank until face loads
        let content: React.ReactNode = null;
        if (state === 'back' && i === 0) {
          content = (
            <div className="dead-draw-card__back">
              <img
                className="dead-draw-card__back-img"
                src="/submissions/dead-draw/cardback.png"
                alt="Card back"
                draggable={false}
              />
            </div>
          );
        } else if (state === 'face' && loadedFaces.has(i)) {
          if (position && i < position.cards.length) {
            const card = position.cards[i];
            const isSheriffCard = card.isSheriff;
            content = <CardFace value={card.value} isSheriff={isSheriffCard} mode={currentMode} showFlash={isSheriffCard} />;
          }
        }

        // Shards: show what the layer looked like before shattering
        let shards: React.ReactNode = null;
        if (isShattering) {
          let shardContent: React.ReactNode;
          if (loadedFaces.has(i) && !backShatter.has(i) && position) {
            // Was showing face
            const card = position.cards[i];
            shardContent = <CardFace value={card.value} isSheriff={card.isSheriff} mode={currentMode} />;
          } else {
            // Was showing back
            shardContent = (
              <div className="dead-draw-card__back">
                <img
                  className="dead-draw-card__back-img"
                  src="/submissions/dead-draw/cardback.png"
                  alt=""
                  draggable={false}
                />
              </div>
            );
          }
          shards = (
            <Shards id={`shatter-${index}-${i}-${shatterGen}`} durationMs={REVEAL_TIMINGS[revealSpeed].shardMs}>
              {shardContent}
            </Shards>
          );
        }

        const isBackShatter = isShattering && backShatter.has(i);
        // All faces and card backs use image assets — always strip layer chrome
        const layerHasImage = (state === 'face' && loadedFaces.has(i)) || (state === 'back' && i === 0);
        const layerClasses = [
          'dead-draw-card__layer',
          isShattering && !isBackShatter ? 'dead-draw-card__layer--shattering' : '',
          isBackShatter ? 'dead-draw-card__layer--back-shattering' : '',
          sheriffFaceLayer === i ? 'dead-draw-card__layer--sheriff' : '',
          layerHasImage ? 'dead-draw-card__layer--has-img' : '',
        ].filter(Boolean).join(' ');

        // Only show face underneath shards during a back-shatter (card back → face reveal)
        // Wrapped in its own bordered container so it looks like a full card under the shell
        let underContent: React.ReactNode = null;
        if (isShattering && backShatter.has(i) && loadedFaces.has(i) && position && i < position.cards.length) {
          const card = position.cards[i];
          underContent = (
            <div className="dead-draw-card__under-face">
              <CardFace value={card.value} isSheriff={card.isSheriff} mode={currentMode} />
            </div>
          );
        }

        elements.push(
          <div
            key={i}
            className={layerClasses}
            style={{
              zIndex,
              transform: offset > 0 ? `translate(${offset}px, ${offset}px)` : undefined,
            }}
          >
            <div className="dead-draw-card__layer-inner">
              {isShattering ? underContent : content}
            </div>
            {shards}
          </div>
        );
      }

      // Pre-game: no position yet, show card back
      if (elements.length === 0 && !position) {
        elements.push(
          <div key="pregame" className="dead-draw-card__layer dead-draw-card__layer--has-img" style={{ zIndex: depth }}>
            <div className="dead-draw-card__layer-inner">
              <div className="dead-draw-card__back">
                <img
                  className="dead-draw-card__back-img"
                  src="/submissions/dead-draw/cardback.png"
                  alt="Card back"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        );
      }

      return elements;
    };

    return (
      <button
        className={`${buttonClasses} ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none`}
        onClick={onClick}
        disabled={disabled}
        aria-label={`Position ${index + 1}`}
        style={currentMultiplier >= 4 ? {
          '--dd-shake-px': `${0.3 + Math.min((currentMultiplier - 4) / 40, 1) * 1.7}px`,
        } as React.CSSProperties : undefined}
      >
        {renderLayers()}
      </button>
    );
  }
);

DeadDrawCard.displayName = 'DeadDrawCard';

export default DeadDrawCard;
