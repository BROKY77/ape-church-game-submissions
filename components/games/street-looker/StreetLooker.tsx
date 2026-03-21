"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import useSound from "use-sound";
import GameWindow from "@/components/shared/GameWindow";
import { Game, randomBytes } from "@/lib/games";
import MyGameSetupCard from "./StreetLookerSetupCard";
import MyGameWindow from "./StreetLookerWindow";
import {
  streetLooker,
  PUNCH_MACHINE_LIMITS,
  PunchPhase,
  ResolvedPunchRound,
  resolvePunchRound,
} from "./streetLookerGameConfig";
import "./street-looker.styles.css";

interface StreetLookerProps {
  game?: Game;
}

interface MyGameState {
  betAmount: number;
  threshold: number;
  isLoading: boolean;
  isGameOngoing: boolean;
  phase: PunchPhase;
  payout: number | null;
  activeRound: ResolvedPunchRound | null;
  lastRound: ResolvedPunchRound | null;
  currentGameId: bigint;
  userRandomWord: Hex;
}

const createGameId = (): bigint =>
  BigInt(bytesToHex(new Uint8Array(randomBytes(32))));

const createRandomWord = (): Hex =>
  bytesToHex(new Uint8Array(randomBytes(32)));

const createInitialState = (): MyGameState => ({
  betAmount: 10,
  threshold: 500,
  isLoading: false,
  isGameOngoing: false,
  phase: "idle",
  payout: null,
  activeRound: null,
  lastRound: null,
  currentGameId: createGameId(),
  userRandomWord: createRandomWord(),
});

