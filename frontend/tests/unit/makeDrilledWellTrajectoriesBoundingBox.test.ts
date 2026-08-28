import { describe, expect, test } from "vitest";

import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";

describe("makeDrilledWellTrajectoriesBoundingBox", () => {
    test("returns null for an empty trajectory array", () => {
        const args = {
            getData: () => [],
        } as unknown as Parameters<typeof makeDrilledWellTrajectoriesBoundingBox>[0];

        expect(makeDrilledWellTrajectoriesBoundingBox(args)).toBeNull();
    });
});