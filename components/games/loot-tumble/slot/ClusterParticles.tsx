'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cluster, SlotState } from '@/components/games/loot-tumble/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ParticleData {
  id: string;
  /** CSS left % */
  x: number;
  /** CSS top % */
  y: number;
  /** Pixel offset – random outward drift */
  dx: number;
  dy: number;
  /** Stagger delay in seconds */
  delay: number;
  /** Diameter in pixels */
  size: number;
}

interface Props {
  clusters: Cluster[];
  state: SlotState;
  rows: number;
  cols: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Lightweight DOM-based sparkle overlay.
 *
 * Absolutely-positioned over the grid (use `position: relative` on the
 * parent wrapper). Spawns 3-4 small amber/gold particles per cluster
 * cell while state === 'RESOLVING'.
 */
export function ClusterParticles({ clusters, state, rows, cols }: Props) {
  const [particles, setParticles] = useState<ParticleData[]>([]);

  const isResolving = state === 'RESOLVING';

  useEffect(() => {
    if (!isResolving || clusters.length === 0) {
      setParticles([]);
      return;
    }

    const next: ParticleData[] = [];
    let id = 0;

    for (const cluster of clusters) {
      for (const cell of cluster.cells) {
        // Centre of the cell as a percentage of the grid area
        const cx = ((cell.col + 0.5) / cols) * 100;
        const cy = ((cell.row + 0.5) / rows) * 100;

        // 15-20 sparkles per cell for massive visual punch
        const count = 15 + Math.floor(Math.random() * 6);

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const velocity = 20 + Math.random() * 80;
          next.push({
            id: `sp-${id++}`,
            // Jitter heavily around the cell centre
            x: cx + (Math.random() - 0.5) * (100 / cols) * 1.5,
            y: cy + (Math.random() - 0.5) * (100 / rows) * 1.5,
            // Explosive outward drift in all directions
            dx: Math.cos(angle) * velocity,
            dy: Math.sin(angle) * velocity - 20, // overall slight upward bias (gravity)
            delay: Math.random() * 0.1, // Near instant explosion
            size: 8 + Math.random() * 12, // Larger particles
          });
        }
      }
    }

    setParticles(next);
  }, [isResolving, clusters, rows, cols]);

  return (
    <div className="absolute inset-[-20%] overflow-visible pointer-events-none z-30">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background:
                'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,215,0,0.95) 30%, rgba(255,140,0,0.8) 70%, rgba(255,69,0,0) 100%)',
              boxShadow: '0 0 20px 8px rgba(255,165,0,0.8), 0 0 10px 4px rgba(255,255,255,0.9)',
            }}
            initial={{ scale: 0, opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{
              scale: [0, 2.5, 1, 0],
              opacity: [1, 1, 0.8, 0],
              x: p.dx,
              y: p.dy,
              rotate: [0, Math.random() * 360],
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              delay: p.delay,
              ease: [0.1, 0.9, 0.2, 1], // explosive ease out
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
