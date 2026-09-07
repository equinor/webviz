import type { QueryClient } from "@tanstack/query-core";
import { describe, expect, test, vi } from "vitest";

import { IntersectionType } from "@framework/types/intersection";
import { makeIntersectionPolylineWithSectionLengthsPromise } from "@modules/_shared/Intersection/intersectionPolylineUtils";

describe("makeIntersectionPolylineWithSectionLengthsPromise", () => {
    test("rejects with a clear error when a planned wellbore has no trajectory", async () => {
        const queryClient = {
            fetchQuery: vi.fn().mockResolvedValue([]),
        } as unknown as QueryClient;

        const result = makeIntersectionPolylineWithSectionLengthsPromise(
            {
                type: IntersectionType.WELLBORE,
                wellboreUuid: "planned-wellbore-uuid",
                extensionLength: 0,
                fieldIdentifier: "FIELD",
                isPlanned: true,
            },
            queryClient,
            new AbortController().signal,
        );

        await expect(result).rejects.toThrow("No trajectory found for wellbore planned-wellbore-uuid");
    });
});