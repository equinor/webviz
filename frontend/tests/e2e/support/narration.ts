import { createHash } from "node:crypto";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

/**
 * Text-to-speech narration for the recorded walkthrough videos.
 *
 * A test calls {@link Narrator.narrate} with a line of narration; the voice is synthesized locally
 * with kokoro-js and recorded in a per-test manifest together with the moment it should start playing.
 * After all tests have finished, a global teardown step muxes the audio clips into each recorded video
 * at those timestamps.
 *
 * Synthesis runs in a worker thread (see narrationWorker.mjs): Kokoro/ONNX inference is CPU-bound
 * and would otherwise block the event loop that drives Playwright, freezing the recorded UI while a
 * line is generated.
 */


/** The manifest file the muxer looks for in each test's output folder. */
export const NARRATION_MANIFEST_FILENAME = "narration.json";


export type NarrationEntry = {
    startMs: number;
    file: string;
    durationMs: number;
};

type WorkerMessage =
    | { type: "ready" }
    | { type: "result"; id: number; durationMs: number }
    | { type: "error"; id?: number; message: string };


let worker: Worker | null = null;
let nextRequestId = 0;
const pendingSynth = new Map<number, { resolve: (durationMs: number) => void; reject: (error: unknown) => void }>();
let readyWaiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

/** Lazily spawn the TTS worker and wire up its message handling. */
function getWorker(): Worker {
    if (worker) {
        return worker;
    }
    const workerUrl = new URL("./narrationWorker.mjs", import.meta.url);
    worker = new Worker(fileURLToPath(workerUrl));
    worker.on("message", (msg: WorkerMessage) => {
        if (msg.type === "ready") {
            readyWaiters.forEach((waiter) => waiter.resolve());
            readyWaiters = [];
        } else if (msg.type === "result") {
            pendingSynth.get(msg.id)?.resolve(msg.durationMs);
            pendingSynth.delete(msg.id);
        } else {
            const error = new Error(msg.message);
            if (msg.id !== undefined) {
                pendingSynth.get(msg.id)?.reject(error);
                pendingSynth.delete(msg.id);
            } else {
                readyWaiters.forEach((waiter) => waiter.reject(error));
                readyWaiters = [];
            }
        }
    });
    worker.on("error", (error) => {
        pendingSynth.forEach((p) => p.reject(error));
        pendingSynth.clear();
        readyWaiters.forEach((waiter) => waiter.reject(error));
        readyWaiters = [];
    });
    return worker;
}

/** Synthesize `text` to `outPath` (WAV) in the worker and return the spoken duration in ms. */
function synthesizeInWorker(text: string, outPath: string): Promise<number> {
    const activeWorker = getWorker();
    const id = nextRequestId++;
    return new Promise<number>((resolve, reject) => {
        pendingSynth.set(id, { resolve, reject });
        activeWorker.postMessage({ type: "synthesize", id, text, outPath });
    });
}

/**
 * Audio cache is keyed by content/text. On a cache hit the WAV is just copied out from cache.
 */
const CACHE_DIR = fileURLToPath(new URL("../../../.narration-cache/", import.meta.url));
const CACHE_VOICE = "bf_emma";
const CACHE_SPEED = 1;

function cacheKeyFor(text: string): string {
    return createHash("sha1").update(`${CACHE_VOICE}\u0000${CACHE_SPEED}\u0000${text}`).digest("hex");
}

/** Synthesize `text` to `outPath` (WAV) and return the spoken duration in ms. */
async function synthesize(text: string, outPath: string): Promise<number> {
    const key = cacheKeyFor(text);
    const cachedWav = join(CACHE_DIR, `${key}.wav`);
    const cachedMeta = join(CACHE_DIR, `${key}.json`);

    if (existsSync(cachedWav) && existsSync(cachedMeta)) {
        const { durationMs } = JSON.parse(readFileSync(cachedMeta, "utf-8")) as { durationMs: number };
        copyFileSync(cachedWav, outPath);

        // Mark as recently used so cache pruning keeps active clips and ages out orphans.
        const now = new Date();
        utimesSync(cachedWav, now, now);
        utimesSync(cachedMeta, now, now);
        return durationMs;
    }

    const durationMs = await synthesizeInWorker(text, outPath);
    mkdirSync(CACHE_DIR, { recursive: true });
    copyFileSync(outPath, cachedWav);
    writeFileSync(cachedMeta, JSON.stringify({ durationMs }));
    return durationMs;
}

