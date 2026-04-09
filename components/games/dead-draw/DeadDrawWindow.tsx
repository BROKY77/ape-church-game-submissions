'use client';

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import useSound from 'use-sound';
import { Game } from '@/lib/games';
import { GameState, TOTAL_POSITIONS, BPS_PRECISION } from './engine/types';
import { calculateCumulativeMultiplierBps, calculateNextShotMultiplierBps, bpsToDisplay, getFullClearMultiplierBps } from './engine/multiplier';
import { getVignetteOpacity, getMultiplierTier, detectNearMiss, getFlipSoundPitch, getBGMVolume, getHeartbeatIntervalMs } from './engine/suspense';
import DeadDrawGrid from './DeadDrawGrid';
import DeadDrawWantedMeter from './DeadDrawWantedMeter';
import DeadDrawBadgeTracker from './DeadDrawBadgeTracker';
import DeadDrawGameOver from './DeadDrawGameOver';
import DeadDrawBottomBar from './DeadDrawBottomBar';
import { RevealSpeed } from './DeadDrawCard';

// --- Bust Blackout Screen ---

interface BustBlackoutProps {
  outcome: 'busted' | 'shot_loot';
  nearMiss: import('./engine/suspense').NearMissInfo | null;
  betAmount: number;
  depth: number;
  onPlayAgain: () => void;
  onReset: () => void;
}

