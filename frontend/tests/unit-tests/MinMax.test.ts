import { MinMax } from "@lib/utils/MinMax";

describe("MinMax tests", () => {
    test("Check validity of MinMax instances", () => {
        expect(new MinMax(0, 1).isValid()).toBe(true);
        expect(new MinMax(-1, -1).isValid()).toBe(true);
        expect(new MinMax(0, Number.POSITIVE_INFINITY).isValid()).toBe(true);
        expect(new MinMax(Number.NEGATIVE_INFINITY, 0).isValid()).toBe(true);

        expect(MinMax.createInvalid().isValid()).toBe(false);
        expect(new MinMax(1, 0).isValid()).toBe(false);
        expect(new MinMax(0, Number.NaN).isValid()).toBe(false);
        expect(new MinMax(Number.NaN, 0).isValid()).toBe(false);
        expect(new MinMax(Number.NaN, Number.NaN).isValid()).toBe(false);
    });

    test("Check construction from numeric values", () => {
        expect(MinMax.fromNumericValues([]).isValid()).toBe(false);
        expect(MinMax.fromNumericValues([1])).toEqual(new MinMax(1, 1));
        expect(MinMax.fromNumericValues([0, 1, 2, 3, 4])).toEqual(new MinMax(0, 4));

        expect(MinMax.fromNumericValues(new Float32Array([0, 1, 2, 3, 4]))).toEqual(new MinMax(0, 4));
        expect(MinMax.fromNumericValues(new Set<number>([0, 1, 2, 3, 4]))).toEqual(new MinMax(0, 4));

        const bogusArray = [1, undefined, 2, Number.NaN, 3, 4];
        expect(MinMax.fromNumericValues(bogusArray as number[])).toEqual(new MinMax(1, 4));
    });

    test("Check extending by another MinMax object", () => {
        const validMinMaxA = new MinMax(0, 1);
        const validMinMaxB = new MinMax(10, 11);
        const invalidMinMax = MinMax.createInvalid();

        expect(validMinMaxA.extendedBy(validMinMaxA)).toEqual(validMinMaxA);
        expect(invalidMinMax.extendedBy(validMinMaxA)).toEqual(validMinMaxA);
        expect(validMinMaxA.extendedBy(invalidMinMax)).toEqual(validMinMaxA);

        expect(validMinMaxA.extendedBy(validMinMaxB)).toEqual(new MinMax(0, 11));

        expect(invalidMinMax.extendedBy(invalidMinMax).isValid()).toBe(false);
    });
});
