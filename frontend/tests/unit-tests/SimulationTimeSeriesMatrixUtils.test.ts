// import { scaleHexColorLightness } from "@modules/SimulationTimeSeriesMatrix/utils/colorUtils";
import { makeDisplayStringFromStringArray } from "@modules/SimulationTimeSeriesMatrix/utils/stringUtils";

describe("Test of utility functions for SimulationTimeSeriesMatrix module", () => {
    test("Test make display string from string array", () => {
        expect(makeDisplayStringFromStringArray(["a", "b", "c"])).toBe("a, b and c");
        expect(makeDisplayStringFromStringArray(["a"])).toBe("a");
        expect(makeDisplayStringFromStringArray([])).toBe("");
        expect(makeDisplayStringFromStringArray(["a", "b"])).toBe("a and b");
    });
});
