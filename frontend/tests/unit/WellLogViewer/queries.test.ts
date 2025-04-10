import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { mergeResults } from "../../../src/modules/WellLogViewer/utils/queries";

describe("mergeResults", () => {
    it("should merge results correctly when all queries are successful", () => {
        const queryResults = [
            { data: 1, isPending: false, isSuccess: true, isError: false },
            { data: 2, isPending: false, isSuccess: true, isError: false },
        ] as UseQueryResult<number>[];

        const result = mergeResults(queryResults);

        expect(result.data).toEqual([1, 2]);
        expect(result.isPending).toBe(false);
        expect(result.isSuccess).toBe(true);
        expect(result.isError).toBe(false);
    });

    it("should return loading state if any query is loading", () => {
        const queryResults = [
            { data: 1, isPending: true, isSuccess: false, isError: false },
            { data: 2, isPending: false, isSuccess: true, isError: false },
        ] as UseQueryResult<number>[];

        const result = mergeResults(queryResults);

        expect(result.data).toBe(undefined);
        expect(result.isPending).toBe(true);
        expect(result.isSuccess).toBe(false);
        expect(result.isError).toBe(false);
    });

    it("should return error state if any query has an error", () => {
        const queryResults = [
            { isPending: false, isSuccess: true, isError: false, data: 1 },
            { isPending: false, isSuccess: false, isError: true, error: new Error("Test error") },
        ] as UseQueryResult<number>[];

        const result = mergeResults(queryResults);

        expect(result.error).toEqual(new Error("Test error"));
        expect(result.isError).toBe(true);
        expect(result.isPending).toBe(false);
        expect(result.isSuccess).toBe(false);
        expect(result.data).toBe(undefined);
    });

    it("should apply data transform if provided", () => {
        const queryResults = [
            { data: 1, isPending: false, isSuccess: true, isError: false },
            { data: 2, isPending: false, isSuccess: true, isError: false },
        ] as UseQueryResult<number>[];

        const dataTransform = (data: number[]) => data.map((x) => x * 2);

        const result = mergeResults(queryResults, dataTransform);

        expect(result.data).toEqual([2, 4]);
        expect(result.isPending).toBe(false);
        expect(result.isSuccess).toBe(true);
        expect(result.isError).toBe(false);
    });
});
