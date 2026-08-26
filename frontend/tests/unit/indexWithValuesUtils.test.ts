import { describe, expect, test } from "vitest";

import { FixupSelection } from "@lib/utils/fixupUserSelection";
import {
    fixupUserSelectedIndexValues,
    orderSelectedIndexValues,
} from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";

describe("orderSelectedIndexValues", () => {
    test("orders selected values according to the backend-provided order", () => {
        const availableValues = ["Valysar", "Therys", "Volon"];

        expect(orderSelectedIndexValues(["Volon", "Valysar"], availableValues)).toEqual(["Valysar", "Volon"]);
    });

    test("drops values that are no longer available", () => {
        expect(orderSelectedIndexValues(["Volon", "Unknown"], ["Valysar", "Volon"])).toEqual(["Volon"]);
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
