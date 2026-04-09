'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GameState, TOTAL_POSITIONS, BPS_PRECISION, DISCOUNT_BPS } from './engine/types';
import { getCashOutFontTier } from './engine/suspense';
import { combinations } from './engine/multiplier';

interface DeadDrawBottomBarProps {
  gameState: GameState;
  betAmount: number;
  onSwitchMode: (mode: 'take' | 'shoot') => void;
  onCashOut: () => void;
}

const DeadDrawBottomBar: React.FC<DeadDrawBottomBarProps> = ({
  gameState,
  betAmount,
  onSwitchMode,
  onCashOut,
}) => {
  const {
    currentMode,
    currentView,
    board,
    shotsTaken,
    currentMultiplier,
    isRevealing,
  } = gameState;

  const prevShotsTaken = useRef(shotsTaken);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (shotsTaken > prevShotsTaken.current && shotsTaken > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
    prevShotsTaken.current = shotsTaken;
  }, [shotsTaken]);

  if (currentView !== 1 || !board) return null;

  const fontTier = getCashOutFontTier(shotsTaken, board.depth);
  const canCashOut = shotsTaken > 0 && !isRevealing;
  const cashOutAmount = (betAmount * currentMultiplier).toFixed(2);
  const canToggleMode = !isRevealing;

  // Calculate what the multiplier would become for each mode's next action
  const depth = board.depth;
  const totalDone = gameState.revealedPositions.length + gameState.destroyedPositions.length;
  const totalCards = (TOTAL_POSITIONS - totalDone) * depth;
  const sheriffsLeft = board.sheriffCount - gameState.eliminatedSheriffs;
  const safeCards = totalCards - sheriffsLeft;

  let pSafe: number;
  if (depth === 1) {
    pSafe = safeCards / totalCards;
  } else {
    pSafe = combinations(safeCards, depth) / combinations(totalCards, depth);
  }
  const pSheriff = 1 - pSafe;
  const discount = DISCOUNT_BPS / BPS_PRECISION;

  const takeStep = (1 / pSafe) * discount;
  const shootStep = pSheriff > 0 ? (1 / pSheriff) * discount : 0;

  const liveTakeResultMult = currentMultiplier * takeStep;
  const liveShootResultMult = currentMultiplier * shootStep;

  // Freeze step labels during shoot-mode reveal so mid-stack eliminatedSheriffs
  // changes don't cause premature updates. Update when shotsTaken changes (stack done).
  const frozenSteps = useRef({ take: liveTakeResultMult, shoot: liveShootResultMult });
  const prevShots = useRef(shotsTaken);
  if (!isRevealing || shotsTaken !== prevShots.current) {
    frozenSteps.current = { take: liveTakeResultMult, shoot: liveShootResultMult };
    prevShots.current = shotsTaken;
  }
  const takeResultMult = frozenSteps.current.take;
  const shootResultMult = frozenSteps.current.shoot;

  return (
    <div className="dead-draw-bottom-bar">
      {/* TAKE button */}
      <div className="dead-draw-bottom-bar__mode-col">
        <span className="dead-draw-bottom-bar__step-label dead-draw-bottom-bar__step-label--take">
          {takeResultMult.toFixed(2)}x
        </span>
        <button
          className={`dead-draw-bottom-bar__mode-btn dead-draw-bottom-bar__mode-btn--take${
            currentMode === 'take' ? ' dead-draw-bottom-bar__mode-btn--active' : ''
          }`}
          onClick={() => onSwitchMode('take')}
          disabled={!canToggleMode || currentMode === 'take'}
        >
          <img className="dead-draw-bottom-bar__mode-icon--img" src="/submissions/dead-draw/glovefortake.png" alt="Take" draggable={false} />
        </button>
      </div>

      {/* Center: cash out */}
      <div className="dead-draw-bottom-bar__center">
        <button
          className={`dead-draw-bottom-bar__escape${
            isPulsing ? ' dead-draw-bottom-bar__escape--pulse' : ''
          }${fontTier > 0 ? ` dead-draw-bottom-bar__escape--tier-${fontTier}` : ''}`}
          onClick={onCashOut}
          disabled={!canCashOut}
        >
          {canCashOut
            ? `WALK AWAY \u2014 ${cashOutAmount} APE`
            : 'MAKE YOUR MOVE'}
        </button>
      </div>

      {/* SHOOT button */}
      <div className="dead-draw-bottom-bar__mode-col">
        <span className="dead-draw-bottom-bar__step-label dead-draw-bottom-bar__step-label--shoot">
          {shootResultMult.toFixed(2)}x
        </span>
        <button
          className={`dead-draw-bottom-bar__mode-btn dead-draw-bottom-bar__mode-btn--shoot${
            currentMode === 'shoot' ? ' dead-draw-bottom-bar__mode-btn--active' : ''
          }`}
          onClick={() => onSwitchMode('shoot')}
          disabled={!canToggleMode || currentMode === 'shoot'}
        >
          <img className="dead-draw-bottom-bar__mode-icon--img" src="/submissions/dead-draw/shootmode.png" alt="Shoot" draggable={false} />
        </button>
      </div>
    </div>
  );
};

export default DeadDrawBottomBar;
