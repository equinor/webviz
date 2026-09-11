import { describe, expect, test } from "vitest";

import { getEvaluationRangeError } from "@modules/EconomicScreening/view/atoms/derivedAtoms";

describe("getEvaluationRangeError", () => {
    test("rejects an ordered range that contains neither production nor costs", () => {
        expect(getEvaluationRangeError([2020, 2021], { firstYear: 2030, lastYear: 2031 })).toBe(
            "The evaluation range contains no production or cost years.",
        );
    });

    test("accepts a cost-only year before production", () => {
        expect(getEvaluationRangeError([2019, 2020, 2021], { firstYear: 2019, lastYear: 2019 })).toBeNull();
    });
});