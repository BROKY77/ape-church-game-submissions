'use client';

import React, { useEffect, useRef, useState } from 'react';

interface DeadDrawBadgeTrackerProps {
  sheriffCount: number;
  eliminatedSheriffs: number;
  isRampage: boolean;
}

/** Delay before badge appears — lets the card destruction animation start first */
const APPEAR_DELAY_MS = 250;
/** Slam CSS animation duration */
const SLAM_ANIM_MS = 550;

const DeadDrawBadgeTracker: React.FC<DeadDrawBadgeTrackerProps> = ({
  sheriffCount,
  eliminatedSheriffs,
  isRampage,
}) => {
  // displayCount lags behind eliminatedSheriffs by APPEAR_DELAY_MS
  // so the badge mounts (with slam) after the destruction has visually started
  const [displayCount, setDisplayCount] = useState(0);
  const [slamIndex, setSlamIndex] = useState<number | null>(null);
  const prevEliminated = useRef(eliminatedSheriffs);
  const timers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (eliminatedSheriffs > prevEliminated.current) {
      const newIndex = eliminatedSheriffs - 1;

      // Wait for card destruction to start visually, then mount badge with slam
      const t1 = setTimeout(() => {
        setDisplayCount(eliminatedSheriffs);
        setSlamIndex(newIndex);
      }, APPEAR_DELAY_MS);

      // Clear slam class after animation
      const t2 = setTimeout(() => {
        setSlamIndex(null);
      }, APPEAR_DELAY_MS + SLAM_ANIM_MS);

      timers.current.push(t1, t2);
      prevEliminated.current = eliminatedSheriffs;

      return () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
      };
    }
    prevEliminated.current = eliminatedSheriffs;
  }, [eliminatedSheriffs]);

  useEffect(() => {
    if (eliminatedSheriffs === 0) {
      setDisplayCount(0);
      setSlamIndex(null);
      prevEliminated.current = 0;
    }
  }, [eliminatedSheriffs]);

  const slots = [];
  for (let i = 0; i < sheriffCount; i++) {
    const isFilled = i < displayCount;
    const isSlamming = i === slamIndex;

    // Zigzag for depth 2+ (more than 2 badges)
    const zigzagOffset = sheriffCount > 2 ? (i % 2 === 0 ? '-30%' : '30%') : '0%';

    slots.push(
      <div
        key={i}
        className="dead-draw-badge-tracker__slot"
        style={{ transform: `translateX(${zigzagOffset})` }}
      >
        <img
          className="dead-draw-badge-tracker__badge-empty"
          src="/submissions/dead-draw/sheriffempty.png"
          alt=""
          draggable={false}
        />
        {isFilled && (
          <img
            className={`dead-draw-badge-tracker__badge-full${isSlamming ? ' dead-draw-badge-tracker__badge-full--slamming' : ''}`}
            src="/submissions/dead-draw/sherriffformeter.png"
            alt="Sheriff eliminated"
            draggable={false}
          />
        )}
      </div>
    );
  }

  // Reverse so slot 0 is at bottom
  slots.reverse();

  return (
    <div className={`dead-draw-badge-tracker${isRampage ? ' dead-draw-badge-tracker--rampage' : ''}${sheriffCount >= 6 ? ' dead-draw-badge-tracker--dense' : ''}`}>
      {slots}
    </div>
  );
};

export default React.memo(DeadDrawBadgeTracker);
