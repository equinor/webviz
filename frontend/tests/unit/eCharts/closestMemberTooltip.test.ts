import { describe, expect, it } from "vitest";

import { findClosestMember } from "@modules/_shared/eCharts/hooks/useMemberInteraction";

describe("findClosestMember", () => {
    it("returns the nearest member for the hovered category index", () => {
        const series = [
            { axisIndex: 0, seriesIndex: 4, seriesName: "A", values: [10, 20, 30], xValues: [], groupKey: "G", memberId: "1", color: undefined },
            { axisIndex: 0, seriesIndex: 5, seriesName: "A", values: [12, 18, 28], xValues: [], groupKey: "G", memberId: "2", color: undefined },
            { axisIndex: 0, seriesIndex: 6, seriesName: "A", values: [40, 50, 60], xValues: [], groupKey: "G", memberId: "3", color: undefined },
        ];
        const target = findClosestMember(series, 1, 18.4);

        expect(target).not.toBeNull();
        expect(target?.seriesIndex).toBe(5);
        expect(target?.memberId).toBe("2");
    });

    it("skips non-finite values and returns null when no valid candidate exists", () => {
        const series = [
            { axisIndex: 0, seriesIndex: 4, seriesName: "A", values: [10, Number.NaN, 30], xValues: [], groupKey: "G", memberId: "1", color: undefined },
            { axisIndex: 0, seriesIndex: 5, seriesName: "A", values: [12, Number.NaN, 28], xValues: [], groupKey: "G", memberId: "2", color: undefined },
        ];
        const target = findClosestMember(series, 1, 19);

        expect(target).toBeNull();
    });
});