import { describe, expect, test } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { getAllEnsembleRealizationNumbers } from "@modules/EconomicScreening/view/atoms/queryAtoms";

function makeEnsemble() {
    return new RegularEnsemble(
        "Asset",
        [],
        "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "Case",
        "Ensemble",
        "stratigraphic-column",
        [1, 2, 3],
        [],
        null,
        [],
        "#000000",
    );
}

describe("getAllEnsembleRealizationNumbers", () => {
    test("uses the full ensemble population rather than a filtered subset", () => {
        const ensemble = makeEnsemble();
        const ensembleSet = new EnsembleSet([ensemble]);

        expect(getAllEnsembleRealizationNumbers(ensemble.getIdent(), ensembleSet)).toEqual([1, 2, 3]);
    });

    test("returns null without a selected ensemble", () => {
        expect(getAllEnsembleRealizationNumbers(null, new EnsembleSet([]))).toBeNull();
    });
});
