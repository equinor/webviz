import {
    // convertRealizationNumbersToRealizationNumberSelections,
    createBestSuggestedRealizationNumberSelections,
} from "@framework/components/EnsembleRealizationFilter/private-utils/conversionUtils";

import { describe, expect, test } from "vitest";

describe("createBestSuggestedRealizationNumberSelections", () => {
    test("should return an empty array when realizationNumbers is empty", () => {
        const realizationNumbers: number[] = [];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([]);
    });

    test("should return a single number selection when there is only one realization number", () => {
        const realizationNumbers: number[] = [5];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([5]);
    });

    test("should return a single range selection when realization numbers are consecutive", () => {
        const realizationNumbers: number[] = [1, 2, 3, 4, 5];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([{ start: 1, end: 5 }]);
    });

    test("should return multiple number selections when realization numbers are not consecutive", () => {
        const realizationNumbers: number[] = [1, 3, 5];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([1, 3, 5]);
    });

    test("should return a mix of number and range selections", () => {
        const realizationNumbers: number[] = [1, 2, 3, 5, 7, 8, 9];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([{ start: 1, end: 3 }, 5, { start: 7, end: 9 }]);
    });

    test("should handle large number selections", () => {
        const realizationNumbers: number[] = [1000000, 1000001, 1000002, 2000000];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([{ start: 1000000, end: 1000002 }, 2000000]);
    });

    test("should handle duplicate realization numbers", () => {
        const realizationNumbers: number[] = [1, 2, 2, 3, 4, 4, 5];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([{ start: 1, end: 5 }]);
    });

    test("should handle a single range selection where start and end are the same", () => {
        const realizationNumbers: number[] = [4, 4];
        const result = createBestSuggestedRealizationNumberSelections(realizationNumbers);
        expect(result).toEqual([4]);
    });
});

// describe("convertRealizationNumbersToRealizationNumberSelections", () => {
//     test("should return best suggested selections when existingSelections is null", () => {
//         const realizationNumbers: number[] = [1, 2, 3, 5, 7, 8, 9];
//         const existingSelections: RealizationNumberSelection[] | null = null;
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 1, end: 3 }, 5, { start: 7, end: 9 }]);
//     });

//     test("should extend existing range selections if possible", () => {
//         const realizationNumbers: number[] = [1, 2, 3, 4, 5, 6, 7];
//         const existingSelections: RealizationNumberSelection[] = [{ start: 2, end: 4 }];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 1, end: 7 }]);
//     });

//     test("should add new selections for numbers not in existing selections", () => {
//         const realizationNumbers: number[] = [1, 2, 3, 5, 7];
//         const existingSelections: RealizationNumberSelection[] = [{ start: 1, end: 2 }];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 1, end: 3 }, 5, 7]);
//     });

//     test("should add new selections for number between two existing selections", () => {
//         const realizationNumbers: number[] = [1, 2, 3, 4, 5, 7];
//         const existingSelections: RealizationNumberSelection[] = [
//             { start: 1, end: 2 },
//             { start: 4, end: 5 },
//         ];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 1, end: 3 }, { start: 4, end: 5 }, 7]);
//     });

//     test("should handle a mix of single number and range selections", () => {
//         const realizationNumbers: number[] = [1, 2, 3, 5, 7, 8, 9];
//         const existingSelections: RealizationNumberSelection[] = [1, { start: 7, end: 8 }];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([1, { start: 2, end: 3 }, 5, { start: 7, end: 9 }]);
//     });

//     test("should handle large number selections", () => {
//         const realizationNumbers: number[] = [1000000, 1000001, 1000002, 2000000];
//         const existingSelections: RealizationNumberSelection[] = [{ start: 1000000, end: 1000001 }];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 1000000, end: 1000002 }, 2000000]);
//     });

//     test("should handle duplicate realization numbers", () => {
//         const realizationNumbers: number[] = [1, 2, 2, 3, 4, 4, 5];
//         const existingSelections: RealizationNumberSelection[] = [{ start: 1, end: 2 }];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 1, end: 5 }]);
//     });

//     test("should handle a single range selection where start and end are the same", () => {
//         const realizationNumbers: number[] = [4, 4];
//         const existingSelections: RealizationNumberSelection[] = [{ start: 4, end: 4 }];
//         const result = convertRealizationNumbersToRealizationNumberSelections(realizationNumbers, existingSelections);
//         expect(result).toEqual([{ start: 4, end: 4 }]);
//     });
// });
