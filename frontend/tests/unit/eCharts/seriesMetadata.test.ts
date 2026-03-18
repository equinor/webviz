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
                family: "timeseries",
                chart: "timeseries",
                axisIndex: 2,
                roles: ["member"],
                linkGroupKey: "Group A",
                memberKey: "7",
            },
        );

        expect(readSeriesMetadata(series)).toMatchObject({
            family: "timeseries",
            chart: "timeseries",
            axisIndex: 2,
            roles: ["member"],
        });
        expect(getSeriesAxisIndex(series)).toBe(2);
        expect(isMemberSeries(series)).toBe(true);
        expect(getSeriesLinkGroupKey(series)).toBe("Group A");
        expect(getSeriesMemberKey(series)).toBe("7");
    });

    it("falls back to legacy structured series IDs when metadata is absent", () => {
        expect(isMemberSeries("realization:Group A:7:0")).toBe(true);
        expect(isBandSeries("fanchart:Trace A:band:0")).toBe(true);
        expect(getSeriesLinkGroupKey("realization:Group A:7:0")).toBe("Group A");
        expect(getSeriesMemberKey("realization:Group A:7:0")).toBe("7");
        expect(getSeriesStatKey("convergence:Trace A:mean:0")).toBe("mean");
    });

    it("prefers explicit metadata over legacy IDs when both are present", () => {
        const series = withSeriesMetadata(
            { id: "realization:LegacyGroup:1:9" },
            {
                family: "timeseries",
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