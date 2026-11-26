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

/** Run ffmpeg with `args`, returning true on success and logging stderr on failure. */
function runFfmpeg(args, label) {
    const result = spawnSync("ffmpeg", args, { encoding: "utf-8" });
    if (result.error || result.status !== 0) {
        console.error(`  [narration] ffmpeg failed (${label}):\n${result.stderr ?? result.error}`);
        return false;
    }
    return true;
}

/**
 * Find the earliest video keyframe timestamp (in ms) at or after `targetMs`, or null if none
 * exists (e.g. `targetMs` falls after the last keyframe, or `ffprobe` is unavailable).
 */
function findKeyframeAtOrAfter(videoPath, targetMs) {
    if (targetMs <= 0) {
        return 0;
    }
    const targetSec = targetMs / 1000;
    const result = spawnSync(
        "ffprobe",
        [
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "packet=pts_time,flags",
            "-of",
            "csv=p=0",
            videoPath,
        ],
        { encoding: "utf-8" },
    );
    if (result.error || result.status !== 0) {
        return null;
    }

    for (const line of result.stdout.split(/\r?\n/)) {
        if (!line) {
            continue;
        }
        const [ptsStr, flags] = line.split(",");
        if (!flags?.includes("K")) {
            continue;
        }
        const ptsSec = Number(ptsStr);
        if (!Number.isFinite(ptsSec)) {
            continue;
        }
        if (ptsSec >= targetSec - 0.001) {
            return Math.round(ptsSec * 1000);
        }
    }
    return null;
}

/**
 * Build the `-filter_complex` expression that delays each narration clip relative to `trimStartMs`
 * and mixes them into a single `[aout]` stream.
 */
function buildAudioFilter(clips, trimStartMs) {
    const filters = [];
    const mixLabels = [];
    clips.forEach((clip, index) => {
        const inputIndex = index + 1; // 0 is the video input
        const label = `a${index}`;
        const delayMs = Math.max(0, Math.round(clip.startMs - trimStartMs));
        filters.push(`[${inputIndex}:a]adelay=${delayMs}:all=1[${label}]`);
        mixLabels.push(`[${label}]`);
    });
    filters.push(
        `${mixLabels.join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0[aout]`,
    );
    return filters.join(";");
}

/**
 * Smart-cut and mux `videoPath` starting at exact `trimStartMs`:
 *  - If `trimStartMs` is already on a keyframe (or 0), stream-copy the whole video directly.
 *  - Otherwise, re-encode ONLY the short opening slice `[trimStartMs, nextKeyframeMs)` (<= 5.12s
 *    for Playwright's VP8 recordings) and stream-copy the remaining 99% from `nextKeyframeMs` onward,
 *    then concat + mux the narration audio in one fast pass.
 */
function muxWithSmartCut(videoPath, clips, trimStartMs, outputPath) {
    const dir = dirname(videoPath);
    const audioInputs = clips.flatMap((clip) => ["-i", join(dir, clip.file)]);
    const nextKeyframeMs = trimStartMs > 0 ? findKeyframeAtOrAfter(videoPath, trimStartMs) : 0;

    // Case 1: Already aligned to a keyframe (or no trim needed) -> single-pass stream copy.
    // Output `-ss` trims both the video and the original-timeline audio mix together.
    if (nextKeyframeMs !== null && Math.abs(nextKeyframeMs - trimStartMs) <= 1) {
        return runFfmpeg(
            [
                "-y",
                "-i",
                videoPath,
                ...audioInputs,
                "-filter_complex",
                buildAudioFilter(clips, 0),
                "-map",
                "0:v",
                "-map",
                "[aout]",
                ...(trimStartMs > 0 ? ["-ss", (trimStartMs / 1000).toFixed(3)] : []),
                "-c:v",
                "copy",
                "-c:a",
                "libopus",
                "-cues_to_front",
                "1",
                outputPath,
            ],
            videoPath,
        );
    }

    // Case 2: No keyframe after `trimStartMs` (very short tail) -> re-encode the short remainder directly.
    if (nextKeyframeMs === null) {
        return runFfmpeg(
            [
                "-y",
                "-i",
                videoPath,
                ...audioInputs,
                "-filter_complex",
                buildAudioFilter(clips, 0),
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-ss",
                (trimStartMs / 1000).toFixed(3),
                "-c:v",
                "libvpx",
                "-crf",
                "10",
                "-b:v",
                "2M",
                "-deadline",
                "realtime",
                "-cpu-used",
                "5",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "libopus",
                "-cues_to_front",
                "1",
                outputPath,
            ],
            videoPath,
        );
    }

    // Case 3: Smart cut -> re-encode [trimStartMs, nextKeyframeMs), copy [nextKeyframeMs, end), concat + mux.
    // The concatenated video already starts at t=0 (= trimStartMs), so audio delays are relative to trimStartMs.
    const audioFilter = buildAudioFilter(clips, trimStartMs);
    const headPath = join(dir, ".smartcut-head.webm");
    const tailPath = join(dir, ".smartcut-tail.webm");
    const concatListPath = join(dir, ".smartcut-concat.txt");

    try {
        const headDurationSec = ((nextKeyframeMs - trimStartMs) / 1000).toFixed(3);
        const headOk = runFfmpeg(
            [
                "-y",
                "-i",
                videoPath,
                "-ss",
                (trimStartMs / 1000).toFixed(3),
                "-t",
                headDurationSec,
                "-an",
                "-c:v",
                "libvpx",
                "-crf",
                "10",
                "-b:v",
                "2M",
                "-deadline",
                "realtime",
                "-cpu-used",
                "5",
                "-pix_fmt",
                "yuv420p",
                headPath,
            ],
            `${videoPath} (head)`,
        );
        if (!headOk) {
            return false;
        }

        const tailOk = runFfmpeg(
            [
                "-y",
                "-i",
                videoPath,
                "-ss",
                (nextKeyframeMs / 1000).toFixed(3),
                "-an",
                "-c:v",
                "copy",
                tailPath,
            ],
            `${videoPath} (tail)`,
        );
        if (!tailOk) {
            return false;
        }

        writeFileSync(
            concatListPath,
            `file '${headPath.replace(/'/g, "'\\''")}'\nfile '${tailPath.replace(/'/g, "'\\''")}'\n`,
        );

        return runFfmpeg(
            [
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concatListPath,
                ...audioInputs,
                "-filter_complex",
                audioFilter,
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-c:v",
                "copy",
                "-c:a",
                "libopus",
                // The seek index is written at the end of a WebM by default,
                // which a streaming player never reaches unless it downloads the whole file
                "-cues_to_front",
                "1",
                outputPath,
            ],
            `${videoPath} (concat+mux)`,
        );
    } finally {
        rmSync(headPath, { force: true });
        rmSync(tailPath, { force: true });
        rmSync(concatListPath, { force: true });
    }
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

    // Trim the video's blank/loading lead-in at the exact timestamp of the first narration clip.
    const trimStartMs = Math.max(0, Math.min(...clips.map((clip) => clip.startMs)));

    const outputPath = videoPath.replace(/\.webm$/, NARRATED_SUFFIX);
    if (!muxWithSmartCut(videoPath, clips, trimStartMs, outputPath)) {
        return false;
    }
    writeSteps(videoPath, steps, trimStartMs);
    writeCaptions(videoPath, clips, trimStartMs);
    console.log(`  [narration] Wrote ${outputPath} (${clips.length} clip(s), trim=${trimStartMs}ms).`);
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
