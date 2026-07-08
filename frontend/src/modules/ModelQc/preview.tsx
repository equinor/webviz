import type { DrawPreviewFunc } from "@framework/Preview";

// A small "status grid" preview suggesting per-realization pass/fail QC verdicts.
export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const columns = 6;
    const rows = 4;
    const padding = Math.round(Math.min(width, height) * 0.12);
    const gap = Math.round(Math.min(width, height) * 0.04);
    const cellWidth = (width - 2 * padding - (columns - 1) * gap) / columns;
    const cellHeight = (height - 2 * padding - (rows - 1) * gap) / rows;

    // Deterministic pattern of passed/failed cells (no randomness so the preview is stable).
    const failedCells = new Set(["1-3", "2-0", "3-4", "0-5"]);

    const cells = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const isFailed = failedCells.has(`${row}-${col}`);
            cells.push(
                <rect
                    key={`${row}-${col}`}
                    x={padding + col * (cellWidth + gap)}
                    y={padding + row * (cellHeight + gap)}
                    width={cellWidth}
                    height={cellHeight}
                    rx={Math.min(cellWidth, cellHeight) * 0.2}
                    fill={isFailed ? "#ef4444" : "#22c55e"}
                />,
            );
        }
    }

    return <>{cells}</>;
};