function BustBlackout({ outcome, nearMiss, betAmount, depth, onPlayAgain, onReset }: BustBlackoutProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const fullClearMult = bpsToDisplay(getFullClearMultiplierBps(depth));
  const fullClearAmount = (fullClearMult * betAmount).toFixed(2);
  const title = 'YOU DIED';

  return (
    <div
      className="dead-draw-bust-blackout"
      style={{ opacity: phase >= 3 ? 0.85 : 1 }}
    >
      <div className="dead-draw-bust-blackout__content">
        <h2
          className="dead-draw-bust-blackout__title"
          style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 200ms ease-out' }}
        >
          {title}
        </h2>

        <div
          className="dead-draw-bust-blackout__actions"
          style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity 200ms ease-out' }}
        >
          <button className="dead-draw-bust-blackout__play-again" onClick={onPlayAgain}>
            PLAY AGAIN
          </button>
          <button className="dead-draw-bust-blackout__change-bet" onClick={onReset}>
            CHANGE BET
          </button>
        </div>

        {nearMiss && (
          <div
            className="dead-draw-bust-blackout__info"
            style={{ opacity: phase >= 4 ? 1 : 0, transition: 'opacity 300ms ease-out' }}
          >
            {nearMiss.hadMultiplier > 1 && (
              <p className="dead-draw-bust-blackout__had">
                You had {nearMiss.hadMultiplier.toFixed(2)}x &mdash; {nearMiss.hadAmount.toFixed(2)} APE
              </p>
            )}
            <p className="dead-draw-bust-blackout__full-clear">
              Full clear was worth {fullClearMult.toFixed(1)}x ({fullClearAmount} APE)
            </p>
            {nearMiss.wasOneAway && nearMiss.nextThreshold && (
              <p className="dead-draw-bust-blackout__threshold">
                One more take would have reached {nearMiss.nextThreshold}x
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DeadDrawWindowProps {
  game: Game;
  gameState: GameState;
  betAmount: number;
  revealSpeed: RevealSpeed;
  onShootPosition: (positionIndex: number) => void;
  onSwitchMode: (mode: 'take' | 'shoot') => void;
  onCashOut: () => void;
  onAdvanceReveal: () => void;
  onFlipCard: () => void;
  onDismissCard: () => void;
  onPlayAgain: () => void;
  onReset: () => void;
  musicMuted: boolean;
  sfxMuted: boolean;
}

const DeadDrawWindow: React.FC<DeadDrawWindowProps> = ({
  game,
  gameState,
  betAmount,
  revealSpeed,
  onShootPosition,
  onSwitchMode,
  onCashOut,
  onAdvanceReveal,
  onFlipCard,
  onDismissCard,
  onPlayAgain,
  onReset,
  musicMuted,
  sfxMuted,
}) => {
  const { board, currentView, outcome } = gameState;
  const gridRef = useRef<HTMLDivElement>(null);

  // Block dismiss until flip animation completes
  const flipStartedAt = useRef(0);
  const canDismiss = useCallback(() => {
    const elapsed = Date.now() - flipStartedAt.current;
    // Flip duration matches the CSS --dd-flip-speed (300-800ms based on tier)
    const effectiveMult = gameState.pendingOutcome ? gameState.preBustMultiplier : gameState.currentMultiplier;
    const tier = getMultiplierTier(effectiveMult);
    const flipMs = tier === 0 ? 300 : tier === 1 ? 500 : tier === 2 ? 650 : 800;
    return elapsed >= flipMs;
  }, [gameState.currentMultiplier, gameState.pendingOutcome, gameState.preBustMultiplier]);

  // Compute near-miss info for game over screen
  const nearMiss = useMemo(() => {
    if (currentView !== 2 || !outcome || !board) return null;
    const fullClearMult = bpsToDisplay(getFullClearMultiplierBps(board.depth));
    return detectNearMiss({
      outcome,
      preBustMultiplier: gameState.preBustMultiplier,
      betAmount,
      fullClearMultiplier: fullClearMult,
      shotsTaken: gameState.shotsTaken,
      depth: board.depth,
      sheriffCount: board.sheriffCount,
      eliminatedSheriffs: gameState.eliminatedSheriffs,
      revealedPositions: gameState.revealedPositions,
      destroyedPositions: gameState.destroyedPositions,
      board,
      lastShotPosition: gameState.lastShotPosition,
    });
  }, [currentView, outcome, board, gameState.preBustMultiplier, betAmount, gameState.shotsTaken, gameState.eliminatedSheriffs, gameState.revealedPositions, gameState.destroyedPositions, gameState.lastShotPosition]);

  // Track bust blackout screen — persists from pending outcome into game over view
  const [showBustBlackout, setShowBustBlackout] = useState(false);
  const bustOutcome = useRef<'busted' | 'shot_loot'>('busted');

  // Sheriff revenge flip — sheriffs shoot back on shot_loot bust
  const [revengePositions, setRevengePositions] = useState<number[]>([]);

  useEffect(() => {
    if (gameState.pendingOutcome === 'busted' || gameState.pendingOutcome === 'shot_loot') {
      bustOutcome.current = gameState.pendingOutcome as 'busted' | 'shot_loot';

      if (gameState.pendingOutcome === 'shot_loot' && board) {
        // Sheriffs shoot back: after loot shatter settles, flip sheriff positions
        const sheriffIndices = board.positions
          .filter(p => p.containsSheriff && !p.revealed && !gameState.destroyedPositions.includes(p.index))
          .map(p => p.index);

        const timers = [
          // T+350ms: sheriff cards start flipping (300ms flip anim)
          setTimeout(() => setRevengePositions(sheriffIndices), 350),
          // T+995ms: blackout at muzzle flash peak (350 + 300 flip + 300 flash delay + 45 peak)
          setTimeout(() => setShowBustBlackout(true), 995),
        ];
        return () => timers.forEach(clearTimeout);
      }

      // Take mode bust: blackout at muzzle flash peak (645ms)
      const timer = setTimeout(() => setShowBustBlackout(true), 645);
      return () => clearTimeout(timer);
    }
    if (currentView === 0 || currentView === 1) {
      setShowBustBlackout(false);
      setRevengePositions([]);
    }
  }, [gameState.pendingOutcome, currentView, board, gameState.destroyedPositions]);

  // --- Sound Effects ---
  const [_playShot] = useSound('/submissions/dead-draw/sfx/sheriffgunshot.mp3', {
    volume: 0.5,
    interrupt: true,
  });
  const [_playClick] = useSound('/submissions/dead-draw/sfx/revolver-click.mp3', {
    volume: 0.4,
    interrupt: true,
  });
  const [_playGameStart] = useSound('/submissions/dead-draw/sfx/revolver-spin-game-start.mp3', {
    volume: 0.5,
  });
  const [_playSheriffHit] = useSound('/submissions/dead-draw/sfx/shot.mp3', {
    volume: 1.0,
  });
  const [_playEscape] = useSound('/submissions/dead-draw/sfx/door-slam-escape.mp3', {
    volume: 0.5,
  });
  const [_playGoldBar] = useSound('/submissions/dead-draw/sfx/stack-complete.mp3', {
    volume: 0.5,
  });
  const [_playGlassShatter] = useSound('/submissions/dead-draw/sfx/shatter.mp3', {
    volume: 0.5,
    interrupt: true,
  });
  const [_playFlip, { sound: flipSound }] = useSound('/submissions/dead-draw/sfx/flip.mp3', {
    volume: 0.5,
    interrupt: true,
  });
  const [_playStackComplete, { sound: stackCompleteSound }] = useSound('/submissions/dead-draw/sfx/stack-complete.mp3', {
    volume: 0.5,
  });
  const [_playCoin, { sound: coinSound }] = useSound('/submissions/dead-draw/sfx/add-to-pot-coin.mp3', {
    volume: 0.5,
  });
  const [_playRicochet, { sound: ricochetSound }] = useSound('/submissions/dead-draw/sfx/ricochetonbadge.mp3', {
    volume: 0.6,
  });
  const [_playBgm, { stop: stopBgm, sound: bgmSound }] = useSound('/submissions/dead-draw/sfx/bgm.mp3', {
    volume: 0.3,
    loop: true,
  });

  // Mute-aware wrappers
  const playShot = useCallback(() => { if (!sfxMuted) _playShot(); }, [sfxMuted, _playShot]);
  const playClick = useCallback(() => { if (!sfxMuted) _playClick(); }, [sfxMuted, _playClick]);
  const playGameStart = useCallback(() => { if (!sfxMuted) _playGameStart(); }, [sfxMuted, _playGameStart]);
  const playSheriffHit = useCallback(() => { if (!sfxMuted) _playSheriffHit(); }, [sfxMuted, _playSheriffHit]);
  const playEscape = useCallback(() => { if (!sfxMuted) _playEscape(); }, [sfxMuted, _playEscape]);
  const playGoldBar = useCallback(() => { if (!sfxMuted) _playGoldBar(); }, [sfxMuted, _playGoldBar]);
  const playGlassShatter = useCallback(() => { if (!sfxMuted) _playGlassShatter(); }, [sfxMuted, _playGlassShatter]);
  const playFlip = useCallback(() => {
    if (!sfxMuted) _playFlip();
  }, [sfxMuted, _playFlip]);
  /** Plays the coin sound with ascending pitch based on shots taken */
  const playCoin = useCallback((shotNumber?: number) => {
    if (sfxMuted) return;
    const pitch = getFlipSoundPitch(shotNumber ?? 0);
    if (coinSound) {
      coinSound.rate(pitch);
    }
    _playCoin();
  }, [sfxMuted, _playCoin, coinSound]);
  const playStackComplete = useCallback((shotNumber?: number) => {
    if (sfxMuted) return;
    const pitch = getFlipSoundPitch(shotNumber ?? 0);
    if (stackCompleteSound) {
      stackCompleteSound.rate(pitch);
    }
    _playStackComplete();
  }, [sfxMuted, _playStackComplete, stackCompleteSound]);
  /** Plays ricochet with ascending pitch based on how many sheriffs have been eliminated */
  const playRicochet = useCallback((eliminated: number, total: number) => {
    if (sfxMuted) return;
    // Pitch from 0.8 (first kill) to 1.5 (last kill)
    const t = total > 1 ? (eliminated - 1) / (total - 1) : 0;
    const pitch = 0.8 + t * 0.7;
    if (ricochetSound) {
      ricochetSound.rate(pitch);
    }
    _playRicochet();
  }, [sfxMuted, _playRicochet, ricochetSound]);
  const playBgm = useCallback(() => { if (!musicMuted) _playBgm(); }, [musicMuted, _playBgm]);

  // BGM: loop while Dead Draw is open (setup through game over); stop when muted or on navigation away.
  useEffect(() => {
    if (musicMuted) {
      stopBgm();
      return undefined;
    }
    _playBgm();
    return () => {
      stopBgm();
    };
  }, [musicMuted, _playBgm, stopBgm]);

  // BGM volume fade — fades to silence as fewer cards remain on the table
  const bgmVolRef = useRef(0.3);
  const remainingCards = TOTAL_POSITIONS - gameState.revealedPositions.length - gameState.destroyedPositions.length;
  useEffect(() => {
    if (!bgmSound || musicMuted || currentView !== 1) return;
    const targetVol = getBGMVolume(remainingCards) * 0.3;
    if (Math.abs(targetVol - bgmVolRef.current) < 0.01) return;
    const currentVol = bgmVolRef.current;
    bgmSound.fade(currentVol, targetVol, 2000);
    bgmVolRef.current = targetVol;
  }, [remainingCards, bgmSound, musicMuted, currentView]);

  // Bust silence — hard mute on bust
  useEffect(() => {
    if (!bgmSound) return;
    if (gameState.pendingOutcome === 'busted' || gameState.pendingOutcome === 'shot_loot') {
      bgmSound.volume(0);
      bgmVolRef.current = 0;
    }
  }, [gameState.pendingOutcome, bgmSound]);

  // Reset BGM volume only on setup view (play again / change bet both route through view 0)
  useEffect(() => {
    if (!bgmSound || musicMuted) return;
    if (currentView === 0) {
      bgmSound.fade(bgmVolRef.current, 0.3, 500);
      bgmVolRef.current = 0.3;
    }
  }, [currentView, bgmSound, musicMuted]);

  // --- Heartbeat Sound ---
  const [_playHeartbeat, { sound: heartbeatSound }] = useSound('/submissions/dead-draw/sfx/heartbeat.mp3', {
    volume: 0.03,
    interrupt: true,
    sprite: { beat: [30, 900] }, // trim 30ms from start, play 900ms (skip clipping at edges)
  });
  const playHeartbeat = useCallback(() => {
    if (heartbeatSound) {
      heartbeatSound.play('beat');
    }
  }, [heartbeatSound]);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatVolumeRef = useRef(0);

  useEffect(() => {
    // Clear any existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Only play during State 1, take mode, not muted
    if (currentView !== 1 || sfxMuted) return;
    // Heartbeat plays in both take and shoot modes
    if (gameState.pendingOutcome) return;

    const heartbeatInfo = getHeartbeatIntervalMs(gameState.currentMultiplier);
    if (!heartbeatInfo) return;

    const { intervalMs, volume } = heartbeatInfo;
    heartbeatVolumeRef.current = volume;

    if (heartbeatSound) {
      heartbeatSound.volume(volume);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (heartbeatSound) {
        heartbeatSound.volume(heartbeatVolumeRef.current);
      }
      playHeartbeat();
    }, intervalMs);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [
    currentView, sfxMuted,
    gameState.currentMode, gameState.pendingOutcome,
    gameState.currentMultiplier, playHeartbeat, heartbeatSound,
  ]);

  // --- Logo easter egg ---
  const [logoBulletHoles, setLogoBulletHoles] = useState<Array<{ x: number; y: number }>>([]);
  const [isLogoSwinging, setIsLogoSwinging] = useState(false);
  const swingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState.currentMode !== 'shoot' || currentView !== 1 || isLogoSwinging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    playShot();
    setLogoBulletHoles((prev) => [...prev, { x, y }]);

    setIsLogoSwinging(true);
    if (swingTimerRef.current) clearTimeout(swingTimerRef.current);
    swingTimerRef.current = setTimeout(() => setIsLogoSwinging(false), 900);
  }, [gameState.currentMode, currentView, playShot, isLogoSwinging]);

  useEffect(() => {
    if (currentView === 0) setLogoBulletHoles([]);
  }, [currentView]);

  // Track previous state to trigger sounds on changes
  const prevView = useRef(currentView);
  const prevPending = useRef(gameState.pendingOutcome);

  // Shot sound = initial card back shatter only
  const handleShotSound = React.useCallback(() => {
    playShot();
  }, [playShot]);

  // Glass shatter = subsequent card shatters and final cleared shatter
  const handleGlassShatter = React.useCallback(() => {
    playGlassShatter();
  }, [playGlassShatter]);

  // Play flip sound with ascending pitch whenever a card flips + stamp flip time
  const prevCardPhase = useRef(gameState.cardPhase);
  useEffect(() => {
    if (gameState.cardPhase === 'flipped' && prevCardPhase.current !== 'flipped' && gameState.lockedMode === 'take') {
      flipStartedAt.current = Date.now();
      playFlip();
    }
    prevCardPhase.current = gameState.cardPhase;
  }, [gameState.cardPhase, gameState.lockedMode, playFlip]);

  // Rewatch auto-advance: simulate user clicks during replay
  useEffect(() => {
    if (!gameState.isRewatch || !gameState.isRevealing) return;

    let timer: NodeJS.Timeout;

    if (gameState.lockedMode === 'take') {
      if (gameState.cardPhase === 'ready') {
        // Auto-flip after a short delay
        timer = setTimeout(() => onFlipCard(), 400);
      } else if (gameState.cardPhase === 'flipped') {
        // Auto-dismiss after showing the card face
        timer = setTimeout(() => onDismissCard(), 600);
      }
    } else if (gameState.lockedMode === 'shoot' && gameState.canAdvanceReveal) {
      // Auto-advance shoot mode shatter
      timer = setTimeout(() => onAdvanceReveal(), 400);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [gameState.isRewatch, gameState.isRevealing, gameState.lockedMode, gameState.cardPhase, gameState.canAdvanceReveal, onFlipCard, onDismissCard, onAdvanceReveal]);

  // Revolver spin sound plays when switching to shoot mode
  const prevMode = useRef(gameState.currentMode);
  useEffect(() => {
    if (gameState.currentMode === 'shoot' && prevMode.current !== 'shoot') {
      playGameStart();
    }
    prevMode.current = gameState.currentMode;
  }, [gameState.currentMode, playGameStart]);

  useEffect(() => {
    if (gameState.pendingOutcome === 'busted' && prevPending.current !== 'busted') {
      // Sound fires slightly before muzzle flash (600ms CSS delay)
      setTimeout(() => playSheriffHit(), 525);
    }
    if (gameState.pendingOutcome === 'shot_loot' && prevPending.current !== 'shot_loot') {
      // Revenge: sound fires just before muzzle flash peak (350 + 300 flip + 300 flash delay)
      setTimeout(() => playSheriffHit(), 920);
    }
    prevPending.current = gameState.pendingOutcome;
  }, [gameState.pendingOutcome, playSheriffHit]);

  // Ricochet on sheriff badge elimination in shoot mode
  const prevEliminated = useRef(gameState.eliminatedSheriffs);
  useEffect(() => {
    if (gameState.eliminatedSheriffs > prevEliminated.current && board) {
      playRicochet(gameState.eliminatedSheriffs, board.sheriffCount);
    }
    prevEliminated.current = gameState.eliminatedSheriffs;
  }, [gameState.eliminatedSheriffs, board, playRicochet]);

  useEffect(() => {
    if (currentView === 2 && outcome) {
      if (outcome === 'full_clear') {
        playGoldBar();
      }
    }
  }, [currentView, outcome, playEscape, playGoldBar]);

  // Visual multiplier that ticks up on card dismissals during multi-depth stacks.
  // Dismissed count = revealProgress (advances on flip), but we only show the
  // interpolated value when a card has been dismissed (not while it's face-up).
  // Key insight: during 'flipped' phase, the card just flipped but hasn't been
  // dismissed yet, so we use (revealProgress - 1) as the dismissed count.
  // During 'dismissing'/'ready'/null, revealProgress = dismissed count.
  const displayMultiplier = useMemo(() => {
    if (!board) return gameState.currentMultiplier;

    // During bust: hold the pre-bust multiplier until the blackout is showing
    if (gameState.pendingOutcome === 'busted' || gameState.pendingOutcome === 'shot_loot') {
      return showBustBlackout ? 0 : gameState.preBustMultiplier;
    }
    if (gameState.pendingOutcome) {
      return gameState.currentMultiplier;
    }
    // SHOOT MODE: interpolate multiplier across card face shatters using pendingShootStepBps
    // progress=1 is just the card back shattering (no face yet), so subtract 1
    // Only ramp when actual faces have been shattered (progress >= 2)
    if (gameState.lockedMode === 'shoot' && gameState.pendingShootStepBps !== null) {
      const depth = board.depth;
      const revealingPos = gameState.revealingPosition !== null
        ? board.positions[gameState.revealingPosition]
        : null;
      if (revealingPos && !revealingPos.revealed && depth > 1) {
        const progress = revealingPos.revealProgress;
        const facesShattered = progress - 1; // first increment is card back, not a face
        if (facesShattered > 0) {
          const stepFloat = gameState.pendingShootStepBps / BPS_PRECISION;
          const fraction = Math.min(facesShattered / depth, 1);
          const visualMult = gameState.currentMultiplier * Math.pow(stepFloat, fraction);
          return Math.round(visualMult * 100) / 100;
        }
      }
      return gameState.currentMultiplier;
    }
    if (gameState.lockedMode === 'shoot') {
      return gameState.currentMultiplier;
    }

    const depth = board.depth;
    if (depth <= 1) return gameState.currentMultiplier;

    // Find active reveal position
    const revealingPos = gameState.revealingPosition !== null
      ? board.positions[gameState.revealingPosition]
      : null;
    if (!revealingPos || revealingPos.revealed) return gameState.currentMultiplier;

    const progress = revealingPos.revealProgress;
    // During 'flipped', the current card is showing but not dismissed yet.
    // Dismissed count = progress - 1 (the flip advanced progress but dismiss hasn't happened).
    // During 'dismissing'/'ready'/null, dismissed count = progress.
    const dismissed = gameState.cardPhase === 'flipped' ? progress - 1 : progress;

    if (dismissed <= 0) return gameState.currentMultiplier;

    const currentBps = gameState.currentMultiplierBps;

    let nextShotBps: number;
    if (gameState.eliminatedSheriffs > 0) {
      const totalDone = gameState.revealedPositions.length + gameState.destroyedPositions.length;
      const totalCardsRemaining = (TOTAL_POSITIONS - totalDone) * depth;
      const sheriffsRemaining = board.sheriffCount - gameState.eliminatedSheriffs;
      nextShotBps = calculateNextShotMultiplierBps(
        currentBps, totalCardsRemaining, sheriffsRemaining, depth
      );
    } else {
      nextShotBps = calculateCumulativeMultiplierBps(
        gameState.shotsTaken + 1,
        depth
      );
    }

    const fraction = Math.min(dismissed / depth, 1);
    const interpolatedBps = currentBps + (nextShotBps - currentBps) * fraction;

    return Math.max(gameState.currentMultiplier, bpsToDisplay(Math.round(interpolatedBps)));
  }, [board, gameState.pendingOutcome, gameState.currentMultiplier, gameState.currentMultiplierBps, gameState.preBustMultiplier, gameState.shotsTaken, gameState.lockedMode, gameState.revealingPosition, gameState.cardPhase, gameState.eliminatedSheriffs, gameState.revealedPositions, gameState.destroyedPositions, gameState.pendingShootStepBps, showBustBlackout]);

  // Badge tracker uses eliminatedSheriffs directly.

  const vignetteSpread = currentView === 1 ? getVignetteOpacity(gameState.currentMultiplier) * 200 : 0;

  return (
    <div
      className="dead-draw-window absolute inset-0 z-10 flex flex-col items-center justify-center"
      style={{ boxShadow: vignetteSpread > 0 ? `inset 0 0 ${vignetteSpread}px ${vignetteSpread * 0.4}px rgba(10, 5, 2, 0.85)` : 'none' }}
    >

      {/* Logo — hanging sign, interactive in shoot mode */}
      <div
        className={`dead-draw-logo${gameState.currentMode === 'shoot' && currentView === 1 ? ' dead-draw-logo--shootable' : ''}`}
        onClick={handleLogoClick}
      >
        <div className={`dead-draw-logo__img-wrap${isLogoSwinging ? ' dead-draw-logo__img-wrap--swinging' : ''}`}>
          <img
            src="/submissions/dead-draw/ddaclogo.png"
            alt="Dead Draw"
            className="dead-draw-logo__img"
            draggable={false}
          />
          {logoBulletHoles.map((hole, i) => (
            <div
              key={i}
              className="dead-draw-logo__bullet-hole"
              style={{ left: `${hole.x}%`, top: `${hole.y}%` }}
            />
          ))}
        </div>
      </div>

      {/* Setup View */}
      {currentView === 0 && (
        <div className="dead-draw-setup-preview flex flex-col items-center justify-center gap-4">
          <DeadDrawGrid
            board={null}
            depth={gameState.selectedDepth}
            onClickPosition={() => { }}
            disabled={true}
            revealSpeed={revealSpeed}
          />
        </div>
      )}

      {/* Ongoing View */}
      {currentView === 1 && board && (
        <div className="dead-draw-game-area flex flex-col items-center w-full h-full sm:justify-between px-1 sm:px-4 py-2" style={{ paddingTop: 'clamp(8px, 12vw, 150px)' }}>
          <div className="dead-draw-game-area__main">
            <div ref={gridRef} style={{ position: 'relative' }}>
              <DeadDrawWantedMeter
                multiplier={displayMultiplier}
                shotsTaken={gameState.shotsTaken}
                maxShots={TOTAL_POSITIONS - board.sheriffCount}
                fullClearMultiplier={bpsToDisplay(getFullClearMultiplierBps(board.depth))}
              />
              <DeadDrawGrid
                board={board}
                depth={board.depth}
                onShotSound={handleShotSound}
                onGlassShatter={handleGlassShatter}
                revealSpeed={revealSpeed}
                multiplierTier={gameState.pendingOutcome === 'rampage' ? 0 : getMultiplierTier(gameState.pendingOutcome ? gameState.preBustMultiplier : gameState.currentMultiplier)}
                currentMultiplier={gameState.pendingOutcome ? gameState.preBustMultiplier : gameState.currentMultiplier}
                revengePositions={revengePositions}
                onClickPosition={(index) => {
                  if (
                    gameState.isRevealing &&
                    gameState.revealingPosition === index &&
                    gameState.lockedMode === 'take'
                  ) {
                    // Take mode: flip or dismiss based on cardPhase
                    if (gameState.pendingOutcome) {
                      // Busted — block all interaction
                    } else if (gameState.cardPhase === 'ready') {
                      flipStartedAt.current = Date.now();
                      onFlipCard();
                    } else if (gameState.cardPhase === 'flipped' && canDismiss()) {
                      const pos = board!.positions[index];
                      const isLastCard = pos.revealProgress >= board!.depth;
                      if (isLastCard && board!.depth >= 3) {
                        playStackComplete(gameState.shotsTaken);
                      } else {
                        playCoin(gameState.shotsTaken);
                      }
                      onDismissCard();
                    }
                  } else if (
                    gameState.isRevealing &&
                    gameState.revealingPosition === index &&
                    gameState.canAdvanceReveal &&
                    gameState.lockedMode === 'shoot'
                  ) {
                    // Shoot mode: existing click-to-advance
                    onAdvanceReveal();
                  } else if (!gameState.isRevealing) {
                    onShootPosition(index);
                  }
                }}
                disabled={false}
                currentMode={gameState.currentMode}
                destroyedPositions={gameState.destroyedPositions}
                cardPhase={gameState.cardPhase}
                lockedMode={gameState.lockedMode}
                revealingPosition={gameState.revealingPosition}
              />
            </div>

            {/* Badge Tracker — right side, mirrors Wanted Meter */}
            <DeadDrawBadgeTracker
              sheriffCount={board.sheriffCount}
              eliminatedSheriffs={gameState.eliminatedSheriffs}
              isRampage={gameState.pendingOutcome === 'rampage'}
            />
          </div>

          <DeadDrawBottomBar
            gameState={gameState}
            betAmount={betAmount}
            onSwitchMode={onSwitchMode}
            onCashOut={onCashOut}
          />
        </div>
      )}

      {/* Game Over View — bust/shot_loot handled by blackout overlay */}
      {currentView === 2 && outcome && outcome !== 'busted' && outcome !== 'shot_loot' && (
        <DeadDrawGameOver
          outcome={outcome}
          multiplier={gameState.currentMultiplier}
          betAmount={betAmount}
          board={board}
          nearMiss={nearMiss}
          depth={board?.depth ?? gameState.selectedDepth}
          shotsTaken={gameState.shotsTaken}
          eliminatedSheriffs={gameState.eliminatedSheriffs}
          usedShootMode={gameState.usedShootMode}
        />
      )}

      {/* Bust blackout — hard cut to black on death */}
      {showBustBlackout && (
        <BustBlackout
          outcome={bustOutcome.current}
          nearMiss={nearMiss}
          betAmount={betAmount}
          depth={board?.depth ?? gameState.selectedDepth}
          onPlayAgain={onPlayAgain}
          onReset={onReset}
        />
      )}
    </div>
  );
};

export default DeadDrawWindow;
