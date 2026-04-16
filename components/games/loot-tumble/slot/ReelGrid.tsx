'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Howl } from 'howler';
import { Grid, Cluster, SlotState, FallenCellInfo, GridCell } from '@/components/games/loot-tumble/types';
import { SymbolTile } from './SymbolTile';
import { isCellInCluster } from '@/components/games/loot-tumble/engine/ClusterDetector';
import { SYMBOLS } from '@/components/games/loot-tumble/config/symbols';

interface Props {
  grid: Grid;
  activeClusters: Cluster[];
  state: SlotState;
  cascadeNewCellKeys?: string[];
  cascadeFallenCells?: FallenCellInfo[];
  bonusActive?: boolean;
  bonusEffectMode?: 'none' | 'transition' | 'full';
  onSymbolClick?: (symbolId: string) => void;
}

const BASE_SYMBOL_IDS = SYMBOLS.filter(symbol => symbol.kind !== 'multiplier').map(symbol => symbol.id);
const BONUS_SYMBOL_IDS = SYMBOLS.map(symbol => symbol.id);

function randomSymbolId(bonusActive: boolean): string {
  const symbolIds = bonusActive ? BONUS_SYMBOL_IDS : BASE_SYMBOL_IDS;
  return symbolIds[Math.floor(Math.random() * symbolIds.length)];
}

function randomSymbolIds(count: number, bonusActive: boolean): string[] {
  return Array.from({ length: count }, () => randomSymbolId(bonusActive));
}

interface SpinningColumnProps {
  rows: number;
  colIndex: number;
  bonusActive: boolean;
  bonusEffectMode: 'none' | 'transition' | 'full';
  finalCells: GridCell[] | null;
  onSymbolClick?: (symbolId: string) => void;
}

function SpinningColumn({ rows, colIndex, bonusActive, bonusEffectMode, finalCells, onSymbolClick }: SpinningColumnProps) {
  const [spinSymbols] = useState(() => {
    const page = randomSymbolIds(rows, bonusActive);
    return [...page, ...page];
  });

  const hasLanded = finalCells !== null;

  if (hasLanded) {
    return (
      <div className="flex-1 overflow-hidden relative" style={{ minWidth: 0 }}>
        <div
          className="flex flex-col w-full h-full"
          style={{
            animation: 'reelLandCol 0.6s cubic-bezier(0.22, 1.4, 0.36, 1) both',
          }}
        >
          {finalCells.map((cell, index) => (
            <div
              key={`land-${colIndex}-${index}`}
              className="w-full shrink-0"
              style={{ height: `${100 / rows}%` }}
            >
              <SymbolTile
                symbolId={cell.symbolId}
                isHighlighted={false}
                isRemoving={false}
                isLanded={true}
                isSpinning={false}
                bonusActive={bonusActive}
                bonusEffectMode={bonusEffectMode}
                multiplierValue={cell.multiplierValue}
                onClick={onSymbolClick}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden relative" style={{ minWidth: 0 }}>
      <div
        className="flex flex-col"
        style={{
          animation: 'reelSpin 0.12s linear infinite',
          animationDelay: `${colIndex * 0.02}s`,
          willChange: 'transform',
        }}
      >
        {spinSymbols.map((symbolId, index) => (
          <div
            key={index}
            className="w-full shrink-0"
            style={{ height: `${100 / rows}%` }}
          >
            <SymbolTile
              symbolId={symbolId}
              isHighlighted={false}
              isRemoving={false}
              isSpinning={true}
              bonusActive={bonusActive}
              bonusEffectMode={bonusEffectMode}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReelGrid({
  grid,
  activeClusters,
  state,
  cascadeNewCellKeys = [],
  cascadeFallenCells = [],
  bonusActive = false,
  bonusEffectMode = 'full',
  onSymbolClick,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rows = grid.length || 7;
  const cols = grid[0]?.length || 6;
  const isSpinPhase = state === 'SPINNING' || state === 'LANDING';

  const [stoppedColumns, setStoppedColumns] = useState<boolean[]>([]);
  const landingTriggered = useRef(false);
  const spinSoundRef = useRef<Howl | null>(null);

  useEffect(() => {
    if (state === 'LANDING' && !landingTriggered.current) {
      landingTriggered.current = true;
      const staggerMs = 200;

      for (let col = 0; col < cols; col++) {
        setTimeout(() => {
          setStoppedColumns(prev => {
            const next = [...prev];
            next[col] = true;
            return next;
          });
          new Howl({ src: ['/submissions/loot-tumble/slots settle.mp3'] }).play();

          if (col === cols - 1 && spinSoundRef.current) {
            spinSoundRef.current.stop();
            spinSoundRef.current = null;
          }
        }, col * staggerMs);
      }
    }
  }, [state, cols]);

  useEffect(() => {
    if (state === 'SPINNING') {
      landingTriggered.current = false;
      setStoppedColumns([]);

      if (!spinSoundRef.current) {
        spinSoundRef.current = new Howl({
          src: ['/submissions/loot-tumble/slots start.mp3'],
          loop: true,
        });
        spinSoundRef.current.play();
      }
    }

    return () => {
      if (spinSoundRef.current) {
        spinSoundRef.current.stop();
      }
    };
  }, [state]);

  const newCellSet = useMemo(() => new Set(cascadeNewCellKeys), [cascadeNewCellKeys]);

  const fallenCellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const fallenCell of cascadeFallenCells) {
      map.set(fallenCell.key, fallenCell.rowsDropped);
    }
    return map;
  }, [cascadeFallenCells]);

  const gridColumns = useMemo(() => {
    if (grid.length === 0) return [];
    const colsData: Grid[number][] = [];

    for (let col = 0; col < cols; col++) {
      const colCells = [];
      for (let row = 0; row < rows; row++) {
        colCells.push(grid[row][col]);
      }
      colsData.push(colCells);
    }

    return colsData;
  }, [grid, cols, rows]);

  if (!mounted || grid.length === 0) {
    return <div className="w-full h-full" />;
  }

  return (
    <>
      <style jsx global>{`
        @keyframes reelSpin {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes reelLandCol {
          0% { transform: translateY(-115%); opacity: 0.5; }
          50% { transform: translateY(5%); opacity: 1; }
          70% { transform: translateY(-3%); }
          85% { transform: translateY(1.5%); }
          100% { transform: translateY(0%); }
        }
      `}</style>

      <div className="w-full h-full overflow-hidden">
        <div className="flex w-full h-full">
          {isSpinPhase ? (
            Array.from({ length: cols }).map((_, colIndex) => (
              <SpinningColumn
                key={`reel-${colIndex}`}
                rows={rows}
                colIndex={colIndex}
                bonusActive={bonusActive}
                bonusEffectMode={bonusEffectMode}
                finalCells={stoppedColumns[colIndex] ? gridColumns[colIndex] : null}
                onSymbolClick={stoppedColumns[colIndex] ? onSymbolClick : undefined}
              />
            ))
          ) : (
            gridColumns.map((colCells, colIndex) => (
              <div
                key={`col-${colIndex}`}
                className="flex-1 flex flex-col gap-1 overflow-hidden"
                style={{ minWidth: 0 }}
              >
                {colCells.map(cell => {
                  const isInCluster = isCellInCluster(activeClusters, cell.row, cell.col);
                  const isNewCell = newCellSet.has(cell.key);
                  const rowsDropped = fallenCellMap.get(cell.key);
                  const isFallenCell = rowsDropped !== undefined && rowsDropped > 0;

                  let cellInitial: false | { y: number; opacity?: number } = false;
                  let cellAnimate: { y: number; opacity: number } = { y: 0, opacity: 1 };
                  let cellTransition:
                    | { duration: number }
                    | {
                        type: 'spring';
                        stiffness: number;
                        damping: number;
                      mass: number;
                      delay?: number;
                      } = { duration: 0 };

                  if (isNewCell) {
                    cellInitial = { y: -200, opacity: 0 };
                    cellAnimate = { y: 0, opacity: 1 };
                    cellTransition = {
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                      mass: 1,
                      delay: cell.col * 0.05,
                    };
                  } else if (isFallenCell) {
                    const dropDistance = (rowsDropped ?? 1) * 90;
                    cellInitial = { y: -dropDistance };
                    cellAnimate = { y: 0, opacity: 1 };
                    cellTransition = {
                      type: 'spring',
                      stiffness: 400,
                      damping: 24,
                      mass: 0.8,
                    };
                  }

                  return (
                    <motion.div
                      key={cell.key}
                      initial={cellInitial}
                      animate={cellAnimate}
                      transition={cellTransition}
                      className="relative w-full flex-1 min-h-0"
                    >
                      <SymbolTile
                        symbolId={cell.symbolId}
                        isHighlighted={isInCluster}
                        isRemoving={isInCluster && state === 'CASCADING'}
                        isLanded={isNewCell || isFallenCell}
                        isSpinning={false}
                        bonusActive={bonusActive}
                        bonusEffectMode={bonusEffectMode}
                        multiplierValue={cell.multiplierValue}
                        onClick={onSymbolClick}
                      />
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
