// Publish recorded story videos under stable, slug-based filenames for local preview / the Azure upload.
//
// Playwright's own output folder names are auto-generated from the test title (and truncated with a
// hash for long titles), so they aren't a stable basis for in-app video links. Instead, each story
// declares a stable `slug` via `tutorialMeta(...)` and the recording fixture writes that slug into the
// per-test `narration.json` (tests/e2e/support/narration.ts). This scans test-results/ for those
// manifests — the same on-disk source support/add-narration.mjs uses — and, for each recorded tutorial,
// copies the narrated video (produced by add-narration.mjs), the thumbnail and the steps file into a flat
// `<slug>.webm` / `<slug>.png` / `<slug>.steps.json` under frontend/public/tutorial-videos (which Vite
// serves locally and CI uploads to Azure from). Reading from disk rather than the Playwright JSON report
// lets this run inside the recording run's global teardown, before the report is finalized; a filtered
// single-story run simply finds one manifest and publishes just that story.
//
// Called in-process from the recording run's global teardown (tests/e2e/setup/globalTeardown.ts).

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(scriptDir, "../../..");
const RESULTS_DIR = resolve(FRONTEND_ROOT, "test-results");
// Publish under public/ so Vite serves recordings locally and CI uploads them to Azure from here.
const PUBLISH_DIR = resolve(FRONTEND_ROOT, "public/tutorial-videos");
const MANIFEST_NAME = "narration.json";
const NARRATED_SUFFIX = ".narrated.webm";
const THUMBNAIL_NAME = "thumbnail.png";
const STEPS_SUFFIX = ".steps.json";

/** Test-results folders that hold a narration manifest (one per recorded story). */
function findManifestDirs(root: string): string[] {
    if (!existsSync(root)) {
        return [];
    }
    return readdirSync(root)
        .map((entry) => join(root, entry))
        .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, MANIFEST_NAME)));
}

/** Locate the video to publish in a folder, preferring the ffmpeg-narrated version over the silent original. */
function resolveVideoFile(dir: string): string | null {
    const webmFiles = readdirSync(dir).filter((name) => name.endsWith(".webm"));
    const narrated = webmFiles.find((name) => name.endsWith(NARRATED_SUFFIX));
    if (narrated) {
        return join(dir, narrated);
    }
    const source = webmFiles.find((name) => !name.endsWith(NARRATED_SUFFIX));
    return source ? join(dir, source) : null;
}

/** The steps file add-narration.mjs writes is keyed off the source video name (foo.webm -> foo.steps.json). */
function resolveStepsFile(videoFile: string): string {
    return videoFile.replace(/\.narrated\.webm$/, ".webm").replace(/\.webm$/, STEPS_SUFFIX);
}

/** Publish every recorded tutorial found under test-results/ into the flat, slug-named publish dir. */
export function publishTutorials(): void {
    const manifestDirs = findManifestDirs(RESULTS_DIR);
    if (manifestDirs.length === 0) {
        console.info("[publish-tutorials] No recorded tutorials found in test-results; nothing to publish.");
        return;
    }

    mkdirSync(PUBLISH_DIR, { recursive: true });

    let publishedCount = 0;
    for (const dir of manifestDirs) {
        const manifest = JSON.parse(readFileSync(join(dir, MANIFEST_NAME), "utf-8")) as { slug?: string };
        const slug = manifest.slug;
        if (!slug) {
            // Not a tutorial story (or recorded before slugs were persisted); skip it.
            continue;
        }

        const videoFile = resolveVideoFile(dir);
        if (!videoFile) {
            console.warn(`[publish-tutorials] ⚠️  Skipping "${slug}": no recorded video found in ${dir}.`);
            continue;
        }

        const thumbnailFile = join(dir, THUMBNAIL_NAME);
        if (!existsSync(thumbnailFile)) {
            console.warn(
                `[publish-tutorials] ⚠️  Skipping "${slug}": thumbnail not found (add a captureThumbnail(page) call).`,
            );
            continue;
        }

        copyFileSync(videoFile, join(PUBLISH_DIR, `${slug}.webm`));
        copyFileSync(thumbnailFile, join(PUBLISH_DIR, `${slug}.png`));
        const stepsFile = resolveStepsFile(videoFile);
        if (existsSync(stepsFile)) {
            copyFileSync(stepsFile, join(PUBLISH_DIR, `${slug}${STEPS_SUFFIX}`));
        }
        publishedCount += 1;
        console.info(`[publish-tutorials] ✅ Published "${slug}".`);
    }

    console.info(`[publish-tutorials] Done (${publishedCount} tutorial(s) published to ${PUBLISH_DIR}).`);
}
