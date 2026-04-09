'use client';

import React, { useEffect, useReducer, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { randomBytes, Game } from '@/lib/games';
import GameWindow from '@/components/shared/GameWindow';
import DeadDrawWindow from './DeadDrawWindow';
import DeadDrawSetupCard from './DeadDrawSetupCard';
import { RevealSpeed } from './DeadDrawCard';
import { bytesToHex, Hex } from 'viem';
import { toast } from 'sonner';

import { generateBoard, shouldAutoComplete } from './engine/board';
import {
  calculateCumulativeMultiplierBps,
  calculateNextShotMultiplierBps,
  calculateShootStepBps,
  bpsToDisplay,
  getFullClearMultiplierBps,
} from './engine/multiplier';
import { getFlipDelay, getStackCardDelay } from './engine/suspense';
import {
  GameState,
  GameAction,
  GameOutcome,
  BPS_PRECISION,
  TOTAL_POSITIONS,
} from './engine/types';

import './dead-draw.styles.css';
import { deadDrawGame } from './deadDrawConfig';

// --- Animation timing ---
// shatter (500ms) + pause to see card (300ms) = 800ms between layers
const SHATTER_DELAY_MS = 500;

// --- Initial State ---

const initialGameState: GameState = {
  board: null,
  currentView: 0,
  shotsTaken: 0,
  revealedPositions: [],
  currentMultiplier: 1,
  currentMultiplierBps: BPS_PRECISION,
  selectedDepth: 1,
  outcome: null,
  isRewatch: false,
  rewatchActions: [],
  actionHistory: [],
  lastSeed: null,
  lastDepth: 1,
  revealingPosition: null,
  isRevealing: false,
  pendingOutcome: null,
  currentMode: 'take',
  lockedMode: null,
  canAdvanceReveal: false,
  eliminatedSheriffs: 0,
  destroyedPositions: [],
  lastKillCount: 0,
  cardPhase: null,
  preBustMultiplier: 0,
  lastShotPosition: null,
  usedShootMode: false,
  pendingShootStepBps: null,
};

// Sheriff reveal animation time before showing game over screen
const SHERIFF_REVEAL_DELAY_MS = 1200;
const BUST_BLACKOUT_DELAY_MS = 1450; // resolve outcome when blackout fades to reveal board (~645ms blackout + 800ms for board fade)

// --- Reducer ---

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DEPTH': {
      if (state.currentView !== 0) return state;
      return { ...state, selectedDepth: action.depth };
    }

    case 'PLAY_GAME': {
      const board = generateBoard(action.seed, action.depth);
      return {
        ...state,
        board,
        currentView: 1,
        shotsTaken: 0,
        revealedPositions: [],
        currentMultiplier: 1,
        currentMultiplierBps: BPS_PRECISION,
        selectedDepth: action.depth,
        outcome: null,
        isRewatch: false,
        actionHistory: [],
        lastSeed: action.seed,
        lastDepth: action.depth,
        revealingPosition: null,
        isRevealing: false,
        currentMode: 'take',
        lockedMode: null,
        canAdvanceReveal: false,
        eliminatedSheriffs: 0,
        destroyedPositions: [],
        lastKillCount: 0,
        cardPhase: null,
        preBustMultiplier: 0,
        lastShotPosition: null,
        usedShootMode: false,
        pendingShootStepBps: null,
            };
    }

    case 'SHOOT_POSITION': {
      if (!state.board || state.currentView !== 1) return state;
      if (state.isRevealing) return state;

      const { positionIndex } = action;
      const position = state.board.positions[positionIndex];
      if (position.revealed || position.revealProgress > 0) return state;
      if (state.destroyedPositions.includes(positionIndex)) return state;

      const newHistory = [...state.actionHistory, action];
      const mode = state.currentMode;

      if (mode === 'take') {
        // TAKE MODE: initiate with cardPhase 'ready', then auto-flip via effect
        return {
          ...state,
          actionHistory: newHistory,
          revealingPosition: positionIndex,
          isRevealing: true,
          lockedMode: 'take',
          canAdvanceReveal: false,
          cardPhase: 'ready',
          lastShotPosition: positionIndex,
        };
      }

      // SHOOT MODE: existing shatter-based reveal
      const newPositions = state.board.positions.map((p) =>
        p.index === positionIndex
          ? { ...p, revealProgress: 1 }
          : p
      );
      const newBoard = { ...state.board, positions: newPositions };

      // Pre-compute shoot step from board state BEFORE this stack is opened.
      // Must be stored now because eliminatedSheriffs can increment mid-stack
      // (badge timing fix in REVEAL_NEXT_CARD), making pre-action state
      // impossible to reconstruct at COMPLETE_POSITION_REVEAL.
      const shootDepth = state.board.depth;
      const shootTotalDone = state.revealedPositions.length + state.destroyedPositions.length;
      const shootTotalCards = (TOTAL_POSITIONS - shootTotalDone) * shootDepth;
      const shootSheriffsLeft = state.board.sheriffCount - state.eliminatedSheriffs;
      const shootStepBps = calculateShootStepBps(shootTotalCards, shootSheriffsLeft, shootDepth);

      return {
        ...state,
        board: newBoard,
        actionHistory: newHistory,
        revealingPosition: positionIndex,
        isRevealing: true,
        lockedMode: 'shoot',
        canAdvanceReveal: false,
        cardPhase: null,
        lastShotPosition: positionIndex,
        usedShootMode: true,
        pendingShootStepBps: shootStepBps,
      };
    }

    case 'REVEAL_NEXT_CARD': {
      if (!state.board || state.revealingPosition === null) return state;
      if (!state.canAdvanceReveal) return state; // must wait for animation

      const posIdx = state.revealingPosition;
      const position = state.board.positions[posIdx];
      const nextCardIndex = position.revealProgress;
      const depth = state.board.depth;

      // All cards already shown — this click completes the stack
      if (nextCardIndex >= depth) {
        // Delegate to COMPLETE_POSITION_REVEAL
        return gameReducer(state, { type: 'COMPLETE_POSITION_REVEAL', positionIndex: posIdx });
      }

      const nextCard = position.cards[nextCardIndex];
      const newProgress = nextCardIndex + 1;
      const isShootMode = state.lockedMode === 'shoot';

      // Update revealProgress
      const rnPositions = state.board.positions.map((p) =>
        p.index === posIdx ? { ...p, revealProgress: newProgress } : p
      );
      const rnBoard = { ...state.board, positions: rnPositions };

      // TAKE MODE: sheriff = immediate bust
      if (!isShootMode && nextCard.isSheriff) {
        return {
          ...state,
          board: rnBoard,
          preBustMultiplier: state.currentMultiplier,
          currentMultiplier: 0,
          currentMultiplierBps: 0,
          revealedPositions: [...state.revealedPositions, posIdx],
          revealingPosition: null,
          isRevealing: true,
          canAdvanceReveal: false,
          pendingOutcome: 'busted' as GameOutcome,
        };
      }

      // SHOOT MODE: if the card whose face is shattering is a sheriff, increment
      // eliminatedSheriffs now so the badge drop syncs with the sheriff card's
      // shatter animation, not the end of the full stack.
      // When revealProgress advances from N to N+1, cards[N-1]'s face shatters.
      if (isShootMode && nextCardIndex >= 1) {
        const shatteringCard = position.cards[nextCardIndex - 1];
        if (shatteringCard.isSheriff) {
          return {
            ...state,
            board: rnBoard,
            canAdvanceReveal: false,
            eliminatedSheriffs: state.eliminatedSheriffs + 1,
          };
        }
      }

      return {
        ...state,
        board: rnBoard,
        canAdvanceReveal: false,
      };
    }

    case 'ENABLE_ADVANCE': {
      if (!state.isRevealing || state.revealingPosition === null) return state;
      return { ...state, canAdvanceReveal: true };
    }

    // --- Take mode: flip + dismiss card system ---

    case 'FLIP_CARD': {
      if (!state.board || state.revealingPosition === null || state.cardPhase !== 'ready') return state;

      const flipPosIdx = state.revealingPosition;
      const flipPos = state.board.positions[flipPosIdx];
      const flipCardIndex = flipPos.revealProgress;
      const flipCard = flipPos.cards[flipCardIndex];
      const newFlipProgress = flipCardIndex + 1;

      // Advance revealProgress to load the face
      const flipPositions = state.board.positions.map((p) =>
        p.index === flipPosIdx ? { ...p, revealProgress: newFlipProgress } : p
      );
      const flipBoard = { ...state.board, positions: flipPositions };

      // If sheriff in take mode — bust after flip animation
      if (flipCard.isSheriff) {
        return {
          ...state,
          board: flipBoard,
          cardPhase: 'flipped',
          preBustMultiplier: state.currentMultiplier,
          currentMultiplier: 0,
          currentMultiplierBps: 0,
          revealedPositions: [...state.revealedPositions, flipPosIdx],
          pendingOutcome: 'busted' as GameOutcome,
        };
      }

      return {
        ...state,
        board: flipBoard,
        cardPhase: 'flipped',
      };
    }

    case 'DISMISS_CARD': {
      if (state.cardPhase !== 'flipped') return state;
      if (state.pendingOutcome && state.pendingOutcome !== 'rampage') return state; // busted — don't allow dismiss
      return {
        ...state,
        cardPhase: 'dismissing',
      };
    }

    case 'CARD_DISMISSED': {
      if (!state.board || state.revealingPosition === null || state.cardPhase !== 'dismissing') return state;

      // During rampage, handle flip-done instead of normal completion
      if (state.pendingOutcome === 'rampage') {
        const rampPosIdx = state.revealingPosition;
        const rampPos = state.board.positions[rampPosIdx];
        const rampDepth = state.board.depth;

        if (rampPos.revealProgress >= rampDepth) {
          // Last card in stack — mark position done
          return gameReducer(state, { type: 'RAMPAGE_FLIP_DONE', positionIndex: rampPosIdx });
        }
        // More cards in stack — flip next
        return { ...state, cardPhase: 'ready' };
      }

      if (state.pendingOutcome) return state; // busted — don't allow dismiss

      const dismissPosIdx = state.revealingPosition;
      const dismissPos = state.board.positions[dismissPosIdx];
      const dismissDepth = state.board.depth;

      if (dismissPos.revealProgress >= dismissDepth) {
        // Last card dismissed — complete the stack
        return gameReducer(state, { type: 'COMPLETE_POSITION_REVEAL', positionIndex: dismissPosIdx });
      }

      // More cards remain — reset to ready for next card
      return {
        ...state,
        cardPhase: 'ready',
      };
    }

    case 'CASH_OUT': {
      if (!state.board || state.currentView !== 1 || state.shotsTaken === 0 || state.isRevealing)
        return state;

      // Reveal all positions so the game over screen can show the full board
      const cashOutBoard = {
        ...state.board,
        positions: state.board.positions.map((p) => ({
          ...p,
          revealed: true,
          revealProgress: state.board!.depth,
        })),
      };

      return {
        ...state,
        board: cashOutBoard,
        currentView: 2,
        outcome: 'escaped' as GameOutcome,
        actionHistory: [...state.actionHistory, action],
        revealingPosition: null,
        isRevealing: false,
      };
    }

    case 'COMPLETE_POSITION_REVEAL': {
      if (!state.board) return state;
      const { positionIndex } = action;
      const pos = state.board.positions[positionIndex];
      if (pos.revealed) return state;

      const cprPositions = state.board.positions.map((p) =>
        p.index === positionIndex ? { ...p, revealed: true } : p
      );
      const cprBoard = { ...state.board, positions: cprPositions };
      const depth = state.board.depth;

      if (state.lockedMode === 'shoot') {
        // SHOOT MODE: check if this position has any sheriffs
        if (!pos.containsSheriff) {
          // No sheriff found — bust
          return {
            ...state,
            board: cprBoard,
            preBustMultiplier: state.currentMultiplier,
            currentMultiplier: 0,
            currentMultiplierBps: 0,
            revealedPositions: [...state.revealedPositions, positionIndex],
            revealingPosition: null,
            isRevealing: true,
            lockedMode: null,
            canAdvanceReveal: false,
            pendingOutcome: 'shot_loot' as GameOutcome,
            pendingShootStepBps: null,
          };
        }

        // Apply shoot step multiplier (pre-computed at SHOOT_POSITION from board state
        // before the stack was opened)
        const shootMultBps = state.pendingShootStepBps !== null
          ? Math.floor(state.currentMultiplierBps * state.pendingShootStepBps / BPS_PRECISION)
          : state.currentMultiplierBps;
        const shootMult = bpsToDisplay(shootMultBps);
        const newShootShotsTaken = state.shotsTaken + 1;

        // Only count the sheriff on the last layer — earlier layer kills were already
        // incremented in REVEAL_NEXT_CARD so the badge animation syncs per-card.
        const lastCard = pos.cards[depth - 1];
        const lastLayerKill = lastCard.isSheriff ? 1 : 0;
        const newEliminatedSheriffs = state.eliminatedSheriffs + lastLayerKill;
        const newDestroyedPositions = [...state.destroyedPositions, positionIndex];

        // Check rampage: total eliminated >= board sheriff count
        if (newEliminatedSheriffs >= state.board.sheriffCount) {
          return {
            ...state,
            board: cprBoard,
            shotsTaken: newShootShotsTaken,
            currentMultiplier: shootMult,
            currentMultiplierBps: shootMultBps,
            eliminatedSheriffs: newEliminatedSheriffs,
            destroyedPositions: newDestroyedPositions,
            lastKillCount: lastLayerKill,
            revealingPosition: null,
            isRevealing: true,
            lockedMode: null,
            canAdvanceReveal: false,
            pendingOutcome: 'rampage' as GameOutcome,
            pendingShootStepBps: null,
          };
        }

        // Check auto-complete after elimination — pays current accumulated multiplier
        if (shouldAutoComplete(cprBoard, state.revealedPositions, newDestroyedPositions)) {
          return {
            ...state,
            board: cprBoard,
            currentView: 2,
            shotsTaken: newShootShotsTaken,
            currentMultiplier: shootMult,
            currentMultiplierBps: shootMultBps,
            eliminatedSheriffs: newEliminatedSheriffs,
            destroyedPositions: newDestroyedPositions,
            lastKillCount: lastLayerKill,
            outcome: 'full_clear' as GameOutcome,
            revealingPosition: null,
            isRevealing: false,
            lockedMode: null,
            canAdvanceReveal: false,
            pendingShootStepBps: null,
          };
        }

        return {
          ...state,
          board: cprBoard,
          shotsTaken: newShootShotsTaken,
          currentMultiplier: shootMult,
          currentMultiplierBps: shootMultBps,
          eliminatedSheriffs: newEliminatedSheriffs,
          destroyedPositions: newDestroyedPositions,
          lastKillCount: lastLayerKill,
          revealingPosition: null,
          isRevealing: false,
          lockedMode: null,
          canAdvanceReveal: false,
          pendingShootStepBps: null,
                };
      }

      // TAKE MODE: update multiplier
      const newShotsTaken = state.shotsTaken + 1;
      const newRevealedPositions = [...state.revealedPositions, positionIndex];

      let cprMultiplierBps: number;
      if (state.eliminatedSheriffs > 0) {
        const totalDone = newRevealedPositions.length + state.destroyedPositions.length;
        const totalCardsRemaining = (TOTAL_POSITIONS - totalDone) * depth + depth;
        const sheriffsRemaining = state.board.sheriffCount - state.eliminatedSheriffs;
        cprMultiplierBps = calculateNextShotMultiplierBps(
          state.currentMultiplierBps, totalCardsRemaining, sheriffsRemaining, depth
        );
      } else {
        cprMultiplierBps = calculateCumulativeMultiplierBps(newShotsTaken, depth);
      }
      const cprMultiplier = bpsToDisplay(cprMultiplierBps);

      if (shouldAutoComplete(cprBoard, newRevealedPositions, state.destroyedPositions)) {
        // Auto-complete pays the accumulated multiplier (includes this take step)
        return {
          ...state,
          board: cprBoard,
          currentView: 2,
          shotsTaken: newShotsTaken,
          revealedPositions: newRevealedPositions,
          currentMultiplier: cprMultiplier,
          currentMultiplierBps: cprMultiplierBps,
          outcome: 'full_clear' as GameOutcome,
          revealingPosition: null,
          isRevealing: false,
          lockedMode: null,
          canAdvanceReveal: false,
          cardPhase: null,
                };
      }

      return {
        ...state,
        board: cprBoard,
        shotsTaken: newShotsTaken,
        revealedPositions: newRevealedPositions,
        currentMultiplier: cprMultiplier,
        currentMultiplierBps: cprMultiplierBps,
        revealingPosition: null,
        isRevealing: false,
        lockedMode: null,
        canAdvanceReveal: false,
        cardPhase: null,
            };
    }

    case 'RESOLVE_PENDING_OUTCOME': {
      if (!state.pendingOutcome || !state.board) return state;
      // Reveal ALL positions so the game over screen can show the full board
      const finalPositions = state.board.positions.map((p) => ({
        ...p,
        revealed: true,
        revealProgress: state.board!.depth,
      }));
      return {
        ...state,
        board: { ...state.board, positions: finalPositions },
        currentView: 2,
        outcome: state.pendingOutcome,
        pendingOutcome: null,
        isRevealing: false,
      };
    }

    case 'RAMPAGE_FLIP_START': {
      if (!state.board) return state;
      return {
        ...state,
        revealingPosition: action.positionIndex,
        lockedMode: 'take',
        cardPhase: 'ready',
        isRevealing: true,
      };
    }

    case 'RAMPAGE_FLIP_DONE': {
      if (!state.board) return state;
      const rampPositions = state.board.positions.map((p) =>
        p.index === action.positionIndex
          ? { ...p, revealed: true, revealProgress: state.board!.depth }
          : p
      );
      return {
        ...state,
        board: { ...state.board, positions: rampPositions },
        revealedPositions: [...state.revealedPositions, action.positionIndex],
        revealingPosition: null,
        lockedMode: null,
        cardPhase: null,
      };
    }

    case 'COMPLETE_RAMPAGE': {
      if (!state.board) return state;
      // Rampage pays the player's accumulated multiplier (shoot steps already applied)
      return {
        ...state,
        currentView: 2,
        outcome: 'rampage' as GameOutcome,
        pendingOutcome: null,
        isRevealing: false,
      };
    }

    case 'SWITCH_MODE': {
      if (state.currentView !== 1 || state.isRevealing) return state;
      if (state.lockedMode !== null) return state; // locked during mid-stack reveal
      if (state.currentMode === action.mode) return state;
      return {
        ...state,
        currentMode: action.mode,
        actionHistory: [...state.actionHistory, action],
      };
    }

    case 'SET_REWATCH': {
      return { ...state, isRewatch: action.isRewatch };
    }

    case 'RESET': {
      return {
        ...initialGameState,
        selectedDepth: state.selectedDepth,
      };
    }

    default:
      return state;
  }
}

