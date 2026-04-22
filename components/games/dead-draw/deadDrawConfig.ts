import { Game } from '@/lib/games';

export const deadDrawGame: Game = {
  title: 'Dead Draw',
  description: 'Western-themed grid-reveal game. Shoot cards to reveal loot, avoid The Sheriff.',
  gameAddress: '0x0000000000000000000000000000000000000000',
  gameBackground: '/submissions/dead-draw/bg.png',
  card: '/submissions/dead-draw/card.png',
  banner: '/submissions/dead-draw/banner.png',
  themeColorBackground: '#DAA520',
  // Payouts are calculated by the engine, not from this map.
  // Stub structure required by the Game type.
  payouts: {
    0: { 0: { 0: 0 } },
  },
};
