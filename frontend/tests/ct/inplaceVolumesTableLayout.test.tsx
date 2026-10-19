import { expect, test } from "@playwright/experimental-ct-react";

import {
    ALL_STATISTIC_LABELS,
    FOUR_RESULT_NAMES,
    makeResponsesAsRowsFixture,
    makeSensitivityStatisticalFixture,
    makeWideStatisticalFixture,
} from "./support/inplaceVolumesTableFixtures";
import { InplaceVolumesTableHarness } from "./support/InplaceVolumesTableHarness";
import { readDownloadAsString } from "./support/readDownload";

test.use({ viewport: { width: 1200, height: 800 } });

const NUM_ROWS = 12;

test.describe("InplaceVolumesTable layout", () => {
    test("many statistics overflow horizontally", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, FOUR_RESULT_NAMES, ALL_STATISTIC_LABELS);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        const scrollContainer = cmp.locator(".overflow-auto").first();
        const { scrollWidth, clientWidth } = await scrollContainer.evaluate((el) => ({
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
        }));

        expect(scrollWidth).toBeGreaterThan(clientWidth);

        // When overflowing, every leaf (including those under a spanning group header) gets its declared width
        const leafWidths = await cmp.locator('thead th[role="button"]').evaluateAll((cells) =>
            cells.map((cell) => ({
                declared: Number(cell.getAttribute("width")),
                actual: cell.getBoundingClientRect().width,
            })),
        );
        expect(leafWidths).toHaveLength(2 + FOUR_RESULT_NAMES.length * ALL_STATISTIC_LABELS.length);
        for (const { declared, actual } of leafWidths) {
            expect(Math.abs(actual - declared)).toBeLessThanOrEqual(1);
        }
    });

    test("no header or result value is truncated", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, FOUR_RESULT_NAMES, ALL_STATISTIC_LABELS);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );
        await expect(cmp.locator("tbody td.text-right").first()).toBeVisible();

        // Sortable header cells are exactly the leaf headers
        const leafHeaders = cmp.locator('thead th[role="button"]');
        await expect(leafHeaders).toHaveCount(2 + FOUR_RESULT_NAMES.length * ALL_STATISTIC_LABELS.length);
        const truncatedHeaders = await leafHeaders.evaluateAll((cells) =>
            cells
                .filter((cell) => cell.scrollWidth > cell.clientWidth)
                .map((cell) => `${cell.childNodes[0]?.textContent}: ${cell.scrollWidth} > ${cell.clientWidth}`),
        );
        expect(truncatedHeaders).toEqual([]);

        const firstRowResultCells = cmp.locator("tbody tr", { has: cmp.locator("td.text-right") }).first();
        const truncatedValues = await firstRowResultCells
            .locator("td.text-right")
            .evaluateAll((cells) =>
                cells
                    .filter((cell) => cell.scrollWidth > cell.clientWidth)
                    .map((cell) => `${cell.textContent}: ${cell.scrollWidth} > ${cell.clientWidth}`),
            );
        expect(truncatedValues).toEqual([]);
    });

    test("a long result group header over a single statistic is not truncated", async ({ mount }) => {
        const longResultNames = ["ASSOCIATEDGAS", "ASSOCIATEDOIL", "STOIIP_TOTAL", "STOIIP"];
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, longResultNames, ["Mean"]);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );
        await expect(cmp.getByText("ASSOCIATEDGAS")).toBeVisible();

        // Group headers are the non-sortable header cells
        const truncatedGroupHeaders = await cmp
            .locator("thead th:not([role])")
            .evaluateAll((cells) =>
                cells
                    .filter((cell) => cell.scrollWidth > cell.clientWidth)
                    .map((cell) => `${cell.childNodes[0]?.textContent}: ${cell.scrollWidth} > ${cell.clientWidth}`),
            );
        expect(truncatedGroupHeaders).toEqual([]);
    });

    test("identifier columns stay pinned while scrolling horizontally", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, FOUR_RESULT_NAMES, ALL_STATISTIC_LABELS);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        const zoneHeader = cmp.getByRole("button", { name: "ZONE" });
        const zoneBodyCell = cmp.locator("tbody td", { hasText: "Valysar" }).first();
        const resultHeader = cmp.getByRole("button", { name: "Mean" }).first();
        await expect(zoneBodyCell).toBeVisible();

        const zoneHeaderBefore = await zoneHeader.boundingBox();
        const zoneBodyBefore = await zoneBodyCell.boundingBox();
        const resultHeaderBefore = await resultHeader.boundingBox();

        await cmp
            .locator(".overflow-auto")
            .first()
            .evaluate((el) => {
                el.scrollLeft = el.scrollWidth;
            });

        const zoneHeaderAfter = await zoneHeader.boundingBox();
        const zoneBodyAfter = await zoneBodyCell.boundingBox();
        const resultHeaderAfter = await resultHeader.boundingBox();

        expect(Math.abs((zoneHeaderAfter?.x ?? NaN) - (zoneHeaderBefore?.x ?? NaN))).toBeLessThanOrEqual(1);
        expect(Math.abs((zoneBodyAfter?.x ?? NaN) - (zoneBodyBefore?.x ?? NaN))).toBeLessThanOrEqual(1);
        expect(resultHeaderAfter?.x ?? NaN).toBeLessThan(resultHeaderBefore?.x ?? NaN);
    });

    test("few statistics fit without horizontal scroll and pinned columns do not overlap", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, ["STOIIP"], ["Mean", "P10", "P90"]);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );
        await expect(cmp.getByRole("button", { name: "ZONE" })).toBeVisible();

        const { scrollWidth, clientWidth } = await cmp
            .locator(".overflow-auto")
            .first()
            .evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

        // The stretched table renders pinned columns wider than requested; sticky offsets must not pull the
        // second pinned column back over the first
        const tableNameHeaderLocator = cmp.getByRole("button", { name: "TABLE_NAME" });
        const declaredTableNameWidth = Number(await tableNameHeaderLocator.getAttribute("width"));
        const tableNameHeader = await tableNameHeaderLocator.boundingBox();
        const zoneHeader = await cmp.getByRole("button", { name: "ZONE" }).boundingBox();
        expect(tableNameHeader).not.toBeNull();
        expect(zoneHeader).not.toBeNull();
        expect(tableNameHeader!.width).toBeGreaterThan(declaredTableNameWidth + 1);
        expect(zoneHeader!.x).toBeGreaterThanOrEqual(tableNameHeader!.x + tableNameHeader!.width - 1);
    });

    test("constant columns are summarised above the table but still exported", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, ["STOIIP"], ["Mean", "P10", "P90"]);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        await expect(cmp.getByRole("button", { name: "ZONE" })).toBeVisible();
        await expect(cmp.getByRole("button", { name: "ENSEMBLE" })).toHaveCount(0);
        await expect(cmp.getByRole("button", { name: "FLUID" })).toHaveCount(0);

        await expect(cmp.getByText("ENSEMBLE: ens1")).toBeVisible();
        await expect(cmp.getByText("FLUID: gas + oil + water")).toBeVisible();

        const downloadPromise = page.waitForEvent("download");
        await cmp.getByRole("button", { name: "Download CSV" }).click();
        const content = await readDownloadAsString(await downloadPromise);

        expect(content.split("\n")[0].startsWith("ENSEMBLE,TABLE_NAME,FLUID,ZONE,")).toBe(true);
    });

    test("the constant-columns caption wraps instead of truncating on narrow modules", async ({ mount, page }) => {
        await page.setViewportSize({ width: 240, height: 800 });
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, ["STOIIP"], ["Mean", "P10", "P90"]);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        const caption = cmp.getByText("ENSEMBLE: ens1");
        await expect(caption).toBeVisible();
        await expect(caption).toContainText("FLUID: gas + oil + water");

        const { isClipped, heightInFontSizes } = await caption.evaluate((el) => {
            const fontSizePx = parseFloat(getComputedStyle(el).fontSize);
            return {
                isClipped: el.scrollWidth > el.clientWidth,
                heightInFontSizes: el.getBoundingClientRect().height / fontSizePx,
            };
        });
        expect(isClipped).toBe(false);
        // A single line is roughly 1.2–1.6 font-sizes tall; two or more lines are clearly above that
        expect(heightInFontSizes).toBeGreaterThan(2);
    });

    test("only visible identifier columns have a filter input", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, FOUR_RESULT_NAMES, ALL_STATISTIC_LABELS);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        await expect(cmp.getByLabel(/^Filter /)).toHaveCount(2);
        await expect(cmp.getByLabel("Filter TABLE_NAME")).toBeVisible();
        await expect(cmp.getByLabel("Filter ZONE")).toBeVisible();
    });

    test("a filter on a column that becomes hidden is dropped", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, ["STOIIP"], ["Mean"]);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        await cmp.getByLabel("Filter ZONE").fill("Valysar");
        await expect(cmp.getByText(`4 of ${NUM_ROWS} rows`)).toBeVisible();

        const constantZoneRows = rows.map((row) => ({ ...row, ZONE: "Valysar" }));
        await cmp.update(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={constantZoneRows} />,
        );
        await expect(cmp.getByLabel("Filter ZONE")).toHaveCount(0);
        await expect(cmp.getByText(`${NUM_ROWS} rows`, { exact: true })).toBeVisible();

        await cmp.update(<InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />);
        await expect(cmp.getByLabel("Filter ZONE")).toHaveValue("");
        await expect(cmp.getByText(`${NUM_ROWS} rows`, { exact: true })).toBeVisible();
    });

    test("statistic headers follow the fixture order", async ({ mount }) => {
        const { columnsConfig, rows } = makeWideStatisticalFixture(NUM_ROWS, ["STOIIP"], ALL_STATISTIC_LABELS);
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        // The label is the first child; the always-mounted sort badge would add its own text
        const headerLabels = await cmp
            .locator('thead th[role="button"]')
            .evaluateAll((cells) => cells.map((cell) => cell.childNodes[0]?.textContent ?? ""));
        const statisticHeaders = headerLabels.filter((label) => ALL_STATISTIC_LABELS.includes(label));

        expect(statisticHeaders).toEqual(ALL_STATISTIC_LABELS);
    });
});

