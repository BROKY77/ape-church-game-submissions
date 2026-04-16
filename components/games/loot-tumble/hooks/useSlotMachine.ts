'use client';

import { useState, useCallback, useRef } from 'react';
import { GameState, Grid, FallenCellInfo, BonusMode, SpinResult } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { createGrid } from '@/components/games/loot-tumble/engine/Grid';
import { resolveSpin } from '@/components/games/loot-tumble/engine/SpinResolver';

const initialState: GameState = {
  state: 'IDLE',
  mode: 'BASE',
  grid: [],
  balance: GAME_CONFIG.startingBalance,
  betAmount: GAME_CONFIG.defaultBet,
  spinBetAmount: GAME_CONFIG.defaultBet,
  currentWin: 0,
  totalWin: 0,
  totalWinBeforeMultiplier: 0,
  cascadeDepth: 0,
  activeClusters: [],
  cascadeNewCellKeys: [],
  cascadeFallenCells: [],
  scatterCount: 0,
  awardedFreeSpins: 0,
  bonusSpinsRemaining: 0,
  spinMultiplierTotal: 0,
  lastSpinFailed: false,
};

function delay(ms: number, multiplier: number = 1): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms * multiplier));
}

function cloneGameStateSnapshot(state: GameState): GameState {
  return {
    ...state,
    grid: state.grid.map(row => row.map(cell => ({ ...cell }))),
    activeClusters: state.activeClusters.map(cluster => ({
      ...cluster,
      cells: cluster.cells.map(cell => ({ ...cell })),
    })),
    cascadeNewCellKeys: [...state.cascadeNewCellKeys],
    cascadeFallenCells: state.cascadeFallenCells.map(cell => ({ ...cell })),
  };
}

function cloneSpinResult(result: SpinResult): SpinResult {
  return {
    ...result,
    grid: result.grid.map(row => row.map(cell => ({ ...cell }))),
    finalGrid: result.finalGrid.map(row => row.map(cell => ({ ...cell }))),
    clusters: result.clusters.map(cluster => ({
      ...cluster,
      cells: cluster.cells.map(cell => ({ ...cell })),
    })),
    cascades: result.cascades.map(cascade => ({
      ...cascade,
      removedCells: cascade.removedCells.map(cell => ({ ...cell })),
      fallenCells: cascade.fallenCells.map(cell => ({
        ...cell,
        from: { ...cell.from },
        to: { ...cell.to },
      })),
      newCells: cascade.newCells.map(cell => ({ ...cell })),
      newClusters: cascade.newClusters.map(cluster => ({
        ...cluster,
        cells: cluster.cells.map(cell => ({ ...cell })),
      })),
    })),
  };
}

export interface RecordedSpin {
  spinMode: BonusMode;
  spinBetAmount: number;
  result: SpinResult;
}

interface UseSlotMachineOptions {
  onSpinResolved?: (spin: RecordedSpin) => void;
}

interface ExecuteSpinOptions {
  spinModeOverride?: BonusMode;
  spinBetOverride?: number;
  resolvedResult?: SpinResult;
  applyBalanceChanges?: boolean;
}

