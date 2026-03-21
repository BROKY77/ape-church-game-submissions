import { BonusMode, GridCell, SymbolDef } from '@/components/games/loot-tumble/types';
import { GAME_CONFIG } from '@/components/games/loot-tumble/config/game-config';
import { SYMBOLS } from '@/components/games/loot-tumble/config/symbols';

function getSymbolWeight(symbol: SymbolDef, mode: BonusMode): number {
  return mode === 'BONUS' ? (symbol.bonusWeight ?? symbol.weight) : symbol.weight;
}

function pickWeightedIndex(weights: number[]): number {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let index = 0; index < weights.length; index++) {
    random -= weights[index];
    if (random <= 0) {
      return index;
    }
  }

  return weights.length - 1;
}

/**
 * Generate a weighted symbol definition for the requested game mode.
 */
export function generateWeightedSymbol(mode: BonusMode = 'BASE'): SymbolDef {
  const weights = SYMBOLS.map(symbol => getSymbolWeight(symbol, mode));
  return SYMBOLS[pickWeightedIndex(weights)];
}

/**
 * Bonus multipliers are sampled separately from the symbol choice so the same
 * icon can display any supported multiplier value.
 */
export function generateMultiplierValue(): number {
  const { multiplierValues, multiplierWeights } = GAME_CONFIG.bonus;
  return multiplierValues[pickWeightedIndex(multiplierWeights)];
}

export function createRandomCell(
  row: number,
  col: number,
  key: string,
  mode: BonusMode = 'BASE',
): GridCell {
  const symbol = generateWeightedSymbol(mode);

  return {
    symbolId: symbol.id,
    row,
    col,
    key,
    multiplierValue: symbol.kind === 'multiplier' ? generateMultiplierValue() : undefined,
  };
}

/**
 * Generate multiple symbol IDs. Kept for compatibility with older helpers.
 */
export function generateSymbols(count: number, mode: BonusMode = 'BASE'): string[] {
  return Array.from({ length: count }, () => generateWeightedSymbol(mode).id);
}

