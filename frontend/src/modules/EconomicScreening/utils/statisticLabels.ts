export type StatisticLabel = {
    x: number;
    text: string;
};

export type PlacedStatisticLabel = StatisticLabel & {
    /** 0 is the row nearest the plot area; higher rows sit above it. */
    row: number;
};

const APPROX_CHAR_WIDTH_PX = 6.5;
const LABEL_PADDING_PX = 8;

function estimateLabelWidthPx(text: string): number {
    return text.length * APPROX_CHAR_WIDTH_PX + LABEL_PADDING_PX;
}

/**
 * Places centered labels above vertical lines, moving a label up one row when it would overlap a label
 * already placed in a lower row.
 */
export function placeStatisticLabels(labels: StatisticLabel[], pxPerUnit: number): PlacedStatisticLabel[] {
    const placed: PlacedStatisticLabel[] = [];
    const sorted = [...labels].sort((first, second) => first.x - second.x);
    for (const label of sorted) {
        const halfWidth = estimateLabelWidthPx(label.text) / 2;
        const distancePx = (other: StatisticLabel) =>
            other.x === label.x ? 0 : Math.abs(other.x - label.x) * pxPerUnit;
        let row = 0;
        while (
            placed.some(
                (other) => other.row === row && distancePx(other) < halfWidth + estimateLabelWidthPx(other.text) / 2,
            )
        ) {
            row++;
        }
        placed.push({ ...label, row });
    }
    return placed;
}