const StreetLooker: React.FC<StreetLookerProps> = ({ game = streetLooker }) => {
  const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
  const [gameState, setGameState] = useState<MyGameState>(createInitialState);
  const [muteSfx, setMuteSfx] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const replayRoundRef = useRef<ResolvedPunchRound | null>(null);

  const walletBalance = 250;
  const inReplayMode = false;
  const isUserOriginalPlayer = true;
  const sfxVolume = 1;
  const punchImpactDelayMs = Math.max(
    0,
    Math.round(PUNCH_MACHINE_LIMITS.impactDurationMs * 0.45) - 375
  );

  const [clickSfx] = useSound("/submissions/street-looker/audio/click.mp3", {
    volume: sfxVolume,
    soundEnabled: !muteSfx,
    interrupt: true,
  });
  const [groundPunchSfx, { stop: stopGroundPunchSfx }] = useSound(
    "/submissions/street-looker/audio/ground_punch.mp3",
    {
      volume: sfxVolume,
      soundEnabled: !muteSfx,
      interrupt: true,
      loop: true,
    }
  );
  const [crowdLoseSfx, { stop: stopCrowdLoseSfx }] = useSound("/submissions/street-looker/audio/crowd_lose.mp3", {
    volume: sfxVolume,
    soundEnabled: !muteSfx,
    interrupt: true,
    onend: () => {
      stopGroundPunchSfx();
    },
  });
  const [crowdWinSfx, { stop: stopCrowdWinSfx }] = useSound("/submissions/street-looker/audio/crowd_win.mp3", {
    volume: sfxVolume,
    soundEnabled: !muteSfx,
    interrupt: true,
  });
  const [punchSfx, { stop: stopPunchSfx }] = useSound("/submissions/street-looker/audio/punch.mp3", {
    volume: sfxVolume,
    soundEnabled: !muteSfx,
    interrupt: true,
  });
  const [scoreCountupSfx, { stop: stopScoreCountupSfx }] = useSound(
    "/submissions/street-looker/audio/score_countup.mp3",
    {
      volume: sfxVolume,
      soundEnabled: !muteSfx,
      interrupt: true,
      loop: true,
    }
  );
  const [startingBellSfx, { stop: stopStartingBellSfx }] = useSound(
    "/submissions/street-looker/audio/starting_bell.mp3",
    {
      volume: sfxVolume,
      soundEnabled: !muteSfx,
      interrupt: true,
    }
  );

  const stopRoundSfx = (): void => {
    stopScoreCountupSfx();
    stopGroundPunchSfx();
    stopCrowdLoseSfx();
    stopCrowdWinSfx();
    stopPunchSfx();
    stopStartingBellSfx();
  };

  const clearSequenceTimeouts = (): void => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  const scheduleStep = (callback: () => void, delayMs: number): void => {
    const timeoutId = window.setTimeout(callback, delayMs);
    timeoutsRef.current.push(timeoutId);
  };

  const generateRound = (
    buyIn: number,
    threshold: number,
    gameId: bigint,
    randomWord: Hex
  ): ResolvedPunchRound => resolvePunchRound(buyIn, threshold, gameId, randomWord);

  const runRoundSequence = (round: ResolvedPunchRound, isReplay: boolean): void => {
    clearSequenceTimeouts();
    stopRoundSfx();
    replayRoundRef.current = round;
    startingBellSfx();

    setCurrentView(1);
    setGameState((previous) => ({
      ...previous,
      isLoading: true,
      isGameOngoing: true,
      phase: "loading",
      payout: null,
      activeRound: round,
      lastRound: round,
    }));

    scheduleStep(() => {
      setGameState((previous) => ({
        ...previous,
        isLoading: false,
        phase: "impact",
      }));
    }, PUNCH_MACHINE_LIMITS.loadingDurationMs);

    scheduleStep(() => {
      scoreCountupSfx();
      setGameState((previous) => ({
        ...previous,
        phase: "reveal",
      }));
    }, PUNCH_MACHINE_LIMITS.loadingDurationMs + PUNCH_MACHINE_LIMITS.impactDurationMs);

    scheduleStep(() => {
      stopScoreCountupSfx();

      if (round.didWin) {
        crowdWinSfx();
      } else {
        groundPunchSfx();
        crowdLoseSfx();
        // set timeout to stop the ground punch sfx after 3 seconds
        setTimeout(() => {
          stopGroundPunchSfx();
        }, 3500);
      }

      setGameState((previous) => ({
        ...previous,
        phase: "resolve",
      }));
    }, PUNCH_MACHINE_LIMITS.loadingDurationMs + PUNCH_MACHINE_LIMITS.impactDurationMs + PUNCH_MACHINE_LIMITS.revealDurationMs);

    scheduleStep(() => {
      punchSfx();
    }, PUNCH_MACHINE_LIMITS.loadingDurationMs + punchImpactDelayMs);

    scheduleStep(() => {
      setGameState((previous) => ({
        ...previous,
        isGameOngoing: false,
        payout: round.payout,
        phase: "resolve",
      }));
      setCurrentView(2);

      if (isReplay) {
        toast.message("Replay loaded");
        return;
      }

      toast.success(round.didWin ? `Win! ${round.payout.toFixed(3)} APE` : "Missed the target");
    }, PUNCH_MACHINE_LIMITS.loadingDurationMs + PUNCH_MACHINE_LIMITS.impactDurationMs + PUNCH_MACHINE_LIMITS.revealDurationMs + PUNCH_MACHINE_LIMITS.resolveDurationMs);
  };

  const playGame = async (
    preparedRound?: ResolvedPunchRound,
    isReplay: boolean = false
  ): Promise<void> => {
    const effectiveBetAmount = preparedRound?.buyIn ?? gameState.betAmount;
    const effectiveThreshold = preparedRound?.threshold ?? gameState.threshold;

    if (effectiveBetAmount < PUNCH_MACHINE_LIMITS.minBet) {
      toast.error(`Minimum buy-in is ${PUNCH_MACHINE_LIMITS.minBet} APE`);
      return;
    }

    if (effectiveBetAmount > walletBalance) {
      toast.error("Buy-in exceeds wallet balance");
      return;
    }

    if (
      effectiveThreshold < PUNCH_MACHINE_LIMITS.minThreshold ||
      effectiveThreshold > PUNCH_MACHINE_LIMITS.maxThreshold
    ) {
      toast.error(
        `Target must stay between ${PUNCH_MACHINE_LIMITS.minThreshold} and ${PUNCH_MACHINE_LIMITS.maxThreshold}`
      );
      return;
    }

    const nextGameId = preparedRound?.gameId ?? createGameId();
    const nextRandomWord = preparedRound?.randomWord ?? createRandomWord();
    const resolvedRound =
      preparedRound ??
      generateRound(effectiveBetAmount, effectiveThreshold, nextGameId, nextRandomWord);

    console.log("Mock transaction", {
      buyIn: effectiveBetAmount,
      threshold: effectiveThreshold,
      gameId: nextGameId.toString(),
      randomWord: nextRandomWord,
    });

    setGameState((previous) => ({
      ...previous,
      currentGameId: nextGameId,
      userRandomWord: nextRandomWord,
    }));

    runRoundSequence(resolvedRound, isReplay);
  };

  const handleReset = (): void => {
    clearSequenceTimeouts();
    stopRoundSfx();
    replayRoundRef.current = null;
    setCurrentView(0);
    setGameState(createInitialState());
  };

  const handlePlayAgain = async (): Promise<void> => {
    const preservedBet = gameState.betAmount;
    const preservedThreshold = gameState.threshold;
    const nextGameId = createGameId();
    const nextRandomWord = createRandomWord();
    const nextRound = generateRound(
      preservedBet,
      preservedThreshold,
      nextGameId,
      nextRandomWord
    );

    clickSfx();

    handleReset();
    void playGame(nextRound, false);
  };

  const handleRewatch = (): void => {
    const replayRound = replayRoundRef.current ?? gameState.lastRound;

    if (replayRound == null) {
      toast.error("No previous round to replay");
      return;
    }

    clickSfx();
    handleReset();
    replayRoundRef.current = replayRound;
    void playGame(replayRound, true);
  };

  useEffect(() => {
    if (!muteSfx) {
      return;
    }

    stopRoundSfx();
  }, [muteSfx]);

  useEffect(
    () => () => {
      clearSequenceTimeouts();
      stopRoundSfx();
    },
    []
  );

  const showPNL = useMemo(
    () => (gameState.payout ?? 0) > gameState.betAmount,
    [gameState.betAmount, gameState.payout]
  );

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <GameWindow
        game={game}
        isLoading={false}
        isGameFinished={currentView === 2}
        customHeightMobile="420px"
        betAmount={gameState.betAmount}
        payout={gameState.payout}
        inReplayMode={inReplayMode}
        isUserOriginalPlayer={isUserOriginalPlayer}
        showPNL={showPNL}
        onReset={handleReset}
        onPlayAgain={handlePlayAgain}
        onRewatch={handleRewatch}
        currentGameId={gameState.currentGameId}
        disableBuiltInSong
        onSfxMutedChange={setMuteSfx}
        playAgainText="Play Again"
        resultModalDelayMs={PUNCH_MACHINE_LIMITS.resultModalDelayMs}
      >
        <MyGameWindow
          phase={gameState.phase}
          round={gameState.activeRound}
          isGameFinished={currentView === 2}
        />
      </GameWindow>

      <div className="lg:basis-1/3 lg:flex">
        <MyGameSetupCard
          currentView={currentView}
          betAmount={gameState.betAmount}
          threshold={gameState.threshold}
          payout={gameState.payout}
          walletBalance={walletBalance}
          isLoading={gameState.isLoading}
          lastRound={gameState.lastRound}
          onBetAmountChange={(value) =>
            setGameState((previous) => ({ ...previous, betAmount: value }))
          }
          onThresholdChange={(value) =>
            setGameState((previous) => ({ ...previous, threshold: value }))
          }
          onPlay={() => {
            clickSfx();
            playGame();
          }}
          onReset={handleReset}
          onPlayAgain={() => {
            handlePlayAgain();
          }}
          onRewatch={handleRewatch}
        />
      </div>
    </div>
  );
};

export default StreetLooker;
