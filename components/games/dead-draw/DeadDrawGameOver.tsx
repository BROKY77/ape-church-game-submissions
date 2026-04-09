'use client';

import React from 'react';
import { Board, GameOutcome, SHERIFFS_PER_LAYER, TOTAL_POSITIONS } from './engine/types';
import { bpsToDisplay, getFullClearMultiplierBps } from './engine/multiplier';
import { NearMissInfo } from './engine/suspense';

interface DeadDrawGameOverProps {
  outcome: GameOutcome;
  multiplier: number;
  betAmount: number;
  board: Board | null;
  nearMiss: NearMissInfo | null;
  depth: number;
  shotsTaken: number;
  eliminatedSheriffs: number;
  usedShootMode: boolean;
}

const OUTCOME_CONFIG: Record<
  GameOutcome,
  { title: string; className: string }
> = {
  escaped: {
    title: 'GOT AWAY',
    className: 'dead-draw-gameover--escaped',
  },
  busted: {
    title: 'BUSTED',
    className: 'dead-draw-gameover--busted',
  },
  full_clear: {
    title: 'CLEANED OUT',
    className: 'dead-draw-gameover--full-clear',
  },
  shot_loot: {
    title: 'WRONG TARGET',
    className: 'dead-draw-gameover--shot-loot',
  },
  rampage: {
    title: 'RAMPAGE!',
    className: 'dead-draw-gameover--rampage',
  },
};

const DEPTH_TEASE: Record<number, { label: string; text: string }> = {
  1: { label: 'Back Room', text: 'Higher risk. Higher reward.' },
  2: { label: 'The Vault', text: 'Only legends enter the Vault.' },
};

const DeadDrawGameOver: React.FC<DeadDrawGameOverProps> = ({
  outcome,
  multiplier,
  betAmount,
  nearMiss,
  depth,
  shotsTaken,
  eliminatedSheriffs,
  usedShootMode,
}) => {
  const config = OUTCOME_CONFIG[outcome];
  const payoutAmount = (multiplier * betAmount).toFixed(2);
  const isWin = multiplier > 0;
  const isLoss = outcome === 'busted' || outcome === 'shot_loot';
  const isRampage = outcome === 'rampage';
  const fullClearMult = bpsToDisplay(getFullClearMultiplierBps(depth));
  const fullClearAmount = (fullClearMult * betAmount).toFixed(2);
  const nextDepth = depth < 3 ? depth + 1 : null;
  const nextDepthFullClear = nextDepth
    ? bpsToDisplay(getFullClearMultiplierBps(nextDepth))
    : null;

  return (
    <div className={`dead-draw-gameover ${config.className}`}>
      <div className="dead-draw-gameover__content">
        <h2 className="dead-draw-gameover__title">{config.title}</h2>

        {/* --- LOSS: show what they had + what they missed --- */}
        {isLoss && nearMiss && (
          <>
            {nearMiss.hadMultiplier > 1 && (
              <p className="dead-draw-gameover__had-amount">
                You had {nearMiss.hadMultiplier.toFixed(2)}x &mdash; {nearMiss.hadAmount.toFixed(2)} APE
              </p>
            )}
            <div className="dead-draw-gameover__loss">
              <span className="dead-draw-gameover__loss-label">0x</span>
            </div>
            <p className="dead-draw-gameover__full-clear-hint">
              Full clear was worth {fullClearMult.toFixed(1)}x ({fullClearAmount} APE)
            </p>
            {nearMiss.wasOneAway && nearMiss.nextThreshold && (
              <p className="dead-draw-gameover__near-miss">
                One more take would have reached {nearMiss.nextThreshold}x
              </p>
            )}
          </>
        )}

        {/* --- ESCAPED: show what they left behind --- */}
        {outcome === 'escaped' && nearMiss && (
          <>
            <div className="dead-draw-gameover__payout">
              <span className="dead-draw-gameover__payout-label">PAYOUT</span>
              <span className="dead-draw-gameover__payout-amount">
                {payoutAmount} APE
              </span>
              <span className="dead-draw-gameover__payout-multiplier">
                {multiplier.toFixed(2)}x
              </span>
            </div>
            <p className="dead-draw-gameover__full-clear-hint">
              Full clear was {fullClearMult.toFixed(1)}x ({fullClearAmount} APE)
            </p>
            {nearMiss.safeTakesLeft > 0 && (
              <p className="dead-draw-gameover__near-miss">
                {nearMiss.safeTakesLeft} more safe take{nearMiss.safeTakesLeft > 1 ? 's were' : ' was'} on the board
              </p>
            )}
          </>
        )}

        {/* --- WINS (full_clear, dead_draw, rampage) --- */}
        {isWin && outcome !== 'escaped' && (
          <>
            {/* Rampage: chase light badges above title */}
            {isRampage && eliminatedSheriffs > 0 && (
              <div className="dead-draw-gameover__badges">
                {Array.from({ length: eliminatedSheriffs }, (_, i) => {
                  const chaseDuration = eliminatedSheriffs * 150;
                  return (
                    <img
                      key={i}
                      className="dead-draw-gameover__badge"
                      src="/submissions/dead-draw/sherriffformeter.png"
                      alt=""
                      draggable={false}
                      style={{
                        '--dd-chase-duration': `${chaseDuration}ms`,
                        '--dd-chase-delay': `${i * 150}ms`,
                      } as React.CSSProperties}
                    />
                  );
                })}
              </div>
            )}

            <div className="dead-draw-gameover__payout">
              <span className="dead-draw-gameover__payout-label">PAYOUT</span>
              <span className="dead-draw-gameover__payout-amount">
                {payoutAmount} APE
              </span>
              <span className="dead-draw-gameover__payout-multiplier">
                {multiplier.toFixed(2)}x
              </span>
            </div>
            {/* Depth tease after wins — skip on rampage (you just cleared the board) */}
            {nextDepth && DEPTH_TEASE[depth] && !isRampage && (
              <div className="dead-draw-gameover__depth-tease">
                <p>{DEPTH_TEASE[depth].text}</p>
                <p className="dead-draw-gameover__depth-tease-mult">
                  {nextDepthFullClear?.toFixed(0)}x full clear
                </p>
              </div>
            )}
          </>
        )}

        {/* --- Shoot mode stats --- */}
        {usedShootMode && eliminatedSheriffs > 0 && (
          <p className="dead-draw-gameover__shoot-stat">
            {eliminatedSheriffs} sheriff{eliminatedSheriffs > 1 ? 's' : ''} eliminated
          </p>
        )}
      </div>
    </div>
  );
};

export default DeadDrawGameOver;
