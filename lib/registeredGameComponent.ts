import type { ComponentType } from 'react'

/**
 * Registry values are real React components with different prop shapes.
 * Using a single concrete props type would reject games that require props (e.g. DeadDraw).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous game map
export type RegisteredGameComponent = ComponentType<any>
