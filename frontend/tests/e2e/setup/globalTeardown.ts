import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { pruneNarrationCache } from "../support/narration";

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Global teardown: after a recording run, mux the synthesized voiceover clips into each recorded
 * video (see support/add-narration.mjs). No-op unless RECORD is set, so normal runs are unaffected.
 */
async function globalTeardown(): Promise<void> {
    if (!process.env.RECORD) {
        return;
    }

    const scriptPath = resolve(currentDir, "../support/add-narration.mjs");
    const result = spawnSync(process.execPath, [scriptPath], { stdio: "inherit" });

    // Keep the persisted audio cache bounded so orphaned clips can't accumulate across runs.
    pruneNarrationCache();

    // Fail the run on a muxing error so a later upload step can't publish silent/incomplete videos.
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`Narration muxing failed (exit code ${result.status}); recordings may be silent or incomplete.`);
    }
}

export default globalTeardown;