/**
 * Drop cached clips that haven't been used in `maxAgeDays`
 */
export function pruneNarrationCache(maxAgeDays = 60): void {
    if (!existsSync(CACHE_DIR)) {
        return;
    }

    const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    for (const name of readdirSync(CACHE_DIR)) {
        if (!name.endsWith(".wav")) {
            continue;
        }
        if (statSync(join(CACHE_DIR, name)).mtimeMs < cutoffMs) {
            const key = name.slice(0, -".wav".length);
            rmSync(join(CACHE_DIR, `${key}.wav`), { force: true });
            rmSync(join(CACHE_DIR, `${key}.json`), { force: true });
        }
    }
}

/**
 * Load the Kokoro model up front. Call this before the browser context (and thus video recording)
 * is created, so the multi-second cold load isn't captured as dead footage at the start of a video.
 */
export function preloadNarrationModel(): Promise<void> {
    const activeWorker = getWorker();
    return new Promise<void>((resolve, reject) => {
        readyWaiters.push({ resolve, reject });
        activeWorker.postMessage({ type: "preload" });
    });
}

/** Shut the TTS worker down so it doesn't keep the Playwright worker process alive after the run. */
export async function terminateNarrationWorker(): Promise<void> {
    if (worker) {
        await worker.terminate();
        worker = null;
    }
}


/**
 * Collects narration for a single test: synthesizes each line, timestamps it relative to the video
 * recording, and writes a manifest that the post-run muxer consumes.
 */
export class Narrator {
    private recordingStartMs = Date.now();
    private readonly entries: NarrationEntry[] = [];
    private readonly outputDir: string;
    private nextIndex = 0;
    /** Manual timeline nudge (ms) for aligning voice with video; see NARRATION_OFFSET_MS. */
    private readonly offsetMs: number;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
        this.offsetMs = Number(process.env.NARRATION_OFFSET_MS ?? 0);
        mkdirSync(outputDir, { recursive: true });
    }

    /** Reset the timeline zero-point to now — call as close as possible to the video's first frame. */
    markRecordingStart(): void {
        this.recordingStartMs = Date.now();
    }

    /**
     * Speak `text` over the recording.
     *
     * The returned promise resolves once the clip has been synthesized AND enough wall-clock time
     * has passed to cover its spoken duration, so callers can either:
     *  - `await narrate(text)` to hold the UI still until the voice finishes, or
     *  - `const p = narrate(text); ...keep interacting...; await p;` to talk over the actions and
     *    only sync up before the next step.
     */
    narrate(text: string): Promise<void> {
        const callWallMs = Date.now();
        const startMs = callWallMs - this.recordingStartMs + this.offsetMs;
        const file = `narration-${String(this.nextIndex++).padStart(3, "0")}.wav`;
        const outPath = join(this.outputDir, file);

        return (async () => {
            const durationMs = await synthesize(text, outPath);
            this.entries.push({ startMs, file, durationMs });
            const generationMs = Date.now() - callWallMs;
            const remainingMs = durationMs - generationMs;
            if (remainingMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, remainingMs));
            }
        })();
    }

    /** Write the narration manifest into the test's output folder (next to the audio and video). */
    flush(): void {
        if (this.entries.length === 0) {
            return;
        }
        const manifest = [...this.entries].sort((a, b) => a.startMs - b.startMs);
        writeFileSync(
            join(this.outputDir, NARRATION_MANIFEST_FILENAME),
            JSON.stringify({ clips: manifest }, null, 2),
        );
    }
}

/** Narrator whose methods are no-ops; used when not recording so tests run at full speed. */
export const NOOP_NARRATOR = {
    markRecordingStart: (): void => undefined,
    narrate: (): Promise<void> => Promise.resolve(),
    flush: (): void => undefined,
} as const;

export type NarratorLike = Pick<Narrator, "markRecordingStart" | "narrate" | "flush">;
