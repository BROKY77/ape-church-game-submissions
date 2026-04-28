"use client";

import React, { forwardRef } from "react";
import type { CellState } from "./paydirtState";
import PaydirtCell from "./PaydirtCell";
import { GAME_CONFIG } from "./paydirtConfig";

interface PaydirtGridProps {
    cells: CellState[];
    tensionLevel: 0 | 1 | 2 | 3 | 4;
    rumble: boolean;
    earthquake: boolean;
    /** Index of the last unfilled marker when 3/4 is reached (for spotlight). */
    lastEmptyMarkerIdx: number | null;
    /** Current bet — passed through to each cell so gem labels display the
     *  actual currency payout (bet × multiplier) rather than the multiplier. */
    bet: number;
    /** Live bonus running total (raw multiple of bet). Chest cells display
     *  this × bet so the chest reads as the whole pot, matching the Hold
     *  Total readout — players see one big number, not a confusing split. */
    runningTotal: number;
}

const PaydirtGrid = forwardRef<HTMLDivElement, PaydirtGridProps>(function PaydirtGrid(
    { cells, tensionLevel, rumble, earthquake, lastEmptyMarkerIdx, bet, runningTotal },
    ref,
) {
    const classes = ["pd-grid"];
    // rumble / earthquake classes are now applied to .pd-root (the whole
    // scene shakes) rather than the grid in isolation. Params kept so the
    // parent still passes them; we just don't consume them here.
    void rumble;
    void earthquake;

    // Dim non-marker cells ONLY during the 3/4 near-miss tension — not the
    // hold phase (tension === 4), where every cell should read full-color
    // because the bonus round is the payoff moment, not an anticipation beat.
    const dimOuter = tensionLevel === 3;

    return (
        <div ref={ref} className={classes.join(" ")}>
            {cells.map((cell) => (
                <PaydirtCell
                    key={cell.index}
                    cell={cell}
                    isLastEmptyMarker={cell.index === lastEmptyMarkerIdx}
                    isDimmed={dimOuter && !cell.isMarker}
                    bet={bet}
                    runningTotal={runningTotal}
                />
            ))}
        </div>
    );
});

export default PaydirtGrid;

export function markerCount(cells: CellState[]): number {
    let n = 0;
    for (const m of GAME_CONFIG.MARKER_POSITIONS) {
        if (cells[m].isLit) n++;
    }
    return n;
}
