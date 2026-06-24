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
    caseName: "2026-06-12_drogon_ahm_with_hydrostatic_check",
    caseUuid: "e7f117b6-29fe-488f-989c-dbbc9bd03f09",
    ensembleName: "iter-0",
} as const;
