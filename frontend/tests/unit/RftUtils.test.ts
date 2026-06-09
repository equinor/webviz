import { describe, expect, it } from "vitest";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { RftDataAccessor } from "@modules/Rft/utils/RftDataAccessor";
import { makeRftPlotTitle } from "@modules/Rft/view/utils/createTitle";
import { calculateFanchartStatistics, calculateStatisticValues } from "@modules/Rft/view/utils/RftPlotBuilder";

import type { RftEnsembleRealizationData, RftRealizationCurve } from "../../src/modules/Rft/typesAndEnums";

const ENSEMBLE_IDENT = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "iter-0");

function makeCurve(realization: number, values: number[]): RftRealizationCurve {
    return {
        ensembleIdent: ENSEMBLE_IDENT,
        realization,
        depths: values.map((_, index) => index * 10),
        values,
    };
}

describe("RftPlotBuilder helpers", () => {
    describe("calculateStatisticValues", () => {
        it("computes the per-depth statistic across realizations", () => {
            const entries = [makeCurve(0, [10, 20, 30]), makeCurve(1, [20, 40, 60])];
            const means = calculateStatisticValues(
                entries,
                (values) => values.reduce((a, b) => a + b, 0) / values.length,
            );
            expect(means).toEqual([15, 30, 45]);
        });

        it("returns an empty array when there are no entries", () => {
            expect(calculateStatisticValues([], (values) => values[0])).toEqual([]);
        });
    });

    describe("calculateFanchartStatistics", () => {
        it("returns null for empty input", () => {
            expect(calculateFanchartStatistics([])).toBeNull();
        });

        it("exposes the shared depths and ordered statistics", () => {
            const entries = [makeCurve(0, [10, 20]), makeCurve(1, [30, 40])];
            const statistics = calculateFanchartStatistics(entries);
            expect(statistics).not.toBeNull();
            expect(statistics?.depths).toEqual([0, 10]);
            expect(statistics?.minValues).toEqual([10, 20]);
            expect(statistics?.maxValues).toEqual([30, 40]);
            expect(statistics?.meanValues).toEqual([20, 30]);
        });

        it("interpolates realizations sampled at different depths onto a common grid", () => {
            const entries: RftRealizationCurve[] = [
                { ensembleIdent: ENSEMBLE_IDENT, realization: 0, depths: [0, 100], values: [10, 30] },
                { ensembleIdent: ENSEMBLE_IDENT, realization: 1, depths: [0, 50, 100], values: [20, 40, 60] },
            ];
            const statistics = calculateFanchartStatistics(entries);
            expect(statistics?.depths).toEqual([0, 50, 100]);
            // At depth 50, realization 0 is linearly interpolated between 10 and 30 -> 20.
            expect(statistics?.minValues).toEqual([10, 20, 30]);
            expect(statistics?.maxValues).toEqual([20, 40, 60]);
            expect(statistics?.meanValues).toEqual([15, 30, 45]);
        });

        it("ignores realizations outside their sampled depth range", () => {
            const entries: RftRealizationCurve[] = [
                { ensembleIdent: ENSEMBLE_IDENT, realization: 0, depths: [0, 100], values: [10, 30] },
                { ensembleIdent: ENSEMBLE_IDENT, realization: 1, depths: [50, 100], values: [40, 60] },
            ];
            const statistics = calculateFanchartStatistics(entries);
            expect(statistics?.depths).toEqual([0, 50, 100]);
            // At depth 0 only realization 0 has data.
            expect(statistics?.minValues).toEqual([10, 20, 30]);
            expect(statistics?.maxValues).toEqual([10, 40, 60]);
        });
    });
});

describe("makeRftPlotTitle", () => {
    it("returns the fallback title when the well name is missing", () => {
        expect(makeRftPlotTitle(null, "PRESSURE", 0)).toBe("RFT");
    });

    it("includes the response, well and date", () => {
        const title = makeRftPlotTitle("WELL-1", "PRESSURE", Date.UTC(2020, 0, 1));
        expect(title).toContain("PRESSURE");
        expect(title).toContain("WELL-1");
        expect(title).toContain("2020-01-01");
    });
});

describe("RftDataAccessor", () => {
    it("flattens ensemble realization data into curves", () => {
        const realizationData: RftEnsembleRealizationData[] = [
            {
                ensembleIdent: ENSEMBLE_IDENT,
                data: [
                    {
                        realization: 0,
                        well_name: "WELL-1",
                        timestamp_utc_ms: 0,
                        depth_arr: [0, 10],
                        value_arr: [100, 110],
                    },
                ],
            },
        ];
        const accessor = new RftDataAccessor(realizationData);
        const entries = accessor.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].realization).toBe(0);
        expect(entries[0].values).toEqual([100, 110]);
    });

    it("sorts each curve by increasing depth", () => {
        const realizationData: RftEnsembleRealizationData[] = [
            {
                ensembleIdent: ENSEMBLE_IDENT,
                data: [
                    {
                        realization: 0,
                        well_name: "WELL-1",
                        timestamp_utc_ms: 0,
                        depth_arr: [100, 0, 50],
                        value_arr: [30, 10, 20],
                    },
                ],
            },
        ];
        const accessor = new RftDataAccessor(realizationData);
        const entries = accessor.getEntries();
        expect(entries[0].depths).toEqual([0, 50, 100]);
        expect(entries[0].values).toEqual([10, 20, 30]);
    });
});