export function useSlotMachine(speedMultiplier: number = 1, options: UseSlotMachineOptions = {}) {
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...initialState,
    grid: createGrid(undefined, undefined, 'BASE'),
  }));

  const animatingRef = useRef(false);
  const gameStateRef = useRef<GameState>({
    ...initialState,
    grid: createGrid(undefined, undefined, 'BASE'),
  });
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const onSpinResolved = options.onSpinResolved;

  const syncGameState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      const next = updater(prev);
      gameStateRef.current = next;
      return next;
    });
  }, []);

  const setBet = useCallback((amount: number) => {
    syncGameState(prev => {
      if (prev.state !== 'IDLE' || prev.mode !== 'BASE') return prev;
      return { ...prev, betAmount: amount };
    });
  }, [syncGameState]);

  const setSpinBetAmount = useCallback((amount: number) => {
    const clampedAmount = Math.max(0, amount);
    syncGameState(prev => ({ ...prev, spinBetAmount: clampedAmount }));
  }, [syncGameState]);

  const executeSpin = useCallback(async (executeOptions: ExecuteSpinOptions = {}) => {
    const snapshot = cloneGameStateSnapshot(gameStateRef.current);
    const spinMode = executeOptions.spinModeOverride ?? snapshot.mode;
    const currentSpinBet = executeOptions.spinBetOverride ?? snapshot.spinBetAmount;
    const applyBalanceChanges = executeOptions.applyBalanceChanges ?? true;

    if (animatingRef.current || snapshot.state !== 'IDLE') {
      return;
    }

    const startingBonusSpins = snapshot.bonusSpinsRemaining;

    if (applyBalanceChanges && spinMode === 'BASE' && snapshot.balance < currentSpinBet) {
      return;
    }

    if (spinMode === 'BONUS' && snapshot.bonusSpinsRemaining <= 0) {
      syncGameState(prev => ({ ...prev, mode: 'BASE' }));
      return;
    }

    animatingRef.current = true;

    syncGameState(prev => ({
      ...prev,
      state: 'SPINNING',
      balance: applyBalanceChanges && spinMode === 'BASE' ? prev.balance - currentSpinBet : prev.balance,
      currentWin: 0,
      totalWin: 0,
      totalWinBeforeMultiplier: 0,
      cascadeDepth: 0,
      activeClusters: [],
      cascadeNewCellKeys: [],
      cascadeFallenCells: [],
      scatterCount: 0,
      awardedFreeSpins: 0,
      spinMultiplierTotal: 0,
      lastSpinFailed: false,
    }));

    try {
      const resultPromise =
        executeOptions.resolvedResult != null
          ? Promise.resolve(cloneSpinResult(executeOptions.resolvedResult))
          : resolveSpin(currentSpinBet, spinMode);
      const [result] = await Promise.all([
        resultPromise,
        delay(GAME_CONFIG.animation.spinDuration, speedRef.current),
      ]);
      const { animation } = GAME_CONFIG;

      if (executeOptions.resolvedResult == null) {
        onSpinResolved?.({
          spinMode,
          spinBetAmount: currentSpinBet,
          result: cloneSpinResult(result),
        });
      }

      syncGameState(prev => ({
        ...prev,
        state: 'LANDING',
        grid: result.grid,
        activeClusters: [],
        cascadeNewCellKeys: [],
        cascadeFallenCells: [],
      }));

      const speed = speedRef.current;
      await delay(200 * (GAME_CONFIG.gridCols - 1) + 700, speed);

      if (result.clusters.length === 0 && result.cascades.length === 0) {
        const awardedFreeSpins = result.awardedFreeSpins;
        const nextBonusSpins =
          spinMode === 'BONUS'
            ? Math.max(startingBonusSpins - 1, 0) + awardedFreeSpins
            : awardedFreeSpins;
        const nextMode = nextBonusSpins > 0 ? 'BONUS' : 'BASE';

        if (awardedFreeSpins > 0) {
          syncGameState(prev => ({
            ...prev,
            state: 'WIN_DISPLAY',
            mode: nextMode,
            totalWin: 0,
            totalWinBeforeMultiplier: 0,
            scatterCount: result.scatterCount,
            awardedFreeSpins,
            bonusSpinsRemaining: nextBonusSpins,
            spinMultiplierTotal: result.multiplierTotal,
            lastSpinFailed: false,
          }));

          await delay(animation.winDisplay * 0.5, speed);
        }

        syncGameState(prev => ({
          ...prev,
          state: 'IDLE',
          mode: nextMode,
          totalWin: 0,
          totalWinBeforeMultiplier: 0,
          scatterCount: result.scatterCount,
          awardedFreeSpins,
          bonusSpinsRemaining: nextBonusSpins,
          spinMultiplierTotal: result.multiplierTotal,
          lastSpinFailed: false,
        }));
        return;
      }

      syncGameState(prev => ({
        ...prev,
        state: 'RESOLVING',
        activeClusters: result.clusters,
      }));

      await delay(animation.clusterHighlight, speed);

      let currentGrid: Grid = result.grid;
      let cumulativeWin = 0;

      for (let i = 0; i < result.cascades.length; i++) {
        const cascade = result.cascades[i];
        cumulativeWin += cascade.stepWin;

        syncGameState(prev => ({
          ...prev,
          state: 'CASCADING',
          cascadeDepth: i + 1,
          currentWin: cumulativeWin,
        }));

        await delay(animation.symbolRemove, speed);

        const newGrid = applyCascadeToGrid(currentGrid, cascade);
        currentGrid = newGrid;

        const newCellKeys = cascade.newCells.map(c => c.key);
        const fallenCells: FallenCellInfo[] = cascade.fallenCells.map(f => ({
          key: currentGrid[f.to.row]?.[f.to.col]?.key ?? '',
          rowsDropped: f.to.row - f.from.row,
        }));

        syncGameState(prev => ({
          ...prev,
          grid: newGrid,
          activeClusters: [],
          cascadeNewCellKeys: newCellKeys,
          cascadeFallenCells: fallenCells,
        }));

        await delay(animation.gravityFall + animation.newSymbolDrop, speed);

        if (animation.cascadePause > 0) {
          await delay(animation.cascadePause, speed);
        }

        if (cascade.newClusters.length > 0) {
          syncGameState(prev => ({
            ...prev,
            state: 'RESOLVING',
            activeClusters: cascade.newClusters,
          }));

          await delay(animation.clusterHighlight, speed);
        }
      }

      const awardedFreeSpins = result.awardedFreeSpins;
      const nextBonusSpins =
        spinMode === 'BONUS'
          ? Math.max(startingBonusSpins - 1, 0) + awardedFreeSpins
          : awardedFreeSpins;
      const nextMode = nextBonusSpins > 0 ? 'BONUS' : 'BASE';

      if (result.totalWin > 0 || awardedFreeSpins > 0) {
        syncGameState(prev => ({
          ...prev,
          state: 'WIN_DISPLAY',
          mode: nextMode,
          totalWin: result.totalWin,
          totalWinBeforeMultiplier: result.totalWinBeforeMultiplier,
          balance: applyBalanceChanges ? prev.balance + result.totalWin : prev.balance,
          activeClusters: [],
          cascadeNewCellKeys: [],
          cascadeFallenCells: [],
          scatterCount: result.scatterCount,
          awardedFreeSpins,
          bonusSpinsRemaining: nextBonusSpins,
          spinMultiplierTotal: result.multiplierTotal,
          lastSpinFailed: false,
        }));

        await delay(animation.winDisplay, speed);
      }

      syncGameState(prev => ({
        ...prev,
        state: 'IDLE',
        mode: nextMode,
        activeClusters: [],
        cascadeNewCellKeys: [],
        cascadeFallenCells: [],
        scatterCount: result.scatterCount,
        awardedFreeSpins,
        bonusSpinsRemaining: nextBonusSpins,
        spinMultiplierTotal: result.multiplierTotal,
        lastSpinFailed: false,
      }));
    } catch (error) {
      console.error('[SlotMachine] Spin error:', error);
      syncGameState(() => ({
        ...snapshot,
        lastSpinFailed: true,
      }));
    } finally {
      animatingRef.current = false;
    }
  }, [onSpinResolved, syncGameState]);

  const spin = useCallback(async () => {
    await executeSpin();
  }, [executeSpin]);

  const replaySpin = useCallback(async (recordedSpin: RecordedSpin) => {
    await executeSpin({
      spinModeOverride: recordedSpin.spinMode,
      spinBetOverride: recordedSpin.spinBetAmount,
      resolvedResult: recordedSpin.result,
      applyBalanceChanges: false,
    });
  }, [executeSpin]);

  return {
    gameState,
    spin,
    replaySpin,
    setBet,
    setSpinBetAmount,
    isSpinning: gameState.state !== 'IDLE',
    playGame: spin,
    handleStateAdvance: spin,
    handleReset: useCallback(() => {
      syncGameState(prev => ({
        ...initialState,
        betAmount: prev.betAmount,
        spinBetAmount: prev.spinBetAmount,
        balance: prev.balance,
        grid: createGrid(undefined, undefined, 'BASE'),
      }));
      animatingRef.current = false;
    }, [syncGameState]),
    handlePlayAgain: spin,
    handleRewatch: useCallback(() => { }, []),
  };
}

