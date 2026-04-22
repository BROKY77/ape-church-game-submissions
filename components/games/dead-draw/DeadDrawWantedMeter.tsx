'use client';

import React, { useEffect, useRef, useState } from 'react';

interface DeadDrawWantedMeterProps {
  multiplier: number;
  shotsTaken: number;
  maxShots: number;
  fullClearMultiplier: number;
}

const ANIM_DURATION = 400; // ms to smoothly count up
const ANIM_FPS = 30;
const ANIM_INTERVAL = 1000 / ANIM_FPS;

const DeadDrawWantedMeter: React.FC<DeadDrawWantedMeterProps> = ({
  multiplier,
  shotsTaken,
  maxShots,
  fullClearMultiplier,
}) => {
  const [displayValue, setDisplayValue] = useState(multiplier);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef(multiplier);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (animRef.current) {
      clearInterval(animRef.current);
      animRef.current = null;
    }

    const from = displayValue;
    const to = multiplier;

    if (Math.abs(from - to) < 0.001) {
      setDisplayValue(to);
      return;
    }

    startRef.current = from;
    startTimeRef.current = Date.now();

    animRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / ANIM_DURATION, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = startRef.current + (to - startRef.current) * eased;

      setDisplayValue(current);

      if (progress >= 1) {
        if (animRef.current) clearInterval(animRef.current);
        animRef.current = null;
        setDisplayValue(to);
      }
    }, ANIM_INTERVAL);

    return () => {
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
    };
  }, [multiplier]);

  // Fill percentage: log scale so early shots show visible progress
  // Use log to compress the huge multiplier range into 0-100%
  const fillPercent = fullClearMultiplier > 1
    ? Math.min(Math.log(displayValue) / Math.log(fullClearMultiplier) * 100, 100)
    : 0;

  return (
    <div className="dead-draw-wanted-meter">
      {/* Fill bar behind the meter image */}
      <div className="dead-draw-wanted-meter__fill-track">
        <div
          className="dead-draw-wanted-meter__fill-bar"
          style={{ height: `${fillPercent}%` }}
        />
      </div>
      {/* Meter image on top */}
      <img
        className="dead-draw-wanted-meter__img"
        src="/submissions/dead-draw/finalframe.png"
        alt="Wanted meter"
        draggable={false}
      />
      {/* Multiplier text overlaid on the sign */}
      <div className="dead-draw-wanted-meter__overlay">
        <span
          className="dead-draw-wanted-meter__multiplier"
          style={{
            color: displayValue < 10
              ? '#1a1a1a'
              : displayValue < 40
                ? `rgb(${Math.round(26 + (displayValue - 10) / 30 * 194)}, ${Math.round(26 - (displayValue - 10) / 30 * 26)}, ${Math.round(26 - (displayValue - 10) / 30 * 26)})`
                : displayValue < 120
                  ? `rgb(220, ${Math.round(Math.max(0, 40 - (displayValue - 40) / 80 * 40))}, ${Math.round(Math.max(0, 20 - (displayValue - 40) / 80 * 20))})`
                  : '#ff1a1a',
            textShadow: displayValue >= 120
              ? '0 0 8px rgba(255, 26, 26, 0.6), 0 1px 3px rgba(0, 0, 0, 0.8)'
              : '0 1px 3px rgba(0, 0, 0, 0.4)',
          }}
        >
          {displayValue.toFixed(2)}x
        </span>
      </div>
    </div>
  );
};

export default DeadDrawWantedMeter;
