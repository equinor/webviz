/**
 * Seed an authenticated session and write the Playwright storage state to disk, without running any
 * test. Handy before `playwright codegen` so the recorded browser starts logged in.
 *
 * Requires the docker stack to be running (it seeds via `docker compose exec backend-primary`).
 * Run with Node's native TypeScript support: `node tests/e2e/setup/seedStorageState.ts`.
 */
import { STORAGE_STATE_PATH, seedSession, writeStorageState } from "./globalSetup.ts";

writeStorageState(seedSession());
console.log(`Wrote authenticated storage state to ${STORAGE_STATE_PATH}`);
