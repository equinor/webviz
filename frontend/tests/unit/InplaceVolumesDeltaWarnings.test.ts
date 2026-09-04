import { describe, expect, test } from "vitest";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    makeDeltaRealizationAlignmentWarnings,
    makeUnmatchedDeltaRowWarnings,
} from "@modules/_shared/InplaceVolumes/deltaEnsembleWarnings";

const COMPARISON = new RegularEnsembleIdent("11111111-1111-4111-8111-111111111111", "comparison");
const REFERENCE = new RegularEnsembleIdent("22222222-2222-4222-8222-222222222222", "reference");

describe("makeDeltaRealizationAlignmentWarnings", () => {
    test("warns that matching realization numbers does not establish sample alignment", () => {
        const warnings = makeDeltaRealizationAlignmentWarnings([
            COMPARISON,
            new DeltaEnsembleIdent(COMPARISON, REFERENCE),
        ]);

        expect(warnings).toEqual([
            'Delta ensemble "(comparison) - (reference)" pairs comparison and reference by realization number. ' +
                "Distribution statistics are only meaningful when those realizations represent aligned samples.",
        ]);
    });
});

describe("makeUnmatchedDeltaRowWarnings", () => {
    test("identifies the delta, table, fluid, and rows excluded from each side", () => {
        const warnings = makeUnmatchedDeltaRowWarnings([
            {
                ensembleIdent: new DeltaEnsembleIdent(COMPARISON, REFERENCE),
                tableName: "geogrid",
                rows: [{ fluidSelection: "oil", comparisonOnlyRowCount: 2, referenceOnlyRowCount: 3 }],
            },
        ]);

        expect(warnings).toEqual([
            'Delta ensemble "(comparison) - (reference)" (geogrid, oil): ' +
                "2 comparison and 3 reference rows had no matching selector tuple and were excluded.",
        ]);
    });
});