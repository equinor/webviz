import { describe, expect, it } from "vitest";

import { formatConvergenceStatLabel, getConvergenceSeriesStatKey } from "@modules/_shared/eCharts/charts/convergence/tooltips";


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
    it("extracts valid convergence stat keys from summary metadata", () => {
        expect(
            getConvergenceSeriesStatKey({
                webvizSeriesMeta: {
                    family: "distribution",
                    chart: "convergence",
                    axisIndex: 0,
                    roles: ["summary"],
                    statKey: "p90",
                },
            }),
        ).toBe("p90");
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
        expect(
            getConvergenceSeriesStatKey({
                webvizSeriesMeta: {
                    family: "distribution",
                    chart: "convergence",
                    axisIndex: 0,
                    roles: ["summary"],
                    statKey: "p10",
                },
            }),
        ).toBe("p10");
    });

    it("uses metadata even when the legacy id contains colons", () => {
        expect(
            getConvergenceSeriesStatKey({
                id: "convergence:trace:with:colons:p90:1",
                webvizSeriesMeta: {
                    family: "distribution",
                    chart: "convergence",
                    axisIndex: 1,
                    roles: ["summary"],
                    statKey: "p90",
                },
            }),
        ).toBe("p90");
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

    it("returns null for non-summary metadata or missing metadata", () => {
        expect(
            getConvergenceSeriesStatKey({
                webvizSeriesMeta: {
                    family: "distribution",
                    chart: "convergence",
                    axisIndex: 0,
                    roles: ["band"],
                },
            }),
        ).toBeNull();
        expect(
            getConvergenceSeriesStatKey({
                webvizSeriesMeta: {
                    family: "timeseries",
                    chart: "timeseries",
                    axisIndex: 0,
                    roles: ["summary"],
                    statKey: "mean",
                },
            }),
        ).toBeNull();
        expect(getConvergenceSeriesStatKey(undefined)).toBeNull();
    });
});
