import { describe, expect, it } from "vitest";

import {
    formatConvergenceStatLabel,
    getConvergenceSeriesStatKey,
} from "@modules/_shared/eCharts/utils/convergenceSeriesMeta";

describe("formatConvergenceStatLabel", () => {
    it("maps known convergence keys to display labels", () => {
        expect(formatConvergenceStatLabel("p90")).toBe("P90");
        expect(formatConvergenceStatLabel("mean")).toBe("Mean");
        expect(formatConvergenceStatLabel("p10")).toBe("P10");
    });

    it("returns unknown keys unchanged", () => {
        expect(formatConvergenceStatLabel("band")).toBe("band");
    });
});

describe("getConvergenceSeriesStatKey", () => {
    it("extracts valid convergence stat keys", () => {
        expect(getConvergenceSeriesStatKey("convergence:Trace A:p90:0")).toBe("p90");
        expect(getConvergenceSeriesStatKey("convergence:Trace A:mean:0")).toBe("mean");
        expect(getConvergenceSeriesStatKey("convergence:Trace A:p10:0")).toBe("p10");
    });

    it("handles trace names that contain colons", () => {
        expect(getConvergenceSeriesStatKey("convergence:trace:with:colons:p90:1")).toBe("p90");
    });

    it("prefers explicit metadata for convergence summaries", () => {
        expect(
            getConvergenceSeriesStatKey({
                webvizSeriesMeta: {
                    family: "distribution",
                    chart: "convergence",
                    axisIndex: 0,
                    roles: ["summary"],
                    statKey: "mean",
                },
            }),
        ).toBe("mean");
    });

    it("returns null for non-convergence, non-stat, or missing ids", () => {
        expect(getConvergenceSeriesStatKey("convergence:Trace A:band:0")).toBeNull();
        expect(getConvergenceSeriesStatKey("statistic:Trace A:mean:0")).toBeNull();
        expect(getConvergenceSeriesStatKey(undefined)).toBeNull();
    });
});
