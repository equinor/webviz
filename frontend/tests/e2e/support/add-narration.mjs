// Muxes the per-test voiceover clips into each recorded walkthrough video.
//
// After a RECORD=1 Playwright run, every test folder under test-results/ that contains a
// `narration.json` (written by tests/e2e/support/narration.ts) also holds the recorded `*.webm`
// video and the synthesized `narration-*.wav` clips. This script overlays each clip onto the video
// at its recorded timestamp with ffmpeg and writes a `*.narrated.webm` alongside the silent original.
//
// Run via the Playwright global teardown (tests/e2e/setup/globalTeardown.ts) or directly:
//   node tests/e2e/support/add-narration.mjs [testResultsDir]

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RESULTS_DIR = resolve(scriptDir, "../../../test-results");
const MANIFEST_NAME = "narration.json";
const NARRATED_SUFFIX = ".narrated.webm";
const CHAPTERS_SUFFIX = ".chapters.json";

function ffmpegAvailable() {
    const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return !result.error && result.status === 0;
}

function findManifestDirs(root) {
    if (!existsSync(root)) {
        return [];
    }
    return readdirSync(root)
        .map((entry) => join(root, entry))
        .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, MANIFEST_NAME)));
}

/** The recorded video in a folder: the first .webm that isn't one we produced. */
function findSourceVideo(dir) {
    const candidates = readdirSync(dir).filter(
        (name) => name.endsWith(".webm") && !name.endsWith(NARRATED_SUFFIX),
    );
    return candidates.length > 0 ? join(dir, candidates[0]) : null;
}

/** Build the ffmpeg argument list that overlays the delayed clips onto the video. */
function buildFfmpegArgs(videoPath, clips, outputPath) {
    // Trim the video's blank/loading lead-in by starting at the first narration clip.
    const trimStartMs = Math.max(0, Math.min(...clips.map((clip) => clip.startMs)));

    const args = ["-y"];
    if (trimStartMs > 0) {
        args.push("-ss", (trimStartMs / 1000).toFixed(3));
    }
    args.push("-i", videoPath);
    for (const clip of clips) {
        args.push("-i", join(dirname(videoPath), clip.file));
    }

    // Delay each clip's audio to its start time (relative to the trimmed video), then mix them into
    // a single track. normalize=0 keeps each clip at full volume; dropout_transition=0 avoids ramps.
    const filters = [];
    const mixLabels = [];
    clips.forEach((clip, index) => {
        const inputIndex = index + 1; // 0 is the video
        const label = `a${index}`;
        const delayMs = Math.max(0, Math.round(clip.startMs - trimStartMs));
        filters.push(`[${inputIndex}:a]adelay=${delayMs}:all=1[${label}]`);
        mixLabels.push(`[${label}]`);
    });
    filters.push(
        `${mixLabels.join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0[aout]`,
    );

    args.push(
        "-filter_complex",
        filters.join(";"),
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:v",
        "libvpx-vp9",
        "-crf",
        "32",
        "-b:v",
        "0",
        "-g",
        "50",
        "-deadline",
        "good",
        "-cpu-used",
        "4",
        "-row-mt",
        "1",
        "-c:a",
        "libopus",
        outputPath,
    );
    return args;
}

function writeChapters(videoPath, chapters, trimStartMs) {
    const chaptersPath = videoPath.replace(/\.webm$/, CHAPTERS_SUFFIX);
    if (!chapters || chapters.length === 0) {
        rmSync(chaptersPath, { force: true });
        return;
    }
    const normalized = chapters.map((chapter) => ({
        title: chapter.title,
        startSeconds: Math.max(0, chapter.startMs - trimStartMs) / 1000,
    }));
    writeFileSync(chaptersPath, JSON.stringify({ chapters: normalized }, null, 2));
}

/** Mux one folder's clips into its video. Returns true on success, false on any failure. */
function narrateFolder(dir) {
    const manifestPath = join(dir, MANIFEST_NAME);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const clips = manifest.clips ?? [];
    const chapters = manifest.chapters ?? [];
    if (clips.length === 0) {
        const videoPath = findSourceVideo(dir);
        if (videoPath) {
            writeChapters(videoPath, chapters, 0);
        }
        return true;
    }

    const videoPath = findSourceVideo(dir);
    if (!videoPath) {
        console.error(`  [narration] No source video found in ${dir}.`);
        return false;
    }

    const outputPath = videoPath.replace(/\.webm$/, NARRATED_SUFFIX);
    const args = buildFfmpegArgs(videoPath, clips, outputPath);
    const result = spawnSync("ffmpeg", args, { encoding: "utf-8" });
    if (result.error || result.status !== 0) {
        console.error(`  [narration] ffmpeg failed for ${videoPath}:\n${result.stderr ?? result.error}`);
        return false;
    }
    const trimStartMs = Math.max(0, Math.min(...clips.map((clip) => clip.startMs)));
    writeChapters(videoPath, chapters, trimStartMs);
    console.log(`  [narration] Wrote ${outputPath} (${clips.length} clip(s)).`);
    return true;
}

function main() {
    const resultsDir = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_RESULTS_DIR;

    const manifestDirs = findManifestDirs(resultsDir);
    if (manifestDirs.length === 0) {
        console.log(`[narration] No narration manifests found under ${resultsDir}; nothing to mux.`);
        return;
    }

    if (!ffmpegAvailable()) {
        console.error("[narration] ffmpeg not found on PATH; cannot mux voiceover into the recordings.");
        process.exitCode = 1;
        return;
    }

    console.log(`[narration] Muxing voiceover into ${manifestDirs.length} recording(s).`);
    let failures = 0;
    for (const dir of manifestDirs) {
        if (!narrateFolder(dir)) {
            failures += 1;
        }
    }
    if (failures > 0) {
        console.error(`[narration] ${failures} of ${manifestDirs.length} recording(s) failed to mux.`);
        process.exitCode = 1;
    }
}

main();
