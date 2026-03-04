/**
 * General-purpose ECharts multi-grid layout calculator.
 *
 * Given the number of subplots and optional margin/gap configuration, this
 * module computes grid, x-axis, y-axis, and title positioning arrays that
 * ECharts can consume directly.
 *
 * It is intentionally free of any timeseries- or domain-specific knowledge
 * so that it can be reused by any module that needs a multi-subplot ECharts
 * layout.
 */

// ── Layout configuration ──

export type SubplotLayoutConfig = {
    /** Left margin in percent of the container width. Default: 2 */
    marginLeftPct?: number;
    /** Right margin in percent of the container width. Default: 5 */
    marginRightPct?: number;
    /** Bottom reserved space in percent (for data-zoom / labels). Default: 8 */
    bottomSpacePct?: number;
    /** Top reserved space in percent. Default: 4 */
    topSpacePct?: number;
    /** Maximum number of columns. Default: 4 */
    maxCols?: number;
};

const DEFAULT_CONFIG: Required<SubplotLayoutConfig> = {
    marginLeftPct: 2,
    marginRightPct: 5,
    bottomSpacePct: 8,
    topSpacePct: 4,
    maxCols: 4,
};

// ── Result types ──

export type GridEntry = {
    top: string;
    left: string;
    width: string;
    height: string;
    containLabel: boolean;
};

export type SubplotLayoutResult = {
    grids: GridEntry[];
    /** Per-subplot position info needed to create axes / titles on top. */
    cells: SubplotCell[];
    numCols: number;
    numRows: number;
};

export type SubplotCell = {
    /** Grid index (same as the array index). */
    gridIndex: number;
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
    /** Title top position — slightly above the grid. */
    titleTopPct: number;
};

// ── Public API ──

/**
 * Compute a multi-grid layout for `numSubplots` subplots.
 *
 * Returns grid definitions plus per-cell positioning metadata so callers
 * can add axes and titles at the correct coordinates.
 */
export function computeSubplotGridLayout(numSubplots: number, config?: SubplotLayoutConfig): SubplotLayoutResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const isMultiGrid = numSubplots > 1;
    const numCols = isMultiGrid ? Math.min(numSubplots, Math.ceil(Math.sqrt(numSubplots)), cfg.maxCols) : 1;
    const numRows = Math.ceil(numSubplots / numCols);

    // Scale gaps down as the grid gets denser so margins don't dominate
    const gapXPct = isMultiGrid ? Math.max(2, 6 / Math.sqrt(numCols)) : 0;
    const gapYPct = isMultiGrid ? Math.max(2, 8 / Math.sqrt(numRows)) : 0;
    const titleHeightPct = isMultiGrid ? Math.max(1, 3 / Math.sqrt(numRows)) : 0;

    const availableWidth = 100 - cfg.marginLeftPct - cfg.marginRightPct - (numCols - 1) * gapXPct;
    const availableHeight =
        100 - cfg.topSpacePct - cfg.bottomSpacePct - (numRows - 1) * gapYPct - numRows * titleHeightPct;
    const cellWidth = availableWidth / numCols;
    const cellHeight = availableHeight / numRows;

    const grids: GridEntry[] = [];
    const cells: SubplotCell[] = [];

    for (let i = 0; i < numSubplots; i++) {
        const row = Math.floor(i / numCols);
        const col = i % numCols;

        const leftPct = cfg.marginLeftPct + col * (cellWidth + gapXPct);
        const topPct = cfg.topSpacePct + row * (cellHeight + gapYPct + titleHeightPct) + titleHeightPct;

        grids.push({
            top: `${topPct}%`,
            left: `${leftPct}%`,
            width: `${cellWidth}%`,
            height: `${cellHeight}%`,
            containLabel: true,
        });

        cells.push({
            gridIndex: i,
            leftPct,
            topPct,
            widthPct: cellWidth,
            heightPct: cellHeight,
            titleTopPct: topPct - titleHeightPct,
        });
    }

    return { grids, cells, numCols, numRows };
}