// --- Component ---

interface DeadDrawComponentProps {
  /** When omitted (e.g. submissions page renders `<Game />`), local config is used. */
  game?: Game;
}

const DeadDrawComponent: React.FC<DeadDrawComponentProps> = ({
  game: gameProp,
}) => {
  const game = gameProp ?? deadDrawGame;
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayIdString = searchParams.get('id');
  const walletBalance = 25; // TODO: get from wallet

  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [revealSpeed, setRevealSpeed] = useState<RevealSpeed>('fast');
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);

  const [currentGameId, setCurrentGameId] = useState<bigint>(
    replayIdString == null
      ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
      : BigInt(replayIdString)
  );
  const [userRandomWord, setUserRandomWord] = useState<Hex>(
    bytesToHex(new Uint8Array(randomBytes(32)))
  );

  // Timer refs
  const rewatchTimerRefs = useRef<NodeJS.Timeout[]>([]);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle replay ID from URL
  useEffect(() => {
    if (replayIdString !== null && replayIdString.length > 2) {
      setIsLoading(true);
      setCurrentGameId(BigInt(replayIdString));
    }
  }, [replayIdString]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      rewatchTimerRefs.current.forEach(clearTimeout);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // Take mode: auto-flip FIRST card only (player already clicked the position)
  // Subsequent cards in a stack require a click to flip
  // During rampage: auto-flip ALL cards in the stack
  useEffect(() => {
    if (gameState.cardPhase !== 'ready' || gameState.lockedMode !== 'take') return;
    if (!gameState.board || gameState.revealingPosition === null) return;

    const pos = gameState.board.positions[gameState.revealingPosition];
    const isRampage = gameState.pendingOutcome === 'rampage';
    if (pos.revealProgress !== 0 && !isRampage) return; // only auto-flip the first card (unless rampage)

    const timer = setTimeout(() => {
      dispatch({ type: 'FLIP_CARD' });
    }, 50);

    return () => clearTimeout(timer);
  }, [gameState.cardPhase, gameState.lockedMode, gameState.board, gameState.revealingPosition, gameState.pendingOutcome]);

  // --- Rampage: auto-dismiss after flip (no click needed) ---
  useEffect(() => {
    if (gameState.pendingOutcome !== 'rampage') return;
    if (gameState.cardPhase !== 'flipped') return;

    const timer = setTimeout(() => {
      dispatch({ type: 'DISMISS_CARD' });
    }, 250); // fast flip show before dismiss

    return () => clearTimeout(timer);
  }, [gameState.cardPhase, gameState.pendingOutcome]);

  // --- Take mode: auto-dispatch CARD_DISMISSED after dismiss animation ---
  useEffect(() => {
    if (gameState.cardPhase !== 'dismissing') return;

    const timer = setTimeout(() => {
      dispatch({ type: 'CARD_DISMISSED' });
    }, 300); // matches CSS dd-card-dismiss duration

    return () => clearTimeout(timer);
  }, [gameState.cardPhase]);

  // --- Card reveal: enable click-to-advance after each card animation (shoot mode only) ---
  useEffect(() => {
    if (!gameState.isRevealing || gameState.revealingPosition === null || !gameState.board) return;
    if (gameState.pendingOutcome) return;
    if (gameState.canAdvanceReveal) return; // already enabled, waiting for click
    // Take mode uses the flip/dismiss system — don't interfere
    if (gameState.lockedMode === 'take') return;

    const posIdx = gameState.revealingPosition;
    const pos = gameState.board.positions[posIdx];
    const depth = gameState.board.depth;

    // Wait for shatter animation, then enable player click to advance
    revealTimerRef.current = setTimeout(() => {
      dispatch({ type: 'ENABLE_ADVANCE' });
    }, SHATTER_DELAY_MS);

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [gameState.isRevealing, gameState.revealingPosition, gameState.board, gameState.pendingOutcome, gameState.canAdvanceReveal]);

  // --- Pending outcome delay (sheriff reveal animation before game over) ---
  // Rampage is handled by a separate cascade effect, not RESOLVE_PENDING_OUTCOME.
  useEffect(() => {
    if (!gameState.pendingOutcome) return;
    if (gameState.pendingOutcome === 'rampage') return; // handled below

    // Bust outcomes use the blackout screen timing
    // shot_loot gets extra 50ms for revenge flip sequence before blackout
    const isBust = gameState.pendingOutcome === 'busted' || gameState.pendingOutcome === 'shot_loot';
    const extraDelay = gameState.pendingOutcome === 'shot_loot' ? 50 : 0;
    const delay = isBust ? BUST_BLACKOUT_DELAY_MS + extraDelay : SHERIFF_REVEAL_DELAY_MS;

    const timer = setTimeout(() => {
      dispatch({ type: 'RESOLVE_PENDING_OUTCOME' });
    }, delay);

    return () => clearTimeout(timer);
  }, [gameState.pendingOutcome, gameState.lockedMode]);

  // --- Rampage cascade: flip each remaining card in order ---
  const rampageQueueRef = useRef<number[]>([]);
  const rampageActiveRef = useRef(false);

  // Rampage: skip card reveals, just go to game over after a brief delay
  useEffect(() => {
    if (gameState.pendingOutcome !== 'rampage') return;

    rampageActiveRef.current = true;
    const timer = setTimeout(() => {
      rampageActiveRef.current = false;
      dispatch({ type: 'COMPLETE_RAMPAGE' });
    }, 600);

    return () => clearTimeout(timer);
  }, [gameState.pendingOutcome]);

  // --- Computed Values ---

  const payout =
    gameState.currentView === 2
      ? gameState.currentMultiplier * betAmount
      : null;

  // Bust outcomes use our blackout screen — don't tell the template the game is finished
  const isBustOutcome = gameState.outcome === 'busted' || gameState.outcome === 'shot_loot';
  const isGameFinished = gameState.currentView === 2 && !isBustOutcome;
  const shouldShowPNL = payout !== null && payout > betAmount;

  // --- Lifecycle Functions ---

  const playGame = useCallback(
    async (gameId?: bigint, randomWord?: Hex) => {
      setIsLoading(true);

      const randomWordToUse = randomWord ?? userRandomWord;

      try {
        const receiptSuccess = true;

        if (receiptSuccess) {
          toast.success('Transaction complete!');
          const seed = BigInt(randomWordToUse);
          setTimeout(() => {
            setIsLoading(false);
            dispatch({
              type: 'PLAY_GAME',
              seed,
              depth: gameState.selectedDepth,
            });
          }, 1000);
        } else {
          toast.info('Something went wrong..');
          setIsLoading(false);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Transaction not found')
        ) {
          console.warn('Ignoring a known timeout error.');
          return;
        }
        console.error('An unexpected error occurred:', error);
        toast.error('An unexpected error occurred.');
        setIsLoading(false);
      }
    },
    [currentGameId, userRandomWord, gameState.selectedDepth]
  );

  const handleReset = useCallback(
    (isPlayingAgain = false) => {
      rewatchTimerRefs.current.forEach(clearTimeout);
      rewatchTimerRefs.current = [];
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }

      if (!isPlayingAgain) {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);
      }

      rampageQueueRef.current = [];
      rampageActiveRef.current = false;

      dispatch({ type: 'RESET' });

      if (replayIdString !== null) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('id');
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    },
    [replayIdString, searchParams, router]
  );

  const handlePlayAgain = useCallback(async () => {
    const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
    const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
    setCurrentGameId(newGameId);
    setUserRandomWord(newUserWord);
    handleReset(true);
    await playGame(newGameId, newUserWord);
  }, [handleReset, playGame]);

  // Rewatch action queue — dispatches next action when current reveal completes
  const rewatchQueueRef = useRef<GameAction[]>([]);

  useEffect(() => {
    if (!gameState.isRewatch) return;
    if (gameState.isRevealing) return;
    if (gameState.pendingOutcome) return;
    if (gameState.currentView !== 1) return;
    if (rewatchQueueRef.current.length === 0) return;

    const next = rewatchQueueRef.current.shift()!;
    const delay = next.type === 'SWITCH_MODE' ? 400 : 800;
    const timer = setTimeout(() => dispatch(next), delay);
    rewatchTimerRefs.current.push(timer);
  }, [gameState.isRewatch, gameState.isRevealing, gameState.shotsTaken, gameState.destroyedPositions, gameState.pendingOutcome, gameState.currentView, gameState.currentMode]);

  const handleRewatch = useCallback(() => {
    if (!gameState.lastSeed) return;

    const savedActions = [...gameState.actionHistory];
    const seed = gameState.lastSeed;
    const depth = gameState.lastDepth;

    rewatchTimerRefs.current.forEach(clearTimeout);
    rewatchTimerRefs.current = [];
    rewatchQueueRef.current = [];

    dispatch({ type: 'RESET' });
    dispatch({ type: 'PLAY_GAME', seed, depth });
    dispatch({ type: 'SET_REWATCH', isRewatch: true });

    // Queue all actions — they'll be dispatched one-by-one as reveals complete
    rewatchQueueRef.current = [...savedActions];
  }, [gameState.lastSeed, gameState.lastDepth, gameState.actionHistory]);

  // --- Action Handlers ---

  const handleShootPosition = useCallback((positionIndex: number) => {
    dispatch({ type: 'SHOOT_POSITION', positionIndex });
  }, []);

  const handleAdvanceReveal = useCallback(() => {
    dispatch({ type: 'REVEAL_NEXT_CARD' });
  }, []);

  const handleFlipCard = useCallback(() => {
    dispatch({ type: 'FLIP_CARD' });
  }, []);

  const handleDismissCard = useCallback(() => {
    dispatch({ type: 'DISMISS_CARD' });
  }, []);

  const handleCashOut = useCallback(() => {
    dispatch({ type: 'CASH_OUT' });
  }, []);

  const handleSwitchMode = useCallback((mode: 'take' | 'shoot') => {
    dispatch({ type: 'SWITCH_MODE', mode });
  }, []);

  const handleSetDepth = useCallback((depth: number) => {
    dispatch({ type: 'SET_DEPTH', depth });
  }, []);

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
        <GameWindow
          game={game}
          currentGameId={currentGameId}
          isLoading={isLoading}
          isGameFinished={isGameFinished}
          onPlayAgain={handlePlayAgain}
          playAgainText="Play Again"
          onRewatch={handleRewatch}
          onReset={() => handleReset(false)}
          betAmount={betAmount}
          payout={payout}
          inReplayMode={replayIdString !== null}
          isUserOriginalPlayer={true}
          showPNL={shouldShowPNL}
          isGamePaused={false}
          resultModalDelayMs={500}
          disableBuiltInSong={true}
          onMusicMutedChange={setMusicMuted}
          onSfxMutedChange={setSfxMuted}
        >
          <DeadDrawWindow
            game={game}
            gameState={gameState}
            betAmount={betAmount}
            revealSpeed={revealSpeed}
            onShootPosition={handleShootPosition}
            onSwitchMode={handleSwitchMode}
            onCashOut={handleCashOut}
            onAdvanceReveal={handleAdvanceReveal}
            onFlipCard={handleFlipCard}
            onDismissCard={handleDismissCard}
            onPlayAgain={handlePlayAgain}
            onReset={() => handleReset(false)}
            musicMuted={musicMuted}
            sfxMuted={sfxMuted}
          />
        </GameWindow>

        <DeadDrawSetupCard
          game={game}
          onPlay={async () => await playGame()}
          onReset={() => handleReset(false)}
          onPlayAgain={handlePlayAgain}
          onRewatch={handleRewatch}
          currentView={gameState.currentView}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          selectedDepth={gameState.selectedDepth}
          setSelectedDepth={handleSetDepth}
          isLoading={isLoading}
          payout={payout}
          gameState={gameState}
          onCashOut={handleCashOut}
          inReplayMode={replayIdString !== null}
          walletBalance={walletBalance}
          revealSpeed={revealSpeed}
          setRevealSpeed={setRevealSpeed}
        />
      </div>
    </div>
  );
};

export default DeadDrawComponent;
