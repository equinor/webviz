import { describe, expect, it } from "vitest";

import {
    makeSeriesId,
    makeRealizationSeriesId,
    makeStatisticSeriesId,
    makeFanchartSeriesId,
    makeConvergenceSeriesId,
    parseSeriesId,
    isRealizationSeries,
    isStatisticSeries,
    isFanchartSeries,
    isConvergenceSeries,
    getRealizationId,
    getHighlightGroupKey,
    getStatisticKey,
} from "@modules/_shared/eCharts/utils/seriesId";

describe("makeSeriesId", () => {
    it("creates colon-delimited ID", () => {
        expect(makeSeriesId("realization", "ens1", "42", 0)).toBe("realization:ens1:42:0");
    });

    it("handles axis indices > 0", () => {
        expect(makeSeriesId("bar", "trace", "q", 3)).toBe("bar:trace:q:3");
    });
});

describe("factory helpers", () => {
    it("makeRealizationSeriesId", () => {
        expect(makeRealizationSeriesId("group1", 7, 0)).toBe("realization:group1:7:0");
    });

    it("makeStatisticSeriesId", () => {
        expect(makeStatisticSeriesId("trace", "mean", 1)).toBe("statistic:trace:mean:1");
    });

    it("makeFanchartSeriesId", () => {
        expect(makeFanchartSeriesId("trace", "p10-p90", 0)).toBe("fanchart:trace:p10-p90:0");
    });

    it("makeConvergenceSeriesId", () => {
        expect(makeConvergenceSeriesId("trace", "band", 2)).toBe("convergence:trace:band:2");
    });
});

describe("parseSeriesId", () => {
    it("parses a valid ID", () => {
        const parsed = parseSeriesId("realization:ens1:42:0");
        expect(parsed).toEqual({
            category: "realization",
            name: "ens1",
            qualifier: "42",
            axisIndex: 0,
        });
    });

    it("returns null for too few segments", () => {
        expect(parseSeriesId("realization:foo")).toBeNull();
    });

    it("returns null for unknown category", () => {
        expect(parseSeriesId("unknown:a:b:0")).toBeNull();
    });

    it("handles names containing colons", () => {
        const id = "statistic:trace:with:colons:mean:1";
        const parsed = parseSeriesId(id);
        expect(parsed).not.toBeNull();
        expect(parsed!.category).toBe("statistic");
        expect(parsed!.name).toBe("trace:with:colons");
        expect(parsed!.qualifier).toBe("mean");
        expect(parsed!.axisIndex).toBe(1);
    });

    it("returns null for non-numeric axis index", () => {
        expect(parseSeriesId("realization:a:b:xyz")).toBeNull();
    });
});

describe("category guards", () => {
    it("isRealizationSeries", () => {
        expect(isRealizationSeries("realization:g:1:0")).toBe(true);
        expect(isRealizationSeries("statistic:g:mean:0")).toBe(false);
    });

    it("isStatisticSeries", () => {
        expect(isStatisticSeries("statistic:t:mean:0")).toBe(true);
    });

    it("isFanchartSeries", () => {
        expect(isFanchartSeries("fanchart:t:band:0")).toBe(true);
    });

    it("isConvergenceSeries", () => {
        expect(isConvergenceSeries("convergence:t:line:0")).toBe(true);
    });
});

describe("domain queries", () => {
    it("getRealizationId extracts qualifier from realization series", () => {
        expect(getRealizationId("realization:ens:42:0")).toBe("42");
    });

    it("getRealizationId returns null for non-realization", () => {
        expect(getRealizationId("statistic:t:mean:0")).toBeNull();
    });

    it("getHighlightGroupKey extracts name from realization series", () => {
        expect(getHighlightGroupKey("realization:group1:42:0")).toBe("group1");
    });

    it("getHighlightGroupKey returns null for non-realization", () => {
        expect(getHighlightGroupKey("bar:t:q:0")).toBeNull();
    });

    it("getStatisticKey extracts qualifier from statistic or convergence", () => {
        expect(getStatisticKey("statistic:t:p10:0")).toBe("p10");
        expect(getStatisticKey("convergence:t:mean:0")).toBe("mean");
    });

    it("getStatisticKey returns null for other categories", () => {
        expect(getStatisticKey("realization:g:1:0")).toBeNull();
    });
});
