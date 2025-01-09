import { describe, expect, it } from "vitest";

import { countTrueValues } from "../../src/framework/utils/objectUtils";

describe("countTrueValues", () => {
    it("should return 0 for an empty object", () => {
        const result = countTrueValues({});
        expect(result).toBe(0);
    });

    it("should return 0 when all values are false", () => {
        const result = countTrueValues({ a: false, b: false, c: false });
        expect(result).toBe(0);
    });

    it("should return the correct count of true values", () => {
        const result = countTrueValues({ a: true, b: false, c: true });
        expect(result).toBe(2);
    });

    it("should return the correct count when all values are true", () => {
        const result = countTrueValues({ a: true, b: true, c: true });
        expect(result).toBe(3);
    });

    it("should handle mixed true and false values correctly", () => {
        const result = countTrueValues({ a: true, b: false, c: true, d: false });
        expect(result).toBe(2);
    });
});
