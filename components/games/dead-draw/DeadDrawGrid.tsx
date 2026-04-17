'use client';

import React from 'react';
import { Board, GRID_SIZE } from './engine/types';
import DeadDrawCard, { RevealSpeed } from './DeadDrawCard';

interface DeadDrawGridProps {
  board: Board | null;
  depth: number;
  onClickPosition: (positionIndex: number) => void;
  onShotSound?: () => void;
  onGlassShatter?: () => void;
  disabled: boolean;
  revealSpeed: RevealSpeed;
  currentMode?: 'take' | 'shoot';
  destroyedPositions?: number[];
  cardPhase?: 'ready' | 'flipped' | 'dismissing' | null;
  lockedMode?: 'take' | 'shoot' | null;
  revealingPosition?: number | null;
  multiplierTier?: number;
  currentMultiplier?: number;
  revengePositions?: number[];
}

const DeadDrawGrid: React.FC<DeadDrawGridProps> = React.memo(
  ({ board, depth, onClickPosition, onShotSound, onGlassShatter, disabled, revealSpeed, currentMode = 'take', destroyedPositions = [], cardPhase = null, lockedMode = null, revealingPosition = null, multiplierTier = 0, currentMultiplier = 1, revengePositions = [] }) => {
    const gridClasses = [
      'dead-draw-grid',
      currentMode === 'shoot' ? 'dead-draw-grid--shoot-mode' : 'dead-draw-grid--take-mode',
      multiplierTier >= 3 ? 'dead-draw-grid--high-stakes' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        className={gridClasses}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: 'clamp(0.25rem, 1vw, 0.5rem)',
          width: 'clamp(200px, 50vw, 380px)',
          maxWidth: '50vh',
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const position = board?.positions[index] ?? null;
          const isRevealed = position?.revealed ?? false;
          const isDestroyed = destroyedPositions.includes(index);
          const isClickable =
            !disabled && !isRevealed && !isDestroyed && board !== null;

          return (
            <DeadDrawCard
              key={index}
              index={index}
              position={position}
              depth={depth}
              revealed={isRevealed}
              onClick={() => {
                if (isClickable) {
                  onClickPosition(index);
                }
              }}
              disabled={!isClickable}
              revealSpeed={revealSpeed}
              onShotSound={onShotSound}
              onGlassShatter={onGlassShatter}
              currentMode={currentMode}
              isDestroyed={isDestroyed}
              cardPhase={revealingPosition === index ? cardPhase : null}
              lockedMode={lockedMode}
              isActiveReveal={revealingPosition === index}
              multiplierTier={multiplierTier}
              currentMultiplier={currentMultiplier}
              revengeFlip={revengePositions.includes(index)}
            />
          );
        })}
      </div>
    );
  }
);

DeadDrawGrid.displayName = 'DeadDrawGrid';

export default DeadDrawGrid;
