import { describe, expect, test } from "vitest";

import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";

describe("formatInplaceVolumesValue", () => {
    test("uses upward-only SI scaling", () => {
        expect(formatInplaceVolumesValue(12_340_000)).toBe("12.3 M");
        expect(formatInplaceVolumesValue(0.25)).toBe("0.25");
        expect(formatInplaceVolumesValue(0.00234)).toBe("0.00234");
    });

    test("handles non-numeric values", () => {
        expect(formatInplaceVolumesValue(null)).toBe("-");
        expect(formatInplaceVolumesValue("N/A")).toBe("N/A");
        expect(formatInplaceVolumesValue(Number.NaN)).toBe("-");
        expect(formatInplaceVolumesValue(Infinity)).toBe("-");
        expect(formatInplaceVolumesValue(-Infinity)).toBe("-");
    });
});