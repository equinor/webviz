import { expect, test } from "@playwright/experimental-ct-react";

import { GpuResourceBoundaryHarness } from "./support/GpuResourceBoundaryHarness";

const MSG = "The browser has stopped this visualization.";

test.use({ viewport: { width: 800, height: 600 } });

test.describe("GpuResourceBoundary", () => {
    test("overlay appears on loss; 'remount' recovery swaps in a fresh renderer", async ({ mount }) => {
        const cmp = await mount(<GpuResourceBoundaryHarness recoveryStrategy="remount" />);
        const before = await cmp.getByTestId("renderer").textContent();

        await expect(cmp.getByRole("button", { name: "Restore" })).toBeHidden();

        await cmp.getByTestId("lose").click();
        await expect(cmp.getByText(MSG, { exact: true })).toBeVisible();

        await cmp.getByRole("button", { name: "Restore" }).click();
        await expect(cmp.getByText(MSG, { exact: true })).toBeHidden();
        await expect(cmp.getByTestId("renderer")).not.toHaveText(before ?? ""); // remounted
    });

    test("'redraw' keeps the overlay until webglcontextrestored, then repaints the same canvas", async ({
        mount,
    }) => {
        const cmp = await mount(
            <GpuResourceBoundaryHarness recoveryStrategy="redraw" restoreContextResult={true} />,
        );
        const before = await cmp.getByTestId("renderer").textContent();

        await cmp.getByTestId("lose").click();
        await cmp.getByRole("button", { name: "Restore" }).click();

        await expect(cmp.getByText(MSG, { exact: true })).toBeVisible(); // still up, no remount
        await expect(cmp.getByTestId("renderer")).toHaveText(before ?? "");

        await cmp.getByTestId("restored").click();
        await expect(cmp.getByText(MSG, { exact: true })).toBeHidden();
        await expect(cmp.getByTestId("render-count")).toHaveText("1"); // requestRender() once
        await expect(cmp.getByTestId("renderer")).toHaveText(before ?? ""); // same instance
    });

    test("'redraw' falls back to a remount when webglcontextrestored never arrives", async ({ mount }) => {
        test.slow(); // waits out REDRAW_RESTORE_TIMEOUT_MS (2s)
        const cmp = await mount(
            <GpuResourceBoundaryHarness recoveryStrategy="redraw" restoreContextResult={true} />,
        );
        const before = await cmp.getByTestId("renderer").textContent();

        await cmp.getByTestId("lose").click();
        await cmp.getByRole("button", { name: "Restore" }).click();
        await expect(cmp.getByText(MSG, { exact: true })).toBeVisible();

        await expect(cmp.getByText(MSG, { exact: true })).toBeHidden({ timeout: 5000 });
        await expect(cmp.getByTestId("renderer")).not.toHaveText(before ?? ""); // remounted
    });

    test("auto-restores when the tab becomes visible again after a background loss", async ({ mount, page }) => {
        const cmp = await mount(<GpuResourceBoundaryHarness recoveryStrategy="remount" />);
        const before = await cmp.getByTestId("renderer").textContent();

        await page.evaluate(() => {
            Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
            document.dispatchEvent(new Event("visibilitychange"));
        });
        await cmp.getByTestId("lose").click();
        await expect(cmp.getByText(MSG, { exact: true })).toBeVisible();

        await page.evaluate(() => {
            Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
            document.dispatchEvent(new Event("visibilitychange"));
        });
        await expect(cmp.getByText(MSG, { exact: true })).toBeHidden();
        await expect(cmp.getByTestId("renderer")).not.toHaveText(before ?? "");
    });
});
