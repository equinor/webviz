import runGlobalSetup, { STORAGE_STATE_PATH } from "./globalSetup.ts";

// Run via `npm run test:e2e:seed`. Seeds a synthetic authenticated session and
// writes storageState.json, so `playwright codegen` can start logged in without requiring manual login.
await runGlobalSetup();
console.info(`Wrote authenticated storage state to ${STORAGE_STATE_PATH}`);
