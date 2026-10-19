import { describe, expect, test } from "vitest";

import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

describe("volumeStringUtils", () => {
    test("describes a known response", () => {
        expect(createHoverTextForVolume("STOIIP")).toBe("Stock tank oil initially in place [Sm³]");
    });

    test("includes the composition of a calculated response", () => {
        expect(createHoverTextForVolume("STOIIP_TOTAL")).toBe(
            "Stock tank oil initially in place (total) [Sm³]. Calculated as STOIIP + ASSOCIATEDOIL.",
        );
        expect(createHoverTextForVolume("GIIP_TOTAL")).toBe(
            "Gas initially in place (total) [Sm³]. Calculated as GIIP + ASSOCIATEDGAS.",
        );
    });

    test("falls back to the response name", () => {
        expect(createHoverTextForVolume("UNKNOWN_RESPONSE")).toBe("UNKNOWN_RESPONSE");
    });
});
