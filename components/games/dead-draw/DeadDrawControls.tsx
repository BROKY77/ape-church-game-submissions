'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { GameState } from './engine/types';

interface DeadDrawControlsProps {
  gameState: GameState;
  betAmount: number;
  onCashOut: () => void;
}

/** Legacy controls component — replaced by DeadDrawBottomBar */
const DeadDrawControls: React.FC<DeadDrawControlsProps> = ({
  gameState,
  betAmount,
  onCashOut,
}) => {
  const { currentView, board, shotsTaken, currentMultiplier } = gameState;

  if (currentView !== 1 || !board) return null;

  const canCashOut = shotsTaken > 0;
  const cashOutAmount = (betAmount * currentMultiplier).toFixed(2);

  return (
    <div className="dead-draw-controls flex flex-col gap-2 w-full">
      <Button
        onClick={onCashOut}
        disabled={!canCashOut}
        className="dead-draw-controls__escape w-full text-base font-bold"
        style={{
          backgroundColor: canCashOut ? '#2E7D32' : '#1a1a1a',
          borderColor: canCashOut ? '#2E7D32' : '#333',
        }}
      >
        {canCashOut
          ? `ESCAPE (${cashOutAmount} APE)`
          : 'SHOOT TO BEGIN'}
      </Button>
    </div>
  );
};

export default DeadDrawControls;
