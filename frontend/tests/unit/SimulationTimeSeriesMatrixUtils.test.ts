import { scaleHexColorLightness } from "@modules/SimulationTimeSeriesMatrix/utils/colorUtils";
import { joinStringArrayToHumanReadableString } from "@modules/SimulationTimeSeriesMatrix/utils/stringUtils";

import { describe, expect, test } from "vitest";

describe("Test of utility functions for SimulationTimeSeriesMatrix module", () => {
    test("Test join string array to human readable string", () => {
        expect(joinStringArrayToHumanReadableString(["a", "b", "c"])).toBe("a, b and c");
        expect(joinStringArrayToHumanReadableString(["a"])).toBe("a");
        expect(joinStringArrayToHumanReadableString([])).toBe("");
        expect(joinStringArrayToHumanReadableString(["a", "b"])).toBe("a and b");
    });

    test("Test color scaling", () => {
        expect(scaleHexColorLightness("#ff0000", 1.0)).toBe("#ff0000");
    });
});
