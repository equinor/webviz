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
const STEPS_SUFFIX = ".steps.json";
const CAPTIONS_SUFFIX = ".vtt";

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
        // The seek index is written at the end of a WebM by default,
        // which a streaming player never reaches unless it downloads the whole file
        "-cues_to_front",
        "1",
        outputPath,
    );
    return args;
}

function writeSteps(videoPath, steps, trimStartMs) {
    const stepsPath = videoPath.replace(/\.webm$/, STEPS_SUFFIX);
    if (!steps || steps.length === 0) {
        rmSync(stepsPath, { force: true });
        return;
    }
    const normalized = steps.map((step) => ({
        title: step.title,
        startSeconds: Math.max(0, step.startMs - trimStartMs) / 1000,
    }));
    writeFileSync(stepsPath, JSON.stringify({ steps: normalized }, null, 2));
}

/** Format a millisecond offset as a WebVTT timestamp (HH:MM:SS.mmm). */
function formatVttTimestamp(totalMs) {
    const ms = Math.max(0, Math.round(totalMs));
    const pad = (value, width = 2) => String(value).padStart(width, "0");
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms % 1000, 3)}`;
}

/** Write a WebVTT caption track (one cue per narration clip) on the same trimmed timeline as the video. */
function writeCaptions(videoPath, clips, trimStartMs) {
    const captionsPath = videoPath.replace(/\.webm$/, CAPTIONS_SUFFIX);
    const cues = clips
        .filter((clip) => typeof clip.text === "string" && clip.text.trim().length > 0)
        .map((clip) => {
            const startMs = Math.max(0, clip.startMs - trimStartMs);
            return { startMs, endMs: startMs + clip.durationMs, text: clip.text.trim() };
        })
        .sort((a, b) => a.startMs - b.startMs);
    if (cues.length === 0) {
        rmSync(captionsPath, { force: true });
        return;
    }
    const body = cues
        .map((cue) => `${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(cue.endMs)}\n${cue.text}`)
        .join("\n\n");
    writeFileSync(captionsPath, `WEBVTT\n\n${body}\n`);
}

/** Mux one folder's clips into its video. Returns true on success, false on any failure. */
function narrateFolder(dir) {
    const manifestPath = join(dir, MANIFEST_NAME);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const clips = manifest.clips ?? [];
    const steps = manifest.steps ?? [];
    if (clips.length === 0) {
        const videoPath = findSourceVideo(dir);
        if (videoPath) {
            writeSteps(videoPath, steps, 0);
            writeCaptions(videoPath, clips, 0);
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
    writeSteps(videoPath, steps, trimStartMs);
    writeCaptions(videoPath, clips, trimStartMs);
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
