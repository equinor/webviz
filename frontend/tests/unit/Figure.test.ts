import { describe, expect, it } from "vitest";

import { calcNumRowsAndCols } from "@modules/_shared/Figure";

describe("calcNumRowsAndCols", () => {
    it("uses a single cell for zero, negative, or one subplot", () => {
        expect(calcNumRowsAndCols(-1)).toEqual({ numRows: 1, numCols: 1 });
        expect(calcNumRowsAndCols(0)).toEqual({ numRows: 1, numCols: 1 });
        expect(calcNumRowsAndCols(1)).toEqual({ numRows: 1, numCols: 1 });
    });

    it("grows into a roughly square grid", () => {
        expect(calcNumRowsAndCols(4)).toEqual({ numRows: 2, numCols: 2 });
        expect(calcNumRowsAndCols(5)).toEqual({ numRows: 3, numCols: 2 });
    });
});
