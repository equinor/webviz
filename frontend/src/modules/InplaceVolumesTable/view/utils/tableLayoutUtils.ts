import { InplaceVolumesStatistic_api } from "@api";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";

import type { TableColumnsConfig, TableHeading, TableRow } from "../types";

import type { LeafColumn } from "./tableComponentUtils";
import { collectLeafColumns } from "./tableComponentUtils";

export const RESULT_COLUMN_WIDTH_PX = 108;
export const CHAR_WIDTH_PX = 8.5;
export const CATEGORY_COLUMN_CHROME_PX = 60;
export const CATEGORY_COLUMN_MIN_WIDTH_PX = 72;
export const CATEGORY_COLUMN_MAX_WIDTH_PX = 280;
export const MAX_PINNED_WIDTH_FRACTION = 0.5;

const STATISTICS_DISPLAY_ORDER: readonly InplaceVolumesStatistic_api[] = [
    InplaceVolumesStatistic_api.MEAN,
    InplaceVolumesStatistic_api.STDDEV,
    InplaceVolumesStatistic_api.P10,
    InplaceVolumesStatistic_api.P90,
    InplaceVolumesStatistic_api.MIN,
    InplaceVolumesStatistic_api.MAX,
];

export type ConstantColumn = { key: string; label: string; displayValue: string };

export type ColumnLayout = {
    /** Visible leaf columns in on-screen order */
    visibleLeaves: LeafColumn[];
    /** Hidden constant columns with their single display value, in on-screen order */
    constantColumns: ConstantColumn[];
    widthPxByKey: Map<string, number>;
    /** Present only for pinned leaf keys */
    stickyLeftPxByKey: Map<string, number>;
    lastPinnedKey: string | null;
    totalWidthPx: number;
};

function isResultLeaf(leaf: LeafColumn): boolean {
    return leaf.heading.columnType === ColumnType.RESULT;
}

function computeCategoryColumnWidthPx(maxChars: number): number {
    const width = Math.round(maxChars * CHAR_WIDTH_PX) + CATEGORY_COLUMN_CHROME_PX;
    return Math.min(Math.max(width, CATEGORY_COLUMN_MIN_WIDTH_PX), CATEGORY_COLUMN_MAX_WIDTH_PX);
}

export function computeColumnLayout(
    columnsConfig: TableColumnsConfig,
    unfilteredRows: TableRow<TableColumnsConfig>[],
    formatDisplayValue: (value: string | number | null, heading: TableHeading) => string,
    wrapperWidthPx: number,
): ColumnLayout {
    const visibleLeaves: LeafColumn[] = [];
    const constantColumns: ConstantColumn[] = [];
    const widthPxByKey = new Map<string, number>();

    for (const leaf of collectLeafColumns(columnsConfig)) {
        if (isResultLeaf(leaf)) {
            visibleLeaves.push(leaf);
            widthPxByKey.set(leaf.key, RESULT_COLUMN_WIDTH_PX);
            continue;
        }

        const rawValues = new Set(unfilteredRows.map((row) => row[leaf.key]));
        const displayValues = new Set(Array.from(rawValues, (value) => formatDisplayValue(value, leaf.heading)));

        if (unfilteredRows.length >= 2 && displayValues.size === 1) {
            const [displayValue] = displayValues;
            constantColumns.push({ key: leaf.key, label: leaf.heading.label, displayValue });
            continue;
        }

        let maxChars = leaf.heading.label.length;
        for (const value of displayValues) {
            maxChars = Math.max(maxChars, value.length);
        }

        visibleLeaves.push(leaf);
        widthPxByKey.set(leaf.key, computeCategoryColumnWidthPx(maxChars));
    }

    let totalWidthPx = 0;
    for (const leaf of visibleLeaves) {
        totalWidthPx += widthPxByKey.get(leaf.key) ?? 0;
    }

    // Only a leading run of identifier columns can be pinned with cumulative offsets
    const pinnableLeaves: LeafColumn[] = [];
    for (const leaf of visibleLeaves) {
        if (isResultLeaf(leaf)) break;
        pinnableLeaves.push(leaf);
    }

    const stickyLeftPxByKey = new Map<string, number>();
    let lastPinnedKey: string | null = null;

    const pinnedWidthPx = pinnableLeaves.reduce((sum, leaf) => sum + (widthPxByKey.get(leaf.key) ?? 0), 0);
    if (pinnableLeaves.length > 0 && pinnedWidthPx <= wrapperWidthPx * MAX_PINNED_WIDTH_FRACTION) {
        let offsetPx = 0;
        for (const leaf of pinnableLeaves) {
            stickyLeftPxByKey.set(leaf.key, offsetPx);
            offsetPx += widthPxByKey.get(leaf.key) ?? 0;
        }
        lastPinnedKey = pinnableLeaves[pinnableLeaves.length - 1].key;
    }

    return { visibleLeaves, constantColumns, widthPxByKey, stickyLeftPxByKey, lastPinnedKey, totalWidthPx };
}

export function sortStatisticsForDisplay(statistics: InplaceVolumesStatistic_api[]): InplaceVolumesStatistic_api[] {
    return statistics.toSorted((a, b) => STATISTICS_DISPLAY_ORDER.indexOf(a) - STATISTICS_DISPLAY_ORDER.indexOf(b));
}
