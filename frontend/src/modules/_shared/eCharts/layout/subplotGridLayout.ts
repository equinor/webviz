export interface SubplotLayoutConfig {
    marginLeftPct?: number;
    marginRightPct?: number;
    bottomSpacePct?: number;
    topSpacePct?: number;
    maxCols?: number;
}

export const DEFAULT_LAYOUT_CONFIG: Required<SubplotLayoutConfig> = {
    marginLeftPct: 2,
    marginRightPct: 5,
    bottomSpacePct: 8,
    topSpacePct: 4,
    maxCols: 4,
};

export interface GridEntry {
    top: string;
    left: string;
    width: string;
    height: string;
    containLabel: boolean;
}

export interface SubplotLayoutResult {
    grids: GridEntry[];
    cells: SubplotCell[];
    numCols: number;
    numRows: number;
}

export interface SubplotCell {
    gridIndex: number;
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
    titleTopPct: number;
}

type LayoutMetrics = {
    numCols: number;
    numRows: number;
    cellWidth: number;
    cellHeight: number;
    gapXPct: number;
    gapYPct: number;
    titleHeightPct: number;
};

export function computeSubplotGridLayout(numSubplots: number, config?: SubplotLayoutConfig): SubplotLayoutResult {
    const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };
    const metrics = computeLayoutMetrics(numSubplots, cfg);

    const grids: GridEntry[] = [];
    const cells: SubplotCell[] = [];

    for (let index = 0; index < numSubplots; index++) {
        const { grid, cell } = buildSubplotEntry(index, metrics, cfg);
        grids.push(grid);
        cells.push(cell);
    }

    return { grids, cells, numCols: metrics.numCols, numRows: metrics.numRows };
}

/**
 * Calculates the responsive grid dimensions and cell sizes.
 * Gaps and titles scale down as the grid gets denser so margins don't dominate.
 */
function computeLayoutMetrics(numSubplots: number, cfg: Required<SubplotLayoutConfig>): LayoutMetrics {
    const isMultiGrid = numSubplots > 1;
    const numCols = isMultiGrid ? Math.min(numSubplots, Math.ceil(Math.sqrt(numSubplots)), cfg.maxCols) : 1;
    const numRows = Math.ceil(numSubplots / numCols);

    const gapXPct = isMultiGrid ? Math.max(2, 6 / Math.sqrt(numCols)) : 0;
    const gapYPct = isMultiGrid ? Math.max(2, 8 / Math.sqrt(numRows)) : 0;
    const titleHeightPct = isMultiGrid ? Math.max(1, 3 / Math.sqrt(numRows)) : 0;

    const availableWidth = 100 - cfg.marginLeftPct - cfg.marginRightPct - (numCols - 1) * gapXPct;
    const availableHeight = 100 - cfg.topSpacePct - cfg.bottomSpacePct - (numRows - 1) * gapYPct - numRows * titleHeightPct;

    return {
        numCols,
        numRows,
        gapXPct,
        gapYPct,
        titleHeightPct,
        cellWidth: availableWidth / numCols,
        cellHeight: availableHeight / numRows,
    };
}

function buildSubplotEntry(
    index: number,
    metrics: LayoutMetrics,
    cfg: Required<SubplotLayoutConfig>
): { grid: GridEntry; cell: SubplotCell } {
    const row = Math.floor(index / metrics.numCols);
    const col = index % metrics.numCols;

    const leftPct = cfg.marginLeftPct + col * (metrics.cellWidth + metrics.gapXPct);
    const topPct = cfg.topSpacePct + row * (metrics.cellHeight + metrics.gapYPct + metrics.titleHeightPct) + metrics.titleHeightPct;

    const grid: GridEntry = {
        top: `${topPct}%`,
        left: `${leftPct}%`,
        width: `${metrics.cellWidth}%`,
        height: `${metrics.cellHeight}%`,
        containLabel: true,
    };

    const cell: SubplotCell = {
        gridIndex: index,
        leftPct,
        topPct,
        widthPct: metrics.cellWidth,
        heightPct: metrics.cellHeight,
        titleTopPct: topPct - metrics.titleHeightPct,
    };

    return { grid, cell };
}