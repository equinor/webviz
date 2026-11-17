import { describe, expect, test } from "vitest";

import { mergeLayersOfViews } from "@modules/_shared/components/SubsurfaceViewer/_utils/mergeLayersOfViews";

function layers(...ids: string[]) {
    return ids.map((id) => ({ id }));
}

describe("mergeLayersOfViews", () => {
    test.each([
        {
            case: "shared layers above the views' own layers",
            views: [
                ["Shared", "A"],
                ["Shared", "B"],
            ],
        },
        {
            case: "shared layers below the views' own layers",
            views: [
                ["A", "Shared"],
                ["B", "Shared"],
            ],
        },
        {
            case: "shared layers between the views' own layers",
            views: [
                ["Top", "A", "Middle", "Bottom"],
                ["Top", "Middle", "B", "Bottom"],
            ],
        },
    ])("keeps the order of every view, with $case", ({ views }) => {
        const merged = mergeLayersOfViews(views.map((ids) => layers(...ids)));

        for (const viewIds of views) {
            const mergedIdsOfView = merged.map((layer) => layer.id).filter((id) => viewIds.includes(id));
            expect(mergedIdsOfView).toEqual(viewIds);
        }
    });

    test("adds every layer once", () => {
        const merged = mergeLayersOfViews([layers("A", "Shared"), layers("Shared", "B"), layers("Shared")]);

        expect(merged.map((layer) => layer.id).sort()).toEqual(["A", "B", "Shared"]);
    });
});
