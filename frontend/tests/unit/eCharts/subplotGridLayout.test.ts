import { describe, expect, it } from "vitest";

import { computeSubplotGridLayout } from "@modules/_shared/eCharts";

describe("subplot grid layout", () => {
    it("limits the number of columns", () => {
        const layout = computeSubplotGridLayout(5, {
            limitDirection: "columns",
            maxDirectionElements: 2,
        });

        expect(layout.numCols).toBe(2);
        expect(layout.numRows).toBe(3);
    });

    it("limits the number of rows", () => {
        const layout = computeSubplotGridLayout(5, {
            limitDirection: "rows",
            maxDirectionElements: 2,
        });

        expect(layout.numRows).toBe(2);
        expect(layout.numCols).toBe(3);
    });

    it("keeps a single subplot in a one-by-one grid", () => {
        const layout = computeSubplotGridLayout(1, {
            limitDirection: "columns",
            maxDirectionElements: 3,
        });

        expect(layout.numRows).toBe(1);
        expect(layout.numCols).toBe(1);
    });

    it("clamps invalid max direction elements to one", () => {
        const layout = computeSubplotGridLayout(5, {
            limitDirection: "columns",
            maxDirectionElements: 0,
        });

        expect(layout.numRows).toBe(5);
        expect(layout.numCols).toBe(1);
    });

    it("preserves the default columns-first auto layout", () => {
        const layout = computeSubplotGridLayout(5);

        expect(layout.numRows).toBe(2);
        expect(layout.numCols).toBe(3);
    });

    it("supports rows-first auto layout", () => {
        const layout = computeSubplotGridLayout(5, {
            autoLayoutDirection: "rows",
        });

        expect(layout.numRows).toBe(3);
        expect(layout.numCols).toBe(2);
    });

    it("preserves the default maximum column cap", () => {
        const layout = computeSubplotGridLayout(9);

        expect(layout.numRows).toBe(3);
        expect(layout.numCols).toBe(3);
    });
});
