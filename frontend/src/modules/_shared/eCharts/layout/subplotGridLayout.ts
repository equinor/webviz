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

export function computeSubplotGridLayout(numSubplots: number, config?: SubplotLayoutConfig): SubplotLayoutResult {
    const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };

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
