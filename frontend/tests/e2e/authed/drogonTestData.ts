/**
 * Shared test data for the authenticated e2e tests.
 *
 * These values describe a well-known Drogon case in Sumo (prod) and mirror the constants used by
 * the backend integration tests (see backend_py/primary/tests/integration/conftest.py). The
 * seeded e2e session reads this data from Sumo using the on-disk shared key.
 */
export const DROGON_AHM = {
    assetName: "Drogon",
    fieldIdentifier: "DROGON",
    caseName: "webviz_ahm_case",
    caseUuid: "485041ce-ad72-48a3-ac8c-484c0ed95cf8",
    ensembleName: "iter-0",
} as const;
