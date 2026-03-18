import { describe, expect, it } from "vitest";

import {
    getSeriesAxisIndex,
    getSeriesLinkGroupKey,
    getSeriesMemberKey,
    getSeriesStatKey,
    isBandSeries,
    isMemberSeries,
    readSeriesMetadata,
    withSeriesMetadata,
} from "@modules/_shared/eCharts/utils/seriesMetadata";

describe("series metadata helpers", () => {
    it("reads explicit metadata from series-like objects", () => {
        const series = withSeriesMetadata(
            { id: "opaque-id" },
            {
                chart: "timeseries",
                axisIndex: 2,
                roles: ["member"],
                linkGroupKey: "Group A",
                memberKey: "7",
            },
        );

        expect(readSeriesMetadata(series)).toMatchObject({
            chart: "timeseries",
            axisIndex: 2,
            roles: ["member"],
        });
        expect(getSeriesAxisIndex(series)).toBe(2);
        expect(isMemberSeries(series)).toBe(true);
        expect(getSeriesLinkGroupKey(series)).toBe("Group A");
        expect(getSeriesMemberKey(series)).toBe("7");
    });

    it("does not infer semantics without explicit metadata", () => {
        expect(isMemberSeries("realization:Group A:7:0")).toBe(false);
        expect(isBandSeries("fanchart:Trace A:band:0")).toBe(false);
        expect(getSeriesLinkGroupKey("realization:Group A:7:0")).toBeNull();
        expect(getSeriesMemberKey("realization:Group A:7:0")).toBeNull();
        expect(getSeriesStatKey("convergence:Trace A:mean:0")).toBeNull();
    });

    it("does not infer semantics from ids even when names contain colons", () => {
        expect(getSeriesLinkGroupKey("realization:Group:A:7:0")).toBeNull();
        expect(getSeriesMemberKey("realization:Group:A:7:0")).toBeNull();
        expect(getSeriesStatKey("convergence:Trace:With:Colon:p90:1")).toBeNull();
    });

    it("prefers explicit metadata even when an unrelated id is present", () => {
        const series = withSeriesMetadata(
            { id: "realization:LegacyGroup:1:9" },
            {
                chart: "timeseries",
                axisIndex: 4,
                roles: ["member"],
                linkGroupKey: "NewGroup",
                memberKey: "42",
            },
        );

        expect(getSeriesAxisIndex(series)).toBe(4);
        expect(getSeriesLinkGroupKey(series)).toBe("NewGroup");
        expect(getSeriesMemberKey(series)).toBe("42");
    });
});