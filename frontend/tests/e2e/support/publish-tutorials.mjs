#!/usr/bin/env node
// Publish recorded story videos under stable, slug-based filenames for the Azure Blob upload step.
//
// Playwright's own output folder names are auto-generated from the test title (and truncated with a
// hash for long titles), so they aren't a stable basis for in-app video links. Instead, each story
// declares a stable `slug` via `tutorialMeta(...)` (tests/e2e/support/tutorialMeta.ts) and attaches it
// to its test result as a "tutorial-slug" annotation. This script reads the Playwright JSON report
// (tests/e2e/_playwright.config.ts writes one when RECORD=1) to find, per slug, the recorded video
// (preferring the narrated version produced by support/add-narration.mjs) and thumbnail, and copies
// them into a flat `frontend/tutorial-publish/<slug>.webm` / `<slug>.png` for upload.
//
// Run after a RECORD=1 test run (and its global teardown, which mux in narration) has finished:
//   node tests/e2e/support/publish-tutorials.mjs

import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import fastGlob from "fast-glob";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(scriptDir, "../../..");
const STORIES_DIR = resolve(scriptDir, "../stories");
const REPORT_PATH = resolve(FRONTEND_ROOT, "test-results/report.json");
const PUBLISH_DIR = resolve(FRONTEND_ROOT, "tutorial-publish");
const PARSE_TUTORIAL_META_PATH = resolve(FRONTEND_ROOT, "scripts/lib/parseTutorialMeta.js");
const NARRATED_SUFFIX = ".narrated.webm";
const THUMBNAIL_NAME = "thumbnail.png";

/** Flatten a Playwright JSON report's suite tree into a list of {slug, videoPath} per test. */
function collectSlugToVideoPath(report) {
    const bySlug = new Map();

    function visitSuite(suite) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                const lastResult = test.results?.at(-1);
                const annotations = test.annotations ?? lastResult?.annotations ?? [];
                const slugAnnotation = annotations.find((a) => a.type === "tutorial-slug");
                if (!slugAnnotation) {
                    continue;
                }
                const videoAttachment = lastResult?.attachments?.find((a) => a.name === "video");
                if (videoAttachment?.path) {
                    bySlug.set(slugAnnotation.description, videoAttachment.path);
                }
            }
        }
        for (const child of suite.suites ?? []) {
            visitSuite(child);
        }
    }

    for (const suite of report.suites ?? []) {
        visitSuite(suite);
    }
    return bySlug;
}

/** Prefer the ffmpeg-narrated video over Playwright's original silent recording. */
function resolveVideoFile(videoPath) {
    const narratedPath = videoPath.replace(/\.webm$/, NARRATED_SUFFIX);
    if (existsSync(narratedPath)) {
        return narratedPath;
    }
    return existsSync(videoPath) ? videoPath : null;
}

async function main() {
    if (!existsSync(REPORT_PATH)) {
        console.error(`[publish-tutorials] ❌ No JSON report found at ${REPORT_PATH}. Run with RECORD=1 first.`);
        process.exit(1);
    }

    const { parseTutorialMeta } = await import(pathToFileURL(PARSE_TUTORIAL_META_PATH).href);
    const storyFiles = await fastGlob("[^_]*.test.ts", { cwd: STORIES_DIR, absolute: true });
    const declaredSlugs = storyFiles.map((file) => parseTutorialMeta(file).slug).sort();

    const report = JSON.parse(readFileSync(REPORT_PATH, "utf-8"));
    const slugToVideoPath = collectSlugToVideoPath(report);

    mkdirSync(PUBLISH_DIR, { recursive: true });

    const errors = [];
    for (const slug of declaredSlugs) {
        const videoPath = slugToVideoPath.get(slug);
        if (!videoPath) {
            errors.push(`"${slug}": no test result with a "tutorial-slug" annotation/video was found in the report.`);
            continue;
        }

        const videoFile = resolveVideoFile(videoPath);
        if (!videoFile) {
            errors.push(`"${slug}": recorded video not found on disk (expected near ${videoPath}).`);
            continue;
        }

        const thumbnailFile = join(dirname(videoPath), THUMBNAIL_NAME);
        if (!existsSync(thumbnailFile)) {
            errors.push(`"${slug}": thumbnail not found at ${thumbnailFile} (add a captureThumbnail(page) call).`);
            continue;
        }

        copyFileSync(videoFile, join(PUBLISH_DIR, `${slug}.webm`));
        copyFileSync(thumbnailFile, join(PUBLISH_DIR, `${slug}.png`));
        console.log(`[publish-tutorials] ✅ Published "${slug}" (${readdirSync(PUBLISH_DIR).length} file(s) so far).`);
    }

    if (errors.length > 0) {
        console.error("[publish-tutorials] ❌ Failed to publish one or more declared tutorials:");
        for (const message of errors) {
            console.error(`  - ${message}`);
        }
        process.exit(1);
    }
}

main();
