import { describe, expect, test } from "vitest";

import { InplaceVolumesStatistic_api } from "@api";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import type { TableColumnsConfig, TableHeading, TableRow } from "@modules/InplaceVolumesTable/view/types";
import {
    CATEGORY_COLUMN_CHROME_PX,
    CATEGORY_COLUMN_MAX_WIDTH_PX,
    CATEGORY_COLUMN_MIN_WIDTH_PX,
    CHAR_WIDTH_PX,
    RESULT_COLUMN_WIDTH_PX,
    computeColumnLayout,
    sortStatisticsForDisplay,
} from "@modules/InplaceVolumesTable/view/utils/tableLayoutUtils";

const WIDE_WRAPPER_PX = 10_000;

function formatPlain(value: string | number | null): string {
    return value === null ? "-" : String(value);
}

function expectedCategoryWidth(maxChars: number): number {
    const width = Math.round(maxChars * CHAR_WIDTH_PX) + CATEGORY_COLUMN_CHROME_PX;
    return Math.min(Math.max(width, CATEGORY_COLUMN_MIN_WIDTH_PX), CATEGORY_COLUMN_MAX_WIDTH_PX);
}

function makeStatisticalConfig(): TableColumnsConfig {
    return {
        ENSEMBLE: { label: "ENSEMBLE", sizeInPercent: 20, columnType: ColumnType.ENSEMBLE },
        ZONE: { label: "ZONE", sizeInPercent: 20, columnType: ColumnType.INDEX },
        STOIIP: {
            label: "STOIIP",
            sizeInPercent: 60,
            subHeading: {
                "STOIIP-Mean": { label: "Mean", sizeInPercent: 50, columnType: ColumnType.RESULT },
                "STOIIP-P10": { label: "P10", sizeInPercent: 50, columnType: ColumnType.RESULT },
            },
        },
    };
}

function makeStatisticalRows(): TableRow<TableColumnsConfig>[] {
    return [
        { __id: "1", ENSEMBLE: "ens1", ZONE: "Valysar", "STOIIP-Mean": 1, "STOIIP-P10": 2 },
        { __id: "2", ENSEMBLE: "ens2", ZONE: "Therys", "STOIIP-Mean": 1, "STOIIP-P10": 2 },
        { __id: "3", ENSEMBLE: "ens1", ZONE: "Volon", "STOIIP-Mean": 1, "STOIIP-P10": 2 },
    ];
}

describe("computeColumnLayout", () => {
    test("result leaves get the fixed width; category widths follow the formula and clamps", () => {
        const veryLong = "X".repeat(100);
        const columnsConfig: TableColumnsConfig = {
            A: { label: "A", sizeInPercent: 25, columnType: ColumnType.INDEX },
            ZONE: { label: "ZONE", sizeInPercent: 25, columnType: ColumnType.INDEX },
            LONG: { label: "LONG", sizeInPercent: 25, columnType: ColumnType.INDEX },
            STOIIP: { label: "STOIIP", sizeInPercent: 25, columnType: ColumnType.RESULT },
        };
        const rows = [
            { __id: "1", A: "b", ZONE: "Valysar_Upper", LONG: veryLong, STOIIP: 1 },
            { __id: "2", A: "c", ZONE: "Therys", LONG: "short", STOIIP: 2 },
        ];

        const layout = computeColumnLayout(columnsConfig, rows, formatPlain, WIDE_WRAPPER_PX);

        expect(layout.widthPxByKey.get("STOIIP")).toBe(RESULT_COLUMN_WIDTH_PX);
        expect(layout.widthPxByKey.get("A")).toBe(CATEGORY_COLUMN_MIN_WIDTH_PX);
        expect(layout.widthPxByKey.get("ZONE")).toBe(expectedCategoryWidth("Valysar_Upper".length));
        expect(layout.widthPxByKey.get("ZONE")).toBeGreaterThan(CATEGORY_COLUMN_MIN_WIDTH_PX);
        expect(layout.widthPxByKey.get("ZONE")).toBeLessThan(CATEGORY_COLUMN_MAX_WIDTH_PX);
        expect(layout.widthPxByKey.get("LONG")).toBe(CATEGORY_COLUMN_MAX_WIDTH_PX);
    });

    test("header label counts towards the category width", () => {
        const columnsConfig: TableColumnsConfig = {
            A_VERY_LONG_HEADER_LABEL: {
                label: "A_VERY_LONG_HEADER_LABEL",
                sizeInPercent: 100,
                columnType: ColumnType.INDEX,
            },
        };
        const rows = [
            { __id: "1", A_VERY_LONG_HEADER_LABEL: "a" },
            { __id: "2", A_VERY_LONG_HEADER_LABEL: "b" },
        ];

        const layout = computeColumnLayout(columnsConfig, rows, formatPlain, WIDE_WRAPPER_PX);

        expect(layout.widthPxByKey.get("A_VERY_LONG_HEADER_LABEL")).toBe(
            expectedCategoryWidth("A_VERY_LONG_HEADER_LABEL".length),
        );
    });

    test("constant columns are hidden only with at least two rows", () => {
        const columnsConfig: TableColumnsConfig = {
            FLUID: { label: "FLUID", sizeInPercent: 50, columnType: ColumnType.FLUID },
            ZONE: { label: "ZONE", sizeInPercent: 50, columnType: ColumnType.INDEX },
        };

        const single = computeColumnLayout(
            columnsConfig,
            [{ __id: "1", FLUID: "oil", ZONE: "Valysar" }],
            formatPlain,
            WIDE_WRAPPER_PX,
        );
        expect(single.visibleLeaves.map((l) => l.key)).toEqual(["FLUID", "ZONE"]);
        expect(single.constantColumns).toEqual([]);

        const multiple = computeColumnLayout(
            columnsConfig,
            [
                { __id: "1", FLUID: "oil", ZONE: "Valysar" },
                { __id: "2", FLUID: "oil", ZONE: "Therys" },
            ],
            formatPlain,
            WIDE_WRAPPER_PX,
        );
        expect(multiple.visibleLeaves.map((l) => l.key)).toEqual(["ZONE"]);
        expect(multiple.constantColumns).toEqual([{ key: "FLUID", label: "FLUID", displayValue: "oil" }]);
        expect(multiple.widthPxByKey.has("FLUID")).toBe(false);
    });

    test("constant detection uses the display value", () => {
        const columnsConfig = makeStatisticalConfig();
        const formatSameEnsembleName = (value: string | number | null, heading: TableHeading) =>
            heading.columnType === ColumnType.ENSEMBLE ? "iter-0" : formatPlain(value);

        const layout = computeColumnLayout(
            columnsConfig,
            makeStatisticalRows(),
            formatSameEnsembleName,
            WIDE_WRAPPER_PX,
        );

        expect(layout.constantColumns).toEqual([{ key: "ENSEMBLE", label: "ENSEMBLE", displayValue: "iter-0" }]);
        expect(layout.visibleLeaves.map((l) => l.key)).not.toContain("ENSEMBLE");
    });

    test("result columns are never hidden, even when constant", () => {
        const layout = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            WIDE_WRAPPER_PX,
        );

        expect(layout.visibleLeaves.map((l) => l.key)).toEqual(["ENSEMBLE", "ZONE", "STOIIP-Mean", "STOIIP-P10"]);
        expect(layout.constantColumns).toEqual([]);
    });

    test("nested headings: groups are not leaves, their leaves are visible", () => {
        const layout = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            WIDE_WRAPPER_PX,
        );

        const keys = layout.visibleLeaves.map((l) => l.key);
        expect(keys).not.toContain("STOIIP");
        expect(keys).toContain("STOIIP-Mean");
        expect(keys).toContain("STOIIP-P10");
        expect(layout.widthPxByKey.has("STOIIP")).toBe(false);
    });

    test("sticky offsets are cumulative and the last identifier column is the edge", () => {
        const layout = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            WIDE_WRAPPER_PX,
        );

        const ensembleWidth = layout.widthPxByKey.get("ENSEMBLE") ?? NaN;
        expect(layout.stickyLeftPxByKey.get("ENSEMBLE")).toBe(0);
        expect(layout.stickyLeftPxByKey.get("ZONE")).toBe(ensembleWidth);
        expect(layout.stickyLeftPxByKey.has("STOIIP-Mean")).toBe(false);
        expect(layout.lastPinnedKey).toBe("ZONE");
    });

    test("nothing is pinned when identifier columns exceed half of the wrapper", () => {
        const wideLayout = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            WIDE_WRAPPER_PX,
        );
        const pinnedWidth = (wideLayout.widthPxByKey.get("ENSEMBLE") ?? 0) + (wideLayout.widthPxByKey.get("ZONE") ?? 0);

        const atLimit = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            pinnedWidth * 2,
        );
        expect(atLimit.lastPinnedKey).toBe("ZONE");

        const narrow = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            pinnedWidth * 2 - 1,
        );
        expect(narrow.stickyLeftPxByKey.size).toBe(0);
        expect(narrow.lastPinnedKey).toBeNull();
    });

    test("total width equals the sum of the visible leaf widths", () => {
        const layout = computeColumnLayout(
            makeStatisticalConfig(),
            makeStatisticalRows(),
            formatPlain,
            WIDE_WRAPPER_PX,
        );

        const sum = layout.visibleLeaves.reduce((acc, leaf) => acc + (layout.widthPxByKey.get(leaf.key) ?? 0), 0);
        expect(layout.totalWidthPx).toBe(sum);
        expect(layout.totalWidthPx).toBeGreaterThan(2 * RESULT_COLUMN_WIDTH_PX);
    });
});

describe("sortStatisticsForDisplay", () => {
    const CANONICAL = [
        InplaceVolumesStatistic_api.MEAN,
        InplaceVolumesStatistic_api.STDDEV,
        InplaceVolumesStatistic_api.P10,
        InplaceVolumesStatistic_api.P90,
        InplaceVolumesStatistic_api.MIN,
        InplaceVolumesStatistic_api.MAX,
    ];

    test("any permutation gives the canonical order", () => {
        const permutations = [
            [...CANONICAL].reverse(),
            [
                InplaceVolumesStatistic_api.MAX,
                InplaceVolumesStatistic_api.P10,
                InplaceVolumesStatistic_api.MIN,
                InplaceVolumesStatistic_api.MEAN,
                InplaceVolumesStatistic_api.P90,
                InplaceVolumesStatistic_api.STDDEV,
            ],
        ];
        for (const permutation of permutations) {
            expect(sortStatisticsForDisplay(permutation)).toEqual(CANONICAL);
        }
    });

    test("subsets keep the canonical order", () => {
        expect(
            sortStatisticsForDisplay([
                InplaceVolumesStatistic_api.MAX,
                InplaceVolumesStatistic_api.P10,
                InplaceVolumesStatistic_api.MEAN,
            ]),
        ).toEqual([InplaceVolumesStatistic_api.MEAN, InplaceVolumesStatistic_api.P10, InplaceVolumesStatistic_api.MAX]);
    });

    test("does not mutate the input", () => {
        const input = [InplaceVolumesStatistic_api.MAX, InplaceVolumesStatistic_api.MEAN];
        const result = sortStatisticsForDisplay(input);

        expect(input).toEqual([InplaceVolumesStatistic_api.MAX, InplaceVolumesStatistic_api.MEAN]);
        expect(result).not.toBe(input);
    });
});
