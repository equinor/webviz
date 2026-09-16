import { expect, test } from "@playwright/experimental-ct-react";
import type { Download } from "@playwright/test";

import { makeRealizationFixture, makeStatisticalFixture } from "./support/inplaceVolumesTableFixtures";
import { InplaceVolumesTableHarness } from "./support/InplaceVolumesTableHarness";

test.use({ viewport: { width: 1200, height: 800 } });

async function readDownloadAsString(download: Download): Promise<string> {
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString("utf-8");
}

test.describe("InplaceVolumesTable CSV download", () => {
    test("realization download contains all rows, including off-screen virtualized ones", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeRealizationFixture(500);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="realization" columnsConfig={columnsConfig} rows={rows} />,
        );

        const button = cmp.getByRole("button", { name: "Download data" });
        const downloadPromise = page.waitForEvent("download");
        await button.click();
        const download = await downloadPromise;

        const content = await readDownloadAsString(download);
        const lines = content.split("\n");

        expect(lines.length).toBe(1 + 500);
        expect(lines[0]).toBe("ENSEMBLE,TABLE_NAME,FLUID,REAL,ZONE,STOIIP");
    });

    test("statistical download has a single flattened header row", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeStatisticalFixture(10);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        const button = cmp.getByRole("button", { name: "Download data" });
        const downloadPromise = page.waitForEvent("download");
        await button.click();
        const download = await downloadPromise;

        const content = await readDownloadAsString(download);
        const lines = content.split("\n");

        expect(lines[0]).toBe("ENSEMBLE,TABLE_NAME,FLUID,ZONE,STOIIP_Mean,STOIIP_P10,STOIIP_P90");
        expect(lines[1]).toMatch(/^ens1,geogrid,oil,/);
    });

    test("filter is respected in the download", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeRealizationFixture(30);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="realization" columnsConfig={columnsConfig} rows={rows} />,
        );

        // Leaf order: ENSEMBLE, TABLE_NAME, FLUID, REAL, ZONE, STOIIP -> ZONE filter is the 5th input
        const zoneFilterInput = cmp.getByPlaceholder("Filter values...").nth(4);
        await zoneFilterInput.fill("Valysar");

        // 30 rows cycling through 3 zones -> 10 rows match "Valysar"; the filter is debounced 250ms, so poll for
        // the actual filtered count rather than `> 0`, which is trivially true before the debounce fires.
        // (`tbody tr` also includes a non-matching virtualization placeholder row, so match on visible text.)
        await expect.poll(() => cmp.locator("tbody tr", { hasText: "Valysar" }).count(), { timeout: 2000 }).toBe(10);

        const button = cmp.getByRole("button", { name: "Download data" });
        const downloadPromise = page.waitForEvent("download");
        await button.click();
        const download = await downloadPromise;

        const content = await readDownloadAsString(download);
        const lines = content.split("\n").slice(1);

        expect(lines.length).toBe(10);
        for (const line of lines) {
            expect(line).toContain("Valysar");
        }
    });

    test("sort is respected in the download", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeRealizationFixture(9);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="realization" columnsConfig={columnsConfig} rows={rows} />,
        );

        await cmp.getByRole("button", { name: "ZONE" }).click();

        const button = cmp.getByRole("button", { name: "Download data" });
        const downloadPromise = page.waitForEvent("download");
        await button.click();
        const download = await downloadPromise;

        const content = await readDownloadAsString(download);
        const firstDataLine = content.split("\n")[1];

        // The shared Table cycles NONE -> DESC -> ASC, so the first click sorts descending;
        // alphabetically last zone among ["Valysar", "Therys", "Volon"] is "Volon".
        expect(firstDataLine).toContain("Volon");
    });

    test("zero rows disables the download button", async ({ mount }) => {
        const { columnsConfig, rows } = makeRealizationFixture(10);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="realization" columnsConfig={columnsConfig} rows={rows} />,
        );

        const zoneFilterInput = cmp.getByPlaceholder("Filter values...").nth(4);
        await zoneFilterInput.fill("NonExistentZone");

        await expect(cmp.getByText("No data found")).toBeVisible();

        const button = cmp.getByRole("button", { name: "Download data" });
        await expect(button).toBeDisabled();
    });

    test("filename matches the expected pattern", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeRealizationFixture(5);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="realization" columnsConfig={columnsConfig} rows={rows} />,
        );

        const button = cmp.getByRole("button", { name: "Download data" });
        const downloadPromise = page.waitForEvent("download");
        await button.click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(
            /^InplaceVolumesTable_(Realizations|Statistics)_\d{8}_\d{6}\.csv$/,
        );
    });

    test("toolbar does not break the sticky header", async ({ mount }) => {
        const { columnsConfig, rows } = makeRealizationFixture(200);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="realization" columnsConfig={columnsConfig} rows={rows} />,
        );

        const headerCell = cmp.getByRole("button", { name: "ZONE" });
        const before = await headerCell.boundingBox();

        const scrollContainer = cmp.locator(".overflow-auto").first();
        await scrollContainer.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
        });

        const after = await headerCell.boundingBox();

        expect(before).not.toBeNull();
        expect(after).not.toBeNull();
        expect(after?.y).toBe(before?.y);
    });
});
