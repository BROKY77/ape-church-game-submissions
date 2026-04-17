'use client';

import React, { useCallback, useRef, useState } from 'react';

interface DeadDrawRevolverProps {
  active: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Rough revolver visual that appears at the bottom of the game area
 * when shoot mode is active. Barrel tracks cursor position on the grid.
 */
const DeadDrawRevolver: React.FC<DeadDrawRevolverProps> = ({ active, gridRef }) => {
  const [rotation, setRotation] = useState(0);
  const revolverRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!revolverRef.current || !active) return;

    const rect = revolverRef.current.getBoundingClientRect();
    const revolverX = rect.left + rect.width / 2;
    const revolverY = rect.top;

    const dx = e.clientX - revolverX;
    const dy = e.clientY - revolverY;
    // Angle from revolver to cursor, 0 = straight up
    const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    // Clamp to reasonable range
    const clamped = Math.max(-45, Math.min(45, angle));
    setRotation(clamped);
  }, [active]);

  // Attach mousemove to grid
  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !active) return;

    grid.addEventListener('mousemove', handleMouseMove);
    return () => grid.removeEventListener('mousemove', handleMouseMove);
  }, [gridRef, active, handleMouseMove]);

  return (
    <div
      ref={revolverRef}
      className={`dead-draw-revolver${active ? '' : ' dead-draw-revolver--hidden'}`}
      style={{
        transform: `translateX(-50%) rotate(${active ? rotation : 0}deg)`,
      }}
      aria-hidden="true"
    >
      {'\uD83D\uDD2B'}
    </div>
  );
};

export default DeadDrawRevolver;
