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
    if (result.status !== 0) {
        // Muxing is a post-processing nicety; never fail the whole run over it.
        console.warn(`Narration muxing exited with status ${result.status}.`);
    }

    // Keep the persisted audio cache bounded so orphaned clips can't accumulate across runs.
    pruneNarrationCache();
}

export default globalTeardown;
