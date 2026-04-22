'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Game } from '@/lib/games';
import BetAmountInput from '@/components/shared/BetAmountInput';
import { GameState, TOTAL_POSITIONS, SHERIFFS_PER_LAYER } from './engine/types';
import { generatePayoutTable, generateShootPayoutTable, getFullClearMultiplierBps, bpsToDisplay } from './engine/multiplier';
import { RevealSpeed } from './DeadDrawCard';

interface DeadDrawSetupCardProps {
  game: Game;
  onPlay: () => void;
  onReset: () => void;
  onPlayAgain: () => void;
  onRewatch: () => void;
  currentView: 0 | 1 | 2;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  selectedDepth: number;
  setSelectedDepth: (depth: number) => void;
  isLoading: boolean;
  payout: number | null;
  gameState: GameState;
  onCashOut: () => void;
  inReplayMode: boolean;
  walletBalance: number;
  revealSpeed: RevealSpeed;
  setRevealSpeed: (speed: RevealSpeed) => void;
}

const DEPTH_LABELS: Record<number, string> = {
  1: '1 Layer',
  2: '2 Layers',
  3: '3 Layers',
};

const DeadDrawSetupCard: React.FC<DeadDrawSetupCardProps> = ({
  game,
  onPlay,
  onReset,
  onPlayAgain,
  onRewatch,
  currentView,
  betAmount,
  setBetAmount,
  selectedDepth,
  setSelectedDepth,
  isLoading,
  payout,
  gameState,
  onCashOut,
  inReplayMode,
  walletBalance,
  revealSpeed,
  setRevealSpeed,
}) => {
  const themeColor = game.themeColorBackground;
  const sheriffCount = selectedDepth * SHERIFFS_PER_LAYER;
  // Expected max safe shots assuming typical sheriff distribution (each in its own position)
  const expectedMaxShots = TOTAL_POSITIONS - sheriffCount;
  const fullPayoutTable = generatePayoutTable(selectedDepth);
  const payoutTable = fullPayoutTable.slice(0, expectedMaxShots);
  const shootPayoutTable = generateShootPayoutTable(selectedDepth);
  const fullClearMultiplier = bpsToDisplay(getFullClearMultiplierBps(selectedDepth));

  const formatAmount = (amount: number): string => {
    return `${amount.toLocaleString([], {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} APE`;
  };

  return (
    <Card className="lg:basis-1/3 flex flex-col p-6">
      {/* ====== SETUP VIEW ====== */}
      {currentView === 0 && (
        <>
          <CardContent className="font-roboto">
            {/* Place bet button — mobile */}
            <Button
              onClick={onPlay}
              className="lg:hidden w-full"
              style={{ backgroundColor: themeColor, borderColor: themeColor }}
              disabled={betAmount <= 0}
            >
              Place Your Bet
            </Button>

            {/* Bet amount */}
            <div className="mt-5">
              <BetAmountInput
                min={0}
                max={walletBalance}
                step={0.1}
                value={betAmount}
                onChange={setBetAmount}
                balance={walletBalance}
                usdMode={false}
                setUsdMode={() => {}}
                disabled={isLoading}
                themeColorBackground={themeColor}
              />
            </div>

            {/* Depth selector */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground mb-3">Depth</p>
              <div className="flex gap-2">
                {[1, 2, 3].map((d) => (
                  <Button
                    key={d}
                    variant={selectedDepth === d ? 'default' : 'secondary'}
                    className="flex-1"
                    style={
                      selectedDepth === d
                        ? { backgroundColor: themeColor, borderColor: themeColor }
                        : {}
                    }
                    onClick={() => setSelectedDepth(d)}
                  >
                    {DEPTH_LABELS[d]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {sheriffCount} sheriff{sheriffCount > 1 ? 's' : ''} hidden in {TOTAL_POSITIONS} positions
                ({selectedDepth * TOTAL_POSITIONS} total cards)
              </p>
            </div>

          </CardContent>

          <div className="grow" />

          <CardFooter className="mt-8 w-full flex flex-col font-roboto">
            {/* Stats */}
            <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-muted-foreground">
              <div className="w-full flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <p>Full Clear</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info size={14} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Payout for revealing all {expectedMaxShots} safe positions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-right font-mono" style={{ color: themeColor }}>
                  {fullClearMultiplier}x
                </p>
              </div>
              <div className="w-full flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <p>Dead Draw</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info size={14} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Call all {sheriffCount} sheriff position{sheriffCount > 1 ? 's' : ''} correctly for full clear payout</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-right font-mono" style={{ color: themeColor }}>
                  {fullClearMultiplier}x
                </p>
              </div>
              <div className="w-full flex justify-between items-center gap-2">
                <p>Max Shots</p>
                <p className="text-right">{expectedMaxShots}</p>
              </div>
              <div className="w-full flex justify-between items-center gap-2">
                <p>House Edge</p>
                <p className="text-right">0.9%</p>
              </div>
            </div>

            {/* Place bet button — desktop */}
            <Button
              onClick={onPlay}
              className="hidden lg:flex mt-6 w-full"
              style={{ backgroundColor: themeColor, borderColor: themeColor }}
              disabled={betAmount <= 0}
            >
              Place Your Bet
            </Button>
          </CardFooter>
        </>
      )}

      {/* ====== ONGOING VIEW ====== */}
      {currentView === 1 && (
        <CardContent className="grow font-roboto flex flex-col justify-between gap-6">
          {/* Stats */}
          <div className="flex flex-col gap-4">
            {inReplayMode && (
              <p
                className="font-semibold text-2xl text-center"
                style={{ color: themeColor }}
              >
                Replay Mode
              </p>
            )}

            <div className="w-full flex flex-col gap-2 font-medium text-xs text-muted-foreground">
              <div className="w-full flex justify-between items-center">
                <p>Current Multiplier</p>
                <p className="text-right font-mono text-sm" style={{ color: themeColor }}>
                  {gameState.currentMultiplier.toFixed(2)}x
                </p>
              </div>
              <div className="w-full flex justify-between items-center">
                <p>Shots</p>
                <p className="text-right">
                  {gameState.shotsTaken} / {expectedMaxShots}
                </p>
              </div>
              <div className="w-full flex justify-between items-center">
                <p>Bet</p>
                <p className="text-right">{formatAmount(betAmount)}</p>
              </div>
              <div className="w-full flex justify-between items-center">
                <p>Potential Payout</p>
                <p className="text-right font-mono" style={{ color: themeColor }}>
                  {formatAmount(betAmount * gameState.currentMultiplier)}
                </p>
              </div>
              <div className="w-full flex justify-between items-center">
                <p>Mode</p>
                <p className="text-right" style={{ color: gameState.currentMode === 'shoot' ? '#dc143c' : themeColor }}>
                  {gameState.currentMode === 'shoot' ? 'SHOOT' : 'TAKE'}
                </p>
              </div>
              {gameState.eliminatedSheriffs > 0 && (
                <div className="w-full flex justify-between items-center">
                  <p>Sheriffs Eliminated</p>
                  <p className="text-right">{gameState.eliminatedSheriffs} / {gameState.board?.sheriffCount ?? 0}</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls moved to bottom bar in game window */}

          {/* Reveal speed removed — click-to-advance controls pacing */}
        </CardContent>
      )}

      {/* ====== GAME OVER VIEW ====== */}
      {currentView === 2 && (
        <CardContent className="grow font-roboto flex flex-col justify-between gap-6">
          {/* Stats */}
          <div className="w-full flex flex-col gap-2 font-medium text-xs text-muted-foreground">
            <div className="w-full flex justify-between items-center">
              <p>Result</p>
              <p className="text-right font-semibold text-foreground">
                {gameState.outcome === 'escaped' && 'Escaped'}
                {gameState.outcome === 'busted' && 'Busted'}
                {gameState.outcome === 'full_clear' && 'Full Clear!'}
                {gameState.outcome === 'shot_loot' && 'Shot Loot!'}
                {gameState.outcome === 'rampage' && 'Rampage!'}
              </p>
            </div>
            <div className="w-full flex justify-between items-center">
              <p>Multiplier</p>
              <p className="text-right font-mono" style={{ color: themeColor }}>
                {gameState.currentMultiplier.toFixed(2)}x
              </p>
            </div>
            <div className="w-full flex justify-between items-center">
              <p>Bet</p>
              <p className="text-right">{formatAmount(betAmount)}</p>
            </div>
            <div className="w-full flex justify-between items-center">
              <p>Payout</p>
              <p
                className="text-right font-mono"
                style={{
                  color: (payout ?? 0) > betAmount ? '#2E7D32' : undefined,
                }}
              >
                {formatAmount(payout ?? 0)}
              </p>
            </div>
            <div className="w-full flex justify-between items-center">
              <p>Wallet Balance</p>
              <p className="text-right">{formatAmount(walletBalance)}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={onPlayAgain}
              className="w-full"
              style={{ backgroundColor: themeColor, borderColor: themeColor }}
            >
              Play Again
            </Button>
            <Button
              onClick={onRewatch}
              variant="secondary"
              className="w-full"
            >
              Rewatch
            </Button>
            <Button
              onClick={onReset}
              variant="secondary"
              className="w-full"
            >
              Change Bet
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DeadDrawSetupCard;
