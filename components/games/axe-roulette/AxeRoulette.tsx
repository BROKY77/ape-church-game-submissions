"use client";

import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import AxeRouletteWindow, { SpinPhase } from "./AxeRouletteWindow";
import AxeRouletteSetupCard from "./AxeRouletteSetupCard";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import { WHEEL_SLICES } from "./axeRouletteConfig";

// Animation timing (ms)
const TX_DELAY      = 600;  // simulated transaction
const AXE_THROW_AT  = 1400; // wheel spin time before axe is thrown
const AXE_FLIGHT    = 330;  // axe travel duration (11 frames × 30ms)
const HIT_DELAY     = AXE_THROW_AT + AXE_FLIGHT; // when wheel snaps + result is known
const GAME_OVER_DELAY = 1800; // after result, transition to game-over view

interface AxeRouletteComponentProps {
  game: Game;
}

const AxeRouletteComponent: React.FC<AxeRouletteComponentProps> = ({ game }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayIdString = searchParams.get("id");
  const [walletBalance, setWalletBalance] = useState<number>(25);
  const [muteSfx, setMuteSfx] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
  const [isLoading, setIsLoading]         = useState<boolean>(false);
  const [currentGameId] = useState<bigint>(
    replayIdString != null
      ? BigInt(replayIdString)
      : BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
  );
  const [userRandomWord] = useState<Hex>(bytesToHex(new Uint8Array(randomBytes(32))));

  // Game state
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const [betAmount, setBetAmount]             = useState<number>(0);
  const [spinPhase, setSpinPhase]             = useState<SpinPhase>("idle");
  const [wheelRotation, setWheelRotation]     = useState<number>(0);
  const [gameResult, setGameResult]           = useState<"win" | "loss" | null>(null);
  const [resultMultiplier, setResultMultiplier] = useState<number | null>(null);
  const [payout, setPayout]                   = useState<number | null>(null);
  const [lastSpinAngle, setLastSpinAngle]     = useState<number | null>(null);

  const gameOver      = currentView === 2;
  const shouldShowPNL = !!payout && payout > betAmount;

  // ── Core spin logic ──────────────────────────────────────────────────────────
  const executeSpin = (fixedAngle?: number): void => {
    // 1. Pick landing angle (random or fixed for rewatch)
    const targetAngle = fixedAngle ?? Math.random() * 360;
    setLastSpinAngle(targetAngle);

    // 2. Find which slice the angle lands in
    const landedSlice =
      WHEEL_SLICES.find((s) => targetAngle >= s.startAngle && targetAngle < s.endAngle) ??
      WHEEL_SLICES[0];

    // 3. Compute resting rotation so the CENTER of the winning slice aligns to
    //    the 12 o'clock pointer. Using the mid-angle (not the raw random angle)
    //    ensures the axe always visually lands in the middle of the slice while
    //    keeping the probability distribution identical (slice selection still
    //    depends purely on targetAngle covering the full 360°).
    const midAngle = (landedSlice.startAngle + landedSlice.endAngle) / 2;
    const restingRotation = (360 - midAngle) % 360;
    setWheelRotation(restingRotation);

    // 4. Phase: wheel spins freely at constant speed
    setSpinPhase("spinning");

    // 5. Axe starts flying
    timeoutsRef.current.push(setTimeout(() => setSpinPhase("hitting"), AXE_THROW_AT));

    // 6. Axe hits → wheel snaps to resting position → show result
    timeoutsRef.current.push(setTimeout(() => {
      setSpinPhase("stopped");

      const mult = landedSlice.multiplier;
      setResultMultiplier(mult > 0 ? mult : null);

      if (mult > 0) {
        const winPayout = betAmount * mult;
        setPayout(winPayout);
        setWalletBalance((prev) => prev + winPayout);
        setGameResult("win");
        if (mult === 0.5) {
          toast(`½× — Recovered ${winPayout.toFixed(2)} APE`);
        } else if (mult === 1) {
          toast(`1× — Bet returned (${winPayout.toFixed(2)} APE)`);
        } else {
          toast.success(`${mult}× — You won ${winPayout.toFixed(2)} APE!`);
        }
      } else {
        setPayout(0);
        setGameResult("loss");
      }

      timeoutsRef.current.push(setTimeout(() => {
        setCurrentView(2);
      }, GAME_OVER_DELAY));
    }, HIT_DELAY));
  };

  // ── Lifecycle functions ──────────────────────────────────────────────────────
  const playGame = async (): Promise<void> => {
    if (betAmount <= 0) return;

    setIsLoading(true);
    setWalletBalance((prev) => prev - betAmount);
    setCurrentView(1);
    setGameResult(null);
    setResultMultiplier(null);
    setPayout(null);

    // Simulate on-chain transaction
    console.log("mock tx — gameId:", currentGameId.toString(), "randomWord:", userRandomWord);

    try {
      await new Promise((resolve) => setTimeout(resolve, TX_DELAY));
      toast.success("Axe thrown!");
      setIsLoading(false);
      executeSpin();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong.");
      setIsLoading(false);
      setCurrentView(0);
    }
  };

  const handleReset = (): void => {
    clearAllTimeouts();
    setSpinPhase("idle");
    setWheelRotation(0);
    setCurrentView(0);
    setPayout(null);
    setGameResult(null);
    setResultMultiplier(null);

    if (replayIdString !== null) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("id");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  const handlePlayAgain = async (): Promise<void> => {
    clearAllTimeouts();
    setSpinPhase("idle");
    setWheelRotation(0);
    setCurrentView(1);
    setGameResult(null);
    setResultMultiplier(null);
    setPayout(null);
    setWalletBalance((prev) => prev - betAmount);
    // Brief pause so wheel resets visually before spinning again
    setTimeout(() => executeSpin(), 80);
  };

  const handleRewatch = (): void => {
    if (lastSpinAngle === null) return;
    clearAllTimeouts();
    setSpinPhase("idle");
    setWheelRotation(0);
    setCurrentView(1);
    setGameResult(null);
    setResultMultiplier(null);
    setPayout(null);
    // Replay with the same angle — no transaction, no bet deducted
    setTimeout(() => executeSpin(lastSpinAngle), 80);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
        {/* Square game window on desktop */}
        <div className="lg:basis-2/3 lg:aspect-square">
          <GameWindow
            game={game}
            currentGameId={currentGameId}
            isLoading={isLoading}
            isGameFinished={gameOver}
            onPlayAgain={handlePlayAgain}
            onRewatch={handleRewatch}
            playAgainText="Throw Again"
            onReset={handleReset}
            betAmount={betAmount}
            payout={payout}
            inReplayMode={replayIdString !== null}
            isUserOriginalPlayer={true}
            showPNL={shouldShowPNL}
            isGamePaused={false}
            resultModalDelayMs={400}
            onSfxMutedChange={setMuteSfx}
          >
            <AxeRouletteWindow
              spinPhase={spinPhase}
              wheelRotation={wheelRotation}
              gameResult={gameResult}
              isGameOver={gameOver}
              muteSfx={muteSfx}
            />
          </GameWindow>
        </div>

        {/* Setup Card */}
        <AxeRouletteSetupCard
          game={game}
          currentView={currentView}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          isLoading={isLoading}
          isSpinning={spinPhase === "spinning" || spinPhase === "hitting"}
          payout={payout}
          gameResult={gameResult}
          resultMultiplier={resultMultiplier}
          inReplayMode={replayIdString !== null}
          onPlay={playGame}
          onReset={handleReset}
          onPlayAgain={handlePlayAgain}
          walletBalance={walletBalance}
          minBet={1}
          maxBet={75000}
          account={undefined}
          playerAddress={undefined}
          isGamePaused={false}
        />
      </div>
    </div>
  );
};

export default AxeRouletteComponent;
