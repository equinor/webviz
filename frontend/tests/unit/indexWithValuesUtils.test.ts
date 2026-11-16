import { describe, expect, test } from "vitest";

import { FixupSelection } from "@lib/utils/fixupUserSelection";
import {
    filterAndOrderSelectedIndexValues,
    fixupUserSelectedIndexValues,
} from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";

describe("filterAndOrderSelectedIndexValues", () => {
    test("orders selected values according to the backend-provided order", () => {
        const availableValues = ["Valysar", "Therys", "Volon"];

        expect(filterAndOrderSelectedIndexValues(["Volon", "Valysar"], availableValues)).toEqual([
            "Valysar",
            "Volon",
        ]);
    });

    test("drops values that are no longer available", () => {
        expect(filterAndOrderSelectedIndexValues(["Volon", "Unknown"], ["Valysar", "Volon"])).toEqual([
            "Volon",
        ]);
    });

    test("orders persisted selections according to available values during fixup", () => {
        expect(
            fixupUserSelectedIndexValues(
                [{ indexColumn: "ZONE", values: ["Volon", "Valysar"] }],
                [{ indexColumn: "ZONE", values: ["Valysar", "Therys", "Volon"] }],
                FixupSelection.SELECT_ALL,
            ),
        ).toEqual([{ indexColumn: "ZONE", values: ["Valysar", "Volon"] }]);
    });
});
