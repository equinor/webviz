const SUBPLOT_TITLE_HEIGHT_PX = 20;
// Tick label offset from the axis plus some air above the next subplot title.
const ROW_GAP_PADDING_PX = 6;
const MAX_TICK_LABEL_ROW_FRACTION = 0.4;
// An inner row loses the spacing from its domain share; keep at least half of it.
const MAX_SPACING_ROW_DOMAIN_FRACTION = 0.5;
const AVERAGE_CHAR_WIDTH_FACTOR = 0.6;

/**
 * Approximate height in px of the x tick labels below an axis. Rotated category labels are sized from the
 * longest label; anything else is assumed to take one line.
 */
export function estimateXTickLabelExtent(
    categoryLabels: readonly string[] | null,
    tickAngleDeg: number,
    fontSize: number,
): number {
    if (categoryLabels && categoryLabels.length > 0 && tickAngleDeg % 180 !== 0) {
        const maxChars = categoryLabels.reduce((max, label) => Math.max(max, label.length), 0);
        const angle = (Math.abs(tickAngleDeg) * Math.PI) / 180;
        return fontSize * AVERAGE_CHAR_WIDTH_FACTOR * maxChars * Math.sin(angle) + fontSize * Math.abs(Math.cos(angle));
    }
    return fontSize + 4;
}

export type SubplotXAxisSpacingOptions = {
    numRows: number;
    /** Height in px for the subplot rows plus the bottom row's tick labels and axis title. */
    availableHeight: number;
    /** Each row's share of the figure domain before spacing, as `makeSubplots` divides it. */
    rowDomainSize: number;
    showTickLabels: boolean;
    /** Category tick labels, or null for numeric axes. */
    categoryLabels: readonly string[] | null;
    tickAngle: number;
    tickFontSize: number;
    /** The x axis title, or null if there is none. Only subplots with an empty cell below show it. */
    axisTitle: { standoff: number; fontSize: number } | null;
};

export type SubplotXAxisSpacing = {
    /** False if the tick labels don't fit; the axis title then gets a second line with a hover hint. */
    showTickLabels: boolean;
    tickLabelExtent: number;
    /** Gap in px between two subplot rows. */
    verticalGap: number;
    /** `verticalGap` as a fraction of the plot area, as expected by `makeSubplots`. */
    verticalSpacing: number;
};

function axisTitleHeight(axisTitle: SubplotXAxisSpacingOptions["axisTitle"], numLines: number): number {
    return axisTitle ? axisTitle.standoff + numLines * (axisTitle.fontSize + 4) : 0;
}

/**
 * Sizes the gap between subplot rows so a row's x tick labels fit above the next row's subplot title.
 * Tick labels that would take too much of a row are hidden instead, and the spacing is capped so every
 * row keeps a positive height.
 */
export function computeSubplotXAxisSpacing(options: SubplotXAxisSpacingOptions): SubplotXAxisSpacing {
    const rowHeight = (options.availableHeight - axisTitleHeight(options.axisTitle, 1)) / options.numRows;
    const maxVerticalSpacing = MAX_SPACING_ROW_DOMAIN_FRACTION * options.rowDomainSize;

    function computeGap(withTickLabels: boolean) {
        const tickLabelExtent = withTickLabels
            ? estimateXTickLabelExtent(options.categoryLabels, options.tickAngle, options.tickFontSize)
            : 0;
        const titleHeight = axisTitleHeight(options.axisTitle, withTickLabels ? 1 : 2);
        const verticalGap = SUBPLOT_TITLE_HEIGHT_PX + ROW_GAP_PADDING_PX + tickLabelExtent;
        // The bottom row's labels and title sit below the plot area (x axis automargin).
        const plotAreaHeight = options.availableHeight - tickLabelExtent - titleHeight;
        const verticalSpacing = plotAreaHeight > 0 ? verticalGap / plotAreaHeight : Infinity;
        return { tickLabelExtent, verticalGap, verticalSpacing };
    }

    let showTickLabels = options.showTickLabels;
    let gap = computeGap(showTickLabels);
    const gapDoesNotFit = options.numRows > 1 && gap.verticalSpacing > maxVerticalSpacing;
    if (showTickLabels && (gap.tickLabelExtent > MAX_TICK_LABEL_ROW_FRACTION * rowHeight || gapDoesNotFit)) {
        showTickLabels = false;
        gap = computeGap(false);
    }

    return {
        showTickLabels,
        tickLabelExtent: gap.tickLabelExtent,
        verticalGap: gap.verticalGap,
        verticalSpacing: Math.min(gap.verticalSpacing, maxVerticalSpacing),
    };
}
