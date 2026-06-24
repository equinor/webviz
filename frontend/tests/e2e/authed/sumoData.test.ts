import { expect, test } from "@playwright/test";

import { DROGON_AHM } from "./drogonTestData";

/**
 * Verifies that the seeded authenticated session can fetch real data from Sumo through the
 * backend. These checks exercise the same `explore` endpoints that the ensemble/case selection
 * dialog uses to populate its lists, so they confirm that the case picker would show real Drogon
 * cases.
 *
 * Sumo can occasionally be slow, so we allow a generous timeout for these data-backed requests.
 */
test.describe("Authenticated Sumo data", () => {
    test.slow();

    test("lists the Drogon asset", async ({ page }) => {
        const response = await page.request.get("/api/asset_infos");
        expect(response.ok()).toBeTruthy();

        const assets = (await response.json()) as Array<{ name: string }>;
        expect(assets.some((asset) => asset.name === DROGON_AHM.assetName)).toBe(true);
    });

    test("lists the Drogon AHM case with its ensemble", async ({ page }) => {
        const response = await page.request.get("/api/cases", {
            params: { asset_name: DROGON_AHM.assetName },
        });
        expect(response.ok()).toBeTruthy();

        const cases = (await response.json()) as Array<{
            uuid: string;
            name: string;
            ensembles: Array<{ name: string }>;
        }>;

        const ahmCase = cases.find((c) => c.uuid === DROGON_AHM.caseUuid);
        expect(ahmCase, `Expected to find Drogon case ${DROGON_AHM.caseName}`).toBeDefined();
        expect(ahmCase?.name).toBe(DROGON_AHM.caseName);
        expect(ahmCase?.ensembles.some((ens) => ens.name === DROGON_AHM.ensembleName)).toBe(true);
    });

    test("loads simulation timeseries vectors for the Drogon ensemble", async ({ page }) => {
        const response = await page.request.get("/api/timeseries/vector_list/", {
            params: {
                case_uuid: DROGON_AHM.caseUuid,
                ensemble_name: DROGON_AHM.ensembleName,
            },
        });
        expect(response.ok()).toBeTruthy();

        const vectors = (await response.json()) as Array<{ name: string }>;
        // A real Drogon ensemble exposes many summary vectors; assert we got a non-empty list.
        expect(vectors.length).toBeGreaterThan(0);
    });
});
