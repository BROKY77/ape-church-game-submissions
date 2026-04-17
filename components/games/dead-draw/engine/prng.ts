// ============================================================
// Dead Draw — Seeded PRNG (Mulberry32)
// ============================================================
// Deterministic pseudo-random number generator.
// All randomness in the game flows through this — never Math.random().

/**
 * Mulberry32 seeded PRNG.
 * Returns a function that produces deterministic floats in [0, 1).
 * Each call advances the internal state.
 *
 * @param seed - 32-bit integer seed
 * @returns A function that returns the next pseudo-random float
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0; // ensure 32-bit integer

  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Converts a bigint chain seed into a 32-bit integer suitable for mulberry32.
 * Uses XOR folding to compress arbitrary-length bigints into 32 bits
 * while preserving entropy distribution.
 *
 * @param seed - Chain-provided seed as bigint
 * @returns 32-bit integer seed
 */
export function seedFromBigInt(seed: bigint): number {
  const mask = BigInt(0xffffffff);
  const ZERO = BigInt(0);
  const THIRTY_TWO = BigInt(32);
  let folded = ZERO;
  let remaining = seed < ZERO ? -seed : seed;

  // XOR-fold 32-bit chunks together
  while (remaining > ZERO) {
    folded ^= remaining & mask;
    remaining >>= THIRTY_TWO;
  }

  return Number(folded & mask) | 0;
}
