import { describe, expect, it } from "vitest";

import { findClosestSeriesEntry } from "@modules/_shared/eCharts/hooks/useSeriesInteraction";

describe("findClosestSeriesEntry", () => {
    it("returns the nearest member for the hovered category index", () => {
        const series = [
            {
                axisIndex: 0,
                color: undefined,
                groupKey: "G",
                interactionKey: "G:1",
                kind: "member" as const,
                matchingSeriesIndices: [4],
                memberId: "1",
                seriesName: "A",
                values: [10, 20, 30],
                xValues: [],
            },
            {
                axisIndex: 0,
                color: undefined,
                groupKey: "G",
                interactionKey: "G:2",
                kind: "member" as const,
                matchingSeriesIndices: [5],
                memberId: "2",
                seriesName: "A",
                values: [12, 18, 28],
                xValues: [],
            },
            {
                axisIndex: 0,
                color: undefined,
                groupKey: "G",
                interactionKey: "G:3",
                kind: "member" as const,
                matchingSeriesIndices: [6],
                memberId: "3",
                seriesName: "A",
                values: [40, 50, 60],
                xValues: [],
            },
        ];
        const target = findClosestSeriesEntry(series, 1, 18.4);

        expect(target).not.toBeNull();
        expect(target?.kind).toBe("member");
        expect(target?.matchingSeriesIndices).toEqual([5]);
        if (!target || target.kind !== "member") {
            throw new Error("Expected a member interaction entry");
        }
        expect(target.memberId).toBe("2");
    });

    it("skips non-finite values and returns null when no valid candidate exists", () => {
        const series = [
            {
                axisIndex: 0,
                color: undefined,
                groupKey: "G",
                interactionKey: "G:1",
                kind: "member" as const,
                matchingSeriesIndices: [4],
                memberId: "1",
                seriesName: "A",
                values: [10, Number.NaN, 30],
                xValues: [],
            },
            {
                axisIndex: 0,
                color: undefined,
                groupKey: "G",
                interactionKey: "G:2",
                kind: "member" as const,
                matchingSeriesIndices: [5],
                memberId: "2",
                seriesName: "A",
                values: [12, Number.NaN, 28],
                xValues: [],
            },
        ];
        const target = findClosestSeriesEntry(series, 1, 19);

        expect(target).toBeNull();
    });
});