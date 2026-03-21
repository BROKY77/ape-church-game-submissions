/**
 * Maps symbol IDs to their PNG image paths in /public/submissions/loot-tumble/.
 * These replace the old inline SVG components.
 */
export const SYMBOL_IMAGES: Record<string, string> = {
  gem: '/submissions/loot-tumble/gem.png',
  shield: '/submissions/loot-tumble/shield.png',
  compass: '/submissions/loot-tumble/key.png',       // "compass" slot → uses the key icon
  map: '/submissions/loot-tumble/map.png',
  bird: '/submissions/loot-tumble/bird.png',
  potion: '/submissions/loot-tumble/potion.png',
  coin: '/submissions/loot-tumble/coin.png',
  leaf: '/submissions/loot-tumble/leaf.png',
  scatter: '/submissions/loot-tumble/Scatter Symbol.png',
  multiplier: '/submissions/loot-tumble/Multiplier Symbol Bonus.png',
};

