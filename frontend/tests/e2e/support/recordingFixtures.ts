import { test as base } from "@playwright/test";

import { NOOP_NARRATOR, Narrator, type NarratorLike, preloadNarrationModel, terminateNarrationWorker } from "./narration";
import { RECORDING } from "./walkthroughHelpers";

/**
 * Playwright test extended with voiceover narration for the recorded walkthroughs.
 *
 * Import `test` and `narrate` from here instead of "@playwright/test" to get a `narrate(text)`
 * helper (see {@link Narrator}). When not recording (RECORD unset) everything is a no-op, so the
 * same test still runs at full speed as a plain regression check.
 */

type NarrationFixtures = {
    /** Speak `text` over the recording; see Narrator.narrate for the await-now / await-later usage. */
    narrate: (text: string) => Promise<void>;
    /** Add a step at the current position in the recording. */
    markStep: (title: string) => void;
    narrator: NarratorLike;
};

type NarrationWorkerFixtures = {
    /** Loads the TTS model once per worker, before any page/video exists, so it isn't recorded. */
    narrationModel: void;
};

export const test = base.extend<NarrationFixtures, NarrationWorkerFixtures>({
    narrationModel: [
        async ({}, use) => {
            if (RECORDING) {
                await preloadNarrationModel();
            }
            await use();
            if (RECORDING) {
                await terminateNarrationWorker();
            }
        },
        { scope: "worker", auto: true },
    ],

    narrator: async ({ page: _page }, use, testInfo) => {
        if (!RECORDING) {
            await use(NOOP_NARRATOR);
            return;
        }
        const narrator = new Narrator(testInfo.outputDir);
        // The page (and its recording) has just been created, so this is ~frame zero of the video.
        narrator.markRecordingStart();
        await use(narrator);
        narrator.flush();
    },

    narrate: async ({ narrator }, use) => {
        await use((text: string) => narrator.narrate(text));
    },

    markStep: async ({ narrator }, use) => {
        await use((title: string) => narrator.markStep(title));
    },
});

export { expect } from "@playwright/test";
