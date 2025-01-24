import { UseQueryResult } from "@tanstack/react-query";

import { describe, expect, it } from "vitest";

import { mergeResults } from "../../../src/modules/WellLogViewer/utils/queries";

describe("mergeResults", () => {
    it("should merge results correctly when all queries are successful", () => {
        const queryResults: UseQueryResult<number>[] = [
            { data: 1, isLoading: false, isSuccess: true, isFetched: true },
            { data: 2, isLoading: false, isSuccess: true, isFetched: true },
        ] as UseQueryResult<number>[];

        const result = mergeResults(queryResults);

        expect(result.data).toEqual([1, 2]);
        expect(result.isLoading).toBe(false);
        expect(result.isSuccess).toBe(true);
        expect(result.isFetched).toBe(true);
    });

    it("should return loading state if any query is loading", () => {
        const queryResults: UseQueryResult<number>[] = [
            { data: 1, isLoading: true, isSuccess: false, isFetched: false },
            { data: 2, isLoading: false, isSuccess: true, isFetched: true },
        ] as UseQueryResult<number>[];

        const result = mergeResults(queryResults);

        expect(result.isLoading).toBe(true);
        expect(result.isSuccess).toBe(false);
        expect(result.isFetched).toBe(false);
        expect(result.data).toBe(undefined);
    });

    it("should return error state if any query has an error", () => {
        const queryResults: UseQueryResult<number>[] = [
            { data: 1, isLoading: false, isSuccess: true, isFetched: true },
            { error: new Error("Test error"), isLoading: false, isSuccess: false, isFetched: false },
        ] as UseQueryResult<number>[];

        const result = mergeResults(queryResults);

        expect(result.error).toEqual(new Error("Test error"));
        expect(result.isLoading).toBe(false);
        expect(result.isSuccess).toBe(false);
        expect(result.isFetched).toBe(false);
        expect(result.data).toBe(undefined);
    });

    it("should apply data transform if provided", () => {
        const queryResults: UseQueryResult<number>[] = [
            { data: 1, isLoading: false, isSuccess: true, isFetched: true },
            { data: 2, isLoading: false, isSuccess: true, isFetched: true },
        ] as UseQueryResult<number>[];

        const dataTransform = (data: number[]) => data.map((x) => x * 2);

        const result = mergeResults(queryResults, dataTransform);

        expect(result.data).toEqual([2, 4]);
        expect(result.isLoading).toBe(false);
        expect(result.isSuccess).toBe(true);
        expect(result.isFetched).toBe(true);
    });
});
