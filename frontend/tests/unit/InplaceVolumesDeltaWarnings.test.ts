import { describe, expect, test } from "vitest";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    makeDeltaRealizationAlignmentWarnings,
    makeDeltaRealizationCountWarnings,
} from "@modules/_shared/ensembleDeltaWarnings";
import {
    makeDroppedFluidSelectionWarnings,
    makeUnmatchedDeltaRowWarnings,
} from "@modules/_shared/InplaceVolumes/deltaEnsembleWarnings";

const COMPARISON = new RegularEnsembleIdent("11111111-1111-4111-8111-111111111111", "comparison");
const REFERENCE = new RegularEnsembleIdent("22222222-2222-4222-8222-222222222222", "reference");

describe("makeDeltaRealizationAlignmentWarnings", () => {
    test("warns that matching realization numbers does not establish sample alignment", () => {
        const warnings = makeDeltaRealizationAlignmentWarnings(
            [COMPARISON, new DeltaEnsembleIdent(COMPARISON, REFERENCE)],
            new EnsembleSet([]),
        );

        expect(warnings).toEqual([
            'Delta ensemble "(comparison) - (reference)" pairs comparison and reference by realization number. ' +
                "Distribution statistics are only meaningful when those realizations represent aligned samples.",
        ]);
    });
});

describe("makeUnmatchedDeltaRowWarnings", () => {
    test("identifies the delta, table, fluid, and rows excluded from each side", () => {
        const warnings = makeUnmatchedDeltaRowWarnings(
            [
                {
                    ensembleIdent: new DeltaEnsembleIdent(COMPARISON, REFERENCE),
                    tableName: "geogrid",
                    rows: [{ fluidSelection: "oil", comparisonOnlyRowCount: 2, referenceOnlyRowCount: 3 }],
                },
            ],
            new EnsembleSet([]),
        );

        expect(warnings).toEqual([
            'Delta ensemble "(comparison) - (reference)" (geogrid, oil): ' +
                "2 comparison and 3 reference rows had no matching selector tuple and were excluded.",
        ]);
    });
});

describe("delta warning display names", function displayNameTests() {
    function makeEnsembles(customName: string | null, referenceRealizations = [1, 2]) {
        const comparison = new RegularEnsemble(
            "asset",
            [],
            COMPARISON.getCaseUuid(),
            "case",
            "comparison",
            "column",
            [0, 1, 2],
            [],
            null,
            null,
            "red",
        );
        const reference = new RegularEnsemble(
            "asset",
            [],
            REFERENCE.getCaseUuid(),
            "case",
            "reference",
            "column",
            referenceRealizations,
            [],
            null,
            null,
            "blue",
        );
        const delta = new DeltaEnsemble(comparison, reference, "green", customName);
        return { ident: delta.getIdent(), ensembleSet: new EnsembleSet([comparison, reference], [delta]) };
    }

    test.each(["Updated model", null])(
        "uses the display name %s in all warning types",
        function usesDisplayName(customName) {
            const { ident, ensembleSet } = makeEnsembles(customName);
            const name = customName ?? ident.getEnsembleName();
            const warnings = [
                ...makeDeltaRealizationAlignmentWarnings([ident], ensembleSet),
                ...makeDeltaRealizationCountWarnings([ident], ensembleSet),
                ...makeDroppedFluidSelectionWarnings(
                    [
                        {
                            ensembleIdent: ident,
                            tableName: "geogrid",
                            fluidSelections: [{ fluidSelection: "oil", missingFrom: "comparison" }],
                        },
                    ],
                    ensembleSet,
                ),
                ...makeUnmatchedDeltaRowWarnings(
                    [
                        {
                            ensembleIdent: ident,
                            tableName: "geogrid",
                            rows: [{ fluidSelection: "oil", comparisonOnlyRowCount: 1, referenceOnlyRowCount: 0 }],
                        },
                    ],
                    ensembleSet,
                ),
            ];
            expect(warnings).toHaveLength(4);
            for (const warning of warnings) {
                expect(warning).toContain(`Delta ensemble "${name}"`);
            }
            expect(warnings[1]).toContain("using the 2 realizations shared");
        },
    );

    test("does not warn about counts for identical realization sets or missing sources", function checksRealizationCounts() {
        const { ident, ensembleSet } = makeEnsembles("Updated model", [0, 1, 2]);
        expect(makeDeltaRealizationCountWarnings([ident], ensembleSet)).toEqual([]);
        expect(makeDeltaRealizationCountWarnings([ident], new EnsembleSet([]))).toEqual([]);
    });
});
