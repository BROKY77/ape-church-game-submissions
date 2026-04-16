import { SymbolDef } from '@/components/games/loot-tumble/types';

export const SYMBOLS: SymbolDef[] = [
  { id: 'gem', name: 'Gem', color: '#8b5cf6', weight: 5, bonusWeight: 4, tier: 1, kind: 'regular' },
  { id: 'shield', name: 'Shield', color: '#f59e0b', weight: 8, bonusWeight: 7, tier: 2, kind: 'regular' },
  { id: 'compass', name: 'Compass', color: '#06b6d4', weight: 10, bonusWeight: 9, tier: 3, kind: 'regular' },
  { id: 'map', name: 'Map', color: '#d97706', weight: 12, bonusWeight: 11, tier: 4, kind: 'regular' },
  { id: 'bird', name: 'Bird', color: '#ec4899', weight: 15, bonusWeight: 14, tier: 5, kind: 'regular' },
  { id: 'potion', name: 'Potion', color: '#22c55e', weight: 18, bonusWeight: 17, tier: 6, kind: 'regular' },
  { id: 'coin', name: 'Coin', color: '#eab308', weight: 20, bonusWeight: 19, tier: 7, kind: 'regular' },
  { id: 'leaf', name: 'Leaf', color: '#16a34a', weight: 22, bonusWeight: 21, tier: 8, kind: 'regular' },
  { id: 'scatter', name: 'Scatter', color: '#facc15', weight: 10, bonusWeight: 8, kind: 'scatter' },
  { id: 'multiplier', name: 'Multiplier', color: '#67e8f9', weight: 0, bonusWeight: 2, kind: 'multiplier' },
];

export const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map(s => [s.id, s]));
