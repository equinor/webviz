import { describe, expect, test } from "vitest";

import { makeWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeWellTrajectoriesBoundingBox";

describe("makeDrilledWellTrajectoriesBoundingBox", () => {
    test("returns null for an empty trajectory array", () => {
        const args = {
            getData: () => [],
        } as unknown as Parameters<typeof makeWellTrajectoriesBoundingBox>[0];

        expect(makeWellTrajectoriesBoundingBox(args)).toBeNull();
    });
});
