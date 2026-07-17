import React from "react";

import type { Layout, PlotData, PlotMouseEvent } from "plotly.js";

import { useElementSize } from "@lib/hooks/useElementSize";
import { Plot } from "@modules/_shared/components/Plot";

import { QcCheckStatus, QcCheckStatusToStringMapping } from "../../typesAndEnums";

// Status -> numeric code driving the discrete heatmap colorscale (0=gray, 1=green, 2=red,
// 3=magenta).
const STATUS_TO_CODE: Record<QcCheckStatus, number> = {
    [QcCheckStatus.NOT_EVALUATED_PENDING]: 0,
    [QcCheckStatus.PASSED]: 1,
    [QcCheckStatus.FAILED]: 2,
    [QcCheckStatus.NOT_EVALUATED_ERRORED]: 3,
};

// Discrete four-band colorscale (boundaries at z = 0, 1, 2, 3 with zmin=0, zmax=3).
const DISCRETE_COLORSCALE: Array<[number, string]> = [
    [0.0, "#9ca3af"],
    [1 / 4, "#9ca3af"],
    [1 / 4, "#22c55e"],
    [2 / 4, "#22c55e"],
    [2 / 4, "#ef4444"],
    [3 / 4, "#ef4444"],
    [3 / 4, "#d946ef"],
    [1.0, "#d946ef"],
];

const TARGET_CELL_PX = 34;
const MAX_PLOT_HEIGHT_PX = 460;

export type RealizationCell = {
    realization: number;
    status: QcCheckStatus;
    // Extra plain-text lines shown in the hover readout (already HTML-escaped / safe).
    hoverLines: string[];
};

export type RealizationStatusMatrixProps = {
    cells: RealizationCell[];
    selectedRealization: number | null;
    onSelectRealization: (realization: number | null) => void;
};

export function RealizationStatusMatrix(props: RealizationStatusMatrixProps): React.ReactNode {
    const { cells, onSelectRealization } = props;

    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const wrapperSize = useElementSize(wrapperRef);
    const availableWidth = wrapperSize.width;

    const sortedCells = React.useMemo(
        () => [...cells].sort((a, b) => a.realization - b.realization),
        [cells],
    );

    // Cells always render at a fixed size (TARGET_CELL_PX) - only the number of columns that fit
    // the available width (and thus the number of wrapped rows) depends on the cell count.
    const { numColumns, numRows, cellSizePx } = React.useMemo(() => {
        const count = sortedCells.length;
        const cellSizePx = TARGET_CELL_PX;
        if (count === 0) {
            return { numColumns: 1, numRows: 1, cellSizePx };
        }
        const columns =
            availableWidth > 0
                ? Math.min(count, Math.max(1, Math.floor(availableWidth / cellSizePx)))
                : Math.min(count, 10);
        const rows = Math.ceil(count / columns);
        return { numColumns: columns, numRows: rows, cellSizePx };
    }, [sortedCells.length, availableWidth]);

    const { data, layout } = React.useMemo(() => {
        const zMatrix: Array<Array<number | null>> = [];
        const customDataMatrix: string[][] = [];

        for (let row = 0; row < numRows; row++) {
            const zRow: Array<number | null> = [];
            const customRow: string[] = [];
            for (let col = 0; col < numColumns; col++) {
                const index = row * numColumns + col;
                const cell = sortedCells[index];
                if (!cell) {
                    zRow.push(null);
                    customRow.push("");
                    continue;
                }
                zRow.push(STATUS_TO_CODE[cell.status]);
                const detail = cell.hoverLines.length > 0 ? "<br>" + cell.hoverLines.join("<br>") : "";
                customRow.push(
                    `<b>Realization ${cell.realization}</b><br>${QcCheckStatusToStringMapping[cell.status]}${detail}`,
                );
            }
            zMatrix.push(zRow);
            customDataMatrix.push(customRow);
        }

        const trace: Partial<PlotData> & { hoverongaps?: boolean } = {
            type: "heatmap",
            z: zMatrix,
            customdata: customDataMatrix as unknown as PlotData["customdata"],
            x: Array.from({ length: numColumns }, (_, i) => i),
            y: Array.from({ length: numRows }, (_, i) => i),
            xgap: 3,
            ygap: 3,
            zmin: 0,
            zmax: 3,
            colorscale: DISCRETE_COLORSCALE,
            showscale: false,
            hoverongaps: false,
            hovertemplate: "%{customdata}<extra></extra>",
        };

        const plotWidth = numColumns * cellSizePx;
        const plotHeight = Math.min(numRows * cellSizePx, MAX_PLOT_HEIGHT_PX);

        const plotLayout: Partial<Layout> = {
            width: plotWidth,
            height: plotHeight,
            margin: { l: 4, r: 4, t: 4, b: 4 },
            plot_bgcolor: "rgba(0,0,0,0)",
            paper_bgcolor: "rgba(0,0,0,0)",
            xaxis: { visible: false, fixedrange: true, range: [-0.5, numColumns - 0.5] },
            yaxis: {
                visible: false,
                fixedrange: true,
                autorange: "reversed",
                scaleanchor: "x",
                scaleratio: 1,
            },
        };

        return { data: [trace], layout: plotLayout };
    }, [sortedCells, numColumns, numRows, cellSizePx]);

    const handleClick = React.useCallback(
        (event: Readonly<PlotMouseEvent>) => {
            const point = event.points?.[0];
            if (!point || typeof point.x !== "number" || typeof point.y !== "number") {
                return;
            }
            const index = point.y * numColumns + point.x;
            const cell = sortedCells[index];
            if (!cell) {
                return;
            }
            onSelectRealization(cell.realization === props.selectedRealization ? null : cell.realization);
        },
        [sortedCells, numColumns, onSelectRealization, props.selectedRealization],
    );

    if (sortedCells.length === 0) {
        return <div className="text-sm text-gray-500 italic">No realizations were evaluated.</div>;
    }

    return (
        <div ref={wrapperRef} className="w-full">
            <Plot data={data} layout={layout} onClick={handleClick} />
        </div>
    );
}
