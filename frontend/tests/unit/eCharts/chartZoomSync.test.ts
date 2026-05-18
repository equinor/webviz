import { describe, expect, it } from "vitest";

import { mergeZoomUpdatesForTesting } from "@modules/_shared/eCharts/hooks/useChartZoomSync";

describe("chart zoom state sync", () => {
    it("removes an axis zoom when the update covers the full range", () => {
        const next = mergeZoomUpdatesForTesting(
            {
                x: { start: 10, end: 60 },
                y: { start: 20, end: 80 },
            },
            [{ axisKey: "x", zoom: { start: 0, end: 100 } }],
        );

        expect(next).toEqual({ y: { start: 20, end: 80 } });
    });

    it("removes both axis zooms when both axes are reset", () => {
        const next = mergeZoomUpdatesForTesting(
            {
                x: { start: 10, end: 60 },
                y: { start: 20, end: 80 },
            },
            [
                { axisKey: "x", zoom: { start: 0, end: 100 } },
                { axisKey: "y", zoom: { start: 0, end: 100 } },
            ],
        );

        expect(next).toEqual({});
    });

    it("keeps partial zoom updates", () => {
        const next = mergeZoomUpdatesForTesting(
            {},
            [{ axisKey: "x", zoom: { start: 15, end: 85 } }],
        );

        expect(next).toEqual({ x: { start: 15, end: 85 } });
    });
});
