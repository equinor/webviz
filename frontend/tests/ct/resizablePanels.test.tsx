import React from "react";

import { ResizablePanels } from "@lib/components/ResizablePanels";
import { expect, test } from "@playwright/experimental-ct-react";

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe("ResizablePanels", () => {
    test("Renders properly", async ({ mount }) => {
        const resizablePanels = await mount(
            <div className="w-full h-screen">
                <ResizablePanels direction="horizontal" id="resizable-panels-test">
                    <div id="1" />
                    <div id="2" />
                    <div id="3" />
                </ResizablePanels>
            </div>
        );

        const resizablePanelById = await resizablePanels.locator("#resizable-panels-test");
        await expect(resizablePanelById).toBeVisible();
    });
});