test.describe("InplaceVolumesTable responses as rows", () => {
    const NUM_BASE_ROWS = 6;

    function makeRowsLayoutHarness() {
        const { columnsConfig, rows } = makeResponsesAsRowsFixture(
            NUM_BASE_ROWS,
            FOUR_RESULT_NAMES,
            ALL_STATISTIC_LABELS,
        );
        return (
            <InplaceVolumesTableHarness
                mode="statistical"
                columnsConfig={columnsConfig}
                rows={rows}
                sortScopeColumnKey="RESPONSE"
            />
        );
    }

    test("many responses and statistics fit without horizontal scroll", async ({ mount }) => {
        const cmp = await mount(makeRowsLayoutHarness());
        await expect(cmp.getByRole("button", { name: "RESPONSE" })).toBeVisible();

        const { scrollWidth, clientWidth } = await cmp
            .locator(".overflow-auto")
            .first()
            .evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test("sorting by Mean ranks within each response", async ({ mount, page }) => {
        const cmp = await mount(makeRowsLayoutHarness());

        // The shared Table cycles NONE -> DESC -> ASC, so one click sorts descending
        const meanHeader = cmp.getByRole("button", { name: "Mean" });
        await meanHeader.click();
        await expect(meanHeader).toHaveClass(/text-accent-subtle/);

        const downloadPromise = page.waitForEvent("download");
        await cmp.getByRole("button", { name: "Download CSV" }).click();
        const content = await readDownloadAsString(await downloadPromise);

        const [header, ...dataLines] = content.split("\n");
        const columns = header.split(",");
        const responseIndex = columns.indexOf("RESPONSE");
        const meanIndex = columns.indexOf("Mean");
        const records = dataLines.map((line) => line.split(","));

        expect(records).toHaveLength(NUM_BASE_ROWS * FOUR_RESULT_NAMES.length);

        const expectedResponses = FOUR_RESULT_NAMES.flatMap((name) => Array(NUM_BASE_ROWS).fill(name));
        expect(records.map((record) => record[responseIndex])).toEqual(expectedResponses);

        for (const response of FOUR_RESULT_NAMES) {
            const means = records
                .filter((record) => record[responseIndex] === response)
                .map((record) => Number(record[meanIndex]));
            expect(means).toEqual(means.toSorted((a, b) => b - a));
            expect(new Set(means).size).toBe(NUM_BASE_ROWS);
        }
    });

    test("CSV header includes the hidden constant columns and flat statistics", async ({ mount, page }) => {
        const cmp = await mount(makeRowsLayoutHarness());

        const downloadPromise = page.waitForEvent("download");
        await cmp.getByRole("button", { name: "Download CSV" }).click();
        const content = await readDownloadAsString(await downloadPromise);

        expect(content.split("\n")[0]).toBe("ENSEMBLE,TABLE_NAME,FLUID,ZONE,RESPONSE,Mean,Stddev,P10,P90,Min,Max");
    });
});

test.describe("InplaceVolumesTable sensitivity column", () => {
    const CASE_LABELS = ["rms_seed", "faults:low", "faults:high"];

    test("SENSITIVITY is pinned with the other identifier columns", async ({ mount }) => {
        const { columnsConfig, rows } = makeSensitivityStatisticalFixture(
            NUM_ROWS,
            CASE_LABELS,
            FOUR_RESULT_NAMES,
            ALL_STATISTIC_LABELS,
        );
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        const sensitivityHeader = cmp.getByRole("button", { name: "SENSITIVITY" });
        const sensitivityBodyCell = cmp.locator("tbody td", { hasText: "faults:low" }).first();
        await expect(sensitivityBodyCell).toBeVisible();

        const headerBefore = await sensitivityHeader.boundingBox();
        const bodyBefore = await sensitivityBodyCell.boundingBox();

        await cmp
            .locator(".overflow-auto")
            .first()
            .evaluate((el) => {
                el.scrollLeft = el.scrollWidth;
            });

        const headerAfter = await sensitivityHeader.boundingBox();
        const bodyAfter = await sensitivityBodyCell.boundingBox();

        expect(Math.abs((headerAfter?.x ?? NaN) - (headerBefore?.x ?? NaN))).toBeLessThanOrEqual(1);
        expect(Math.abs((bodyAfter?.x ?? NaN) - (bodyBefore?.x ?? NaN))).toBeLessThanOrEqual(1);
    });

    test("a single case moves SENSITIVITY to the constant caption", async ({ mount }) => {
        const { columnsConfig, rows } = makeSensitivityStatisticalFixture(
            NUM_ROWS,
            ["faults:high"],
            ["STOIIP"],
            ["Mean", "P10", "P90"],
        );
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        await expect(cmp.getByRole("button", { name: "ZONE" })).toBeVisible();
        await expect(cmp.getByRole("button", { name: "SENSITIVITY" })).toHaveCount(0);
        await expect(cmp.getByText("SENSITIVITY: faults:high")).toBeVisible();
    });

    test("CSV header contains SENSITIVITY after FLUID", async ({ mount, page }) => {
        const { columnsConfig, rows } = makeSensitivityStatisticalFixture(
            NUM_ROWS,
            CASE_LABELS,
            ["STOIIP"],
            ["Mean", "P10", "P90"],
        );
        const cmp = await mount(
            <InplaceVolumesTableHarness mode="statistical" columnsConfig={columnsConfig} rows={rows} />,
        );

        const downloadPromise = page.waitForEvent("download");
        await cmp.getByRole("button", { name: "Download CSV" }).click();
        const content = await readDownloadAsString(await downloadPromise);

        expect(content.split("\n")[0].startsWith("ENSEMBLE,TABLE_NAME,FLUID,SENSITIVITY,ZONE,")).toBe(true);
    });
});