/**
 * Apply a cascade step to the current grid:
 * 1. Start from a copy of the current grid (preserving static cells)
 * 2. Clear removed cells + vacated positions
 * 3. Place fallen cells at their new positions
 * 4. Insert new cells at top
 */
function applyCascadeToGrid(
  grid: Grid,
  cascade: {
    removedCells: { row: number; col: number }[];
    fallenCells: { from: { row: number; col: number }; to: { row: number; col: number }; symbolId: string }[];
    newCells: { symbolId: string; row: number; col: number; key: string; multiplierValue?: number }[];
  }
): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid: Grid = grid.map(row => row.map(cell => ({ ...cell })));

  const removedSet = new Set(cascade.removedCells.map(c => `${c.row},${c.col}`));
  const movedFromSet = new Set(cascade.fallenCells.map(f => `${f.from.row},${f.from.col}`));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      if (removedSet.has(key) || movedFromSet.has(key)) {
        newGrid[r][c] = { symbolId: '', row: r, col: c, key: `empty-${r}-${c}` };
      }
    }
  }

  for (const fallen of cascade.fallenCells) {
    const originalCell = grid[fallen.from.row]?.[fallen.from.col];
    if (originalCell) {
      newGrid[fallen.to.row][fallen.to.col] = {
        ...originalCell,
        row: fallen.to.row,
        col: fallen.to.col,
      };
    }
  }

  for (const cell of cascade.newCells) {
    newGrid[cell.row][cell.col] = {
      symbolId: cell.symbolId,
      row: cell.row,
      col: cell.col,
      key: cell.key,
      multiplierValue: cell.multiplierValue,
    };
  }

  return newGrid;
}
