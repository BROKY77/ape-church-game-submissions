"use client";

import React from "react";

interface RecentMultiplierResult {
    id: number;
    multiplier: number;
    isWin: boolean;
}

interface MyGameWindowProps {
    recentMultipliers: RecentMultiplierResult[];
    currentMultiplier: number;
    isRolling: boolean;
    isWin: boolean | null;
    targetMultiplier: number;
    winChance: number;
    onTargetMultiplierChange: (value: number) => void;
    onWinChanceChange: (value: number) => void;
}

const formatMultiplier = (value: number) => `${value.toFixed(2)}x`;
const HISTORY_CARD_SLOT_WIDTH = 92;

const MyGameWindow: React.FC<MyGameWindowProps> = ({
    recentMultipliers,
    currentMultiplier,
    isRolling,
    isWin,
    targetMultiplier,
    winChance,
    onTargetMultiplierChange,
    onWinChanceChange,
}) => {
    const [historyShiftOffset, setHistoryShiftOffset] = React.useState(0);
    const [isHistoryAnimating, setIsHistoryAnimating] = React.useState(false);

    const [targetInputValue, setTargetInputValue] = React.useState(String(targetMultiplier));
    const [winChanceInputValue, setWinChanceInputValue] = React.useState(String(winChance));

    // Live sync: as user types in one, update the other
    React.useEffect(() => {
        // Only update if the input is focused and being edited
        if (document.activeElement && document.activeElement.classList.contains('limbo-input-target')) {
            const parsed = Number(targetInputValue);
            if (!isNaN(parsed) && parsed >= 1.01 && parsed <= 1000) {
                const HOUSE_EDGE = 0.98;
                let nextWinChance = (HOUSE_EDGE / parsed) * 100;
                nextWinChance = Math.max(0.01, Math.min(98, Number(nextWinChance.toFixed(3))));
                // Show 3 decimals if < 1, 2 otherwise
                const format = (val: number) => {
                    if (val < 1) return val.toFixed(3).replace(/\.000$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                    if (Number.isInteger(val)) return String(val);
                    return val.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                };
                setWinChanceInputValue(format(nextWinChance));
            }
        }
    }, [targetInputValue]);

    React.useEffect(() => {
        if (document.activeElement && document.activeElement.classList.contains('limbo-input-chance')) {
            const parsed = Number(winChanceInputValue);
            if (!isNaN(parsed) && parsed >= 0.01 && parsed <= 98) {
                // Use the same math as onWinChanceChange, but with correct HOUSE_EDGE
                const HOUSE_EDGE = 0.98;
                const nextTarget = HOUSE_EDGE / (parsed / 100);
                setTargetInputValue(String(Math.max(1.01, Math.min(1000, Number(nextTarget.toFixed(2))))));
            }
        }
    }, [winChanceInputValue]);

    // Sync display when parent commits a new value (e.g. after a round resolves)
    // Format: 3 decimals if < 1, else 2 decimals, no trailing .00
    const formatInputValue = (val: number) => {
        if (val < 1) return val.toFixed(3).replace(/\.000$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
        if (Number.isInteger(val)) return String(val);
        return val.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
    };
    React.useEffect(() => {
        setTargetInputValue(formatInputValue(targetMultiplier));
    }, [targetMultiplier]);
    React.useEffect(() => {
        setWinChanceInputValue(formatInputValue(winChance));
    }, [winChance]);

    const latestHistoryId = recentMultipliers.length > 0 ? recentMultipliers[recentMultipliers.length - 1].id : -1;
    const previousLatestHistoryIdRef = React.useRef(latestHistoryId);
    const visibleHistory = recentMultipliers.slice(-12);

    React.useEffect(() => {
        if (latestHistoryId !== previousLatestHistoryIdRef.current) {
            previousLatestHistoryIdRef.current = latestHistoryId;
            setIsHistoryAnimating(false);
            setHistoryShiftOffset(HISTORY_CARD_SLOT_WIDTH);
            let frameId2 = 0;
            const frameId1 = requestAnimationFrame(() => {
                frameId2 = requestAnimationFrame(() => {
                    setIsHistoryAnimating(true);
                    setHistoryShiftOffset(0);
                });
            });
            return () => {
                cancelAnimationFrame(frameId1);
                if (frameId2) {
                    cancelAnimationFrame(frameId2);
                }
            };
        }
        previousLatestHistoryIdRef.current = latestHistoryId;
    }, [latestHistoryId]);

    return (
        <div className="limbo-root">
            <div className="limbo-history-strip-wrap">
                <div
                    className={`limbo-history-strip ${isHistoryAnimating ? "limbo-history-strip-animating" : ""}`}
                    style={{ transform: `translateX(${historyShiftOffset}px)` }}
                >
                {visibleHistory.map((entry) => (
                    <div
                        key={`limbo-history-${entry.id}`}
                        className={`limbo-history-pill ${entry.isWin ? "limbo-history-pill-win" : "limbo-history-pill-loss"}`}
                    >
                        {formatMultiplier(entry.multiplier)}
                    </div>
                ))}
                </div>
            </div>

            <div className="limbo-center-stage">
                <p
                    className={`limbo-main-multiplier ${
                        isRolling ? "limbo-main-multiplier-rolling" : isWin === true ? "limbo-main-multiplier-win" : "limbo-main-multiplier-loss"
                    }`}
                >
                    {formatMultiplier(currentMultiplier)}
                </p>
            </div>

            <div className="limbo-bottom-panel">
                <div className="limbo-input-card">
                    <label className="limbo-input-label">Target Multiplier</label>
                    <div className="limbo-input-wrap">
                        <input
                            type="number"
                            min={1.01}
                            max={1000}
                            step={1}
                            value={targetInputValue}
                            inputMode="decimal"
                            pattern="[0-9.]*"
                            onWheel={e => e.currentTarget.blur()}
                            onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                            onChange={(event) => {
                                let val = event.target.value;
                                val = val.replace(/[^\d.]/g, '');
                                let num = Number(val);
                                if (num > 1000) num = 1000;
                                // Limit to 3 decimals if < 0.1, else 2 decimals, no trailing .00
                                if (num) {
                                    if (num < 1) {
                                        val = num.toFixed(3).replace(/\.000$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                                    } else if (Number.isInteger(num)) {
                                        val = String(num);
                                    } else {
                                        val = num.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
                                    }
                                }
                                setTargetInputValue(val);
                            }}
                            onBlur={() => {
                                let parsed = Number(targetInputValue);
                                if (isNaN(parsed) || parsed < 1.01) parsed = 1.01;
                                if (parsed > 1000) parsed = 1000;
                                parsed = parsed < 1 ? Number(parsed.toFixed(3)) : Number(parsed.toFixed(2));
                                onTargetMultiplierChange(parsed);
                                setTargetInputValue(String(parsed));
                            }}
                            className="limbo-input no-spinner limbo-input-target"
                        />
                        <span className="limbo-input-suffix">x</span>
                    </div>
                </div>

                <div className="limbo-input-card">
                    <label className="limbo-input-label">Win Chance</label>
                    <div className="limbo-input-wrap">
                        <input
                            type="number"
                            min={0.01}
                            max={98}
                            step={1}
                            value={winChanceInputValue}
                            inputMode="decimal"
                            pattern="[0-9.]*"
                            onWheel={e => e.currentTarget.blur()}
                            onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                            onChange={(event) => {
                                let val = event.target.value;
                                val = val.replace(/[^\d.]/g, '');
                                let num = Number(val);
                                if (num > 98) num = 98;
                                // Limit to 2 decimals, but no trailing .00
                                val = num ? (Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1')) : val;
                                setWinChanceInputValue(val);
                            }}
                            onBlur={() => {
                                let parsed = Number(winChanceInputValue);
                                if (isNaN(parsed) || parsed < 0.01) parsed = 0.01;
                                if (parsed > 98) parsed = 98;
                                parsed = Number(parsed.toFixed(2));
                                onWinChanceChange(parsed);
                                setWinChanceInputValue(String(parsed));
                            }}
                            className="limbo-input no-spinner limbo-input-chance"
                        />
                        <span className="limbo-input-suffix">%</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MyGameWindow;
