import { describe, expect, it } from "vitest";

import { getNumericPlotlyPointX } from "@modules/_shared/utils/plotlyPoint";

describe("getNumericPlotlyPointX", function () {
    it("reads numeric values from arrays and typed arrays", function () {
        expect(getNumericPlotlyPointX({ data: { type: "scatter", x: [1, 2] }, pointIndex: 1 })).toBe(2);
        expect(getNumericPlotlyPointX({ data: { type: "scatter", x: new Float64Array([3]) }, pointIndex: 0 })).toBe(3);
    });

    it("ignores traces without x values and nonnumeric or missing points", function () {
        expect(getNumericPlotlyPointX({ data: { type: "pie", values: [1] }, pointIndex: 0 })).toBeUndefined();
        expect(getNumericPlotlyPointX({ data: { type: "scatter", x: ["date"] }, pointIndex: 0 })).toBeUndefined();
        expect(getNumericPlotlyPointX({ data: { type: "scatter", x: [1] }, pointIndex: 1 })).toBeUndefined();
    });
});
