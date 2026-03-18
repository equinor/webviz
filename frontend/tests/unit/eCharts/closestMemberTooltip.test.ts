import { describe, expect, it } from "vitest";

import { findClosestMemberSeries } from "@modules/_shared/eCharts/hooks/useClosestMemberTooltip";

describe("findClosestMemberSeries", () => {
    it("returns the nearest member for the hovered category index", () => {
        const target = findClosestMemberSeries(
            [
                { axisIndex: 0, seriesIndex: 4, seriesName: "A", values: [10, 20, 30] },
                { axisIndex: 0, seriesIndex: 5, seriesName: "A", values: [12, 18, 28] },
                { axisIndex: 0, seriesIndex: 6, seriesName: "A", values: [40, 50, 60] },
            ],
            1,
            18.4,
        );

        expect(target).toEqual({ seriesIndex: 5, dataIndex: 1 });
    });

    it("skips non-finite values and returns null when no valid candidate exists", () => {
        const target = findClosestMemberSeries(
            [
                {
                    axisIndex: 0,
                    seriesIndex: 4,
                    seriesName: "A",
                    values: [10, Number.NaN, 30],
                },
                {
                    axisIndex: 0,
                    seriesIndex: 5,
                    seriesName: "A",
                    values: [12, Number.NaN, 28],
                },
            ],
            1,
            19,
        );

        expect(target).toBeNull();
    });
});