import runGlobalSetup, { STORAGE_STATE_PATH } from "./globalSetup.ts";

// Standalone entry point (run via `npm run test:e2e:seed`) that seeds an authenticated session and
// writes storageState.json, so `playwright codegen` can start logged in without running the suite.
await runGlobalSetup();
console.info(`Wrote authenticated storage state to ${STORAGE_STATE_PATH}`);
