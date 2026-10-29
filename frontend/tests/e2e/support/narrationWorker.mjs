// Runs Kokoro synthesis in a worker off the main thread, if not Playwright UI freezes.

import { writeSync } from "node:fs";
import { parentPort, threadId } from "node:worker_threads";

import { KokoroTTS } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart";
const SPEED = 1;
const DTYPE = "q8";

let modelPromise = null;

function logStage(stage, id) {
    // Bypass asynchronous worker console forwarding so native aborts do not lose the last breadcrumb.
    writeSync(
        2,
        `[narration] ${new Date().toISOString()} pid=${process.pid} thread=${threadId} rssMiB=${Math.round(process.memoryUsage.rss() / 1024 / 1024)}${id === undefined ? "" : ` id=${id}`} ${stage}\n`,
    );
}

function loadModel() {
    if (!modelPromise) {
        logStage("model loading");
        modelPromise = KokoroTTS.from_pretrained(MODEL_ID, { dtype: DTYPE, device: "cpu" }).then((model) => {
            logStage("model loaded");
            return model;
        });
    }
    return modelPromise;
}

parentPort.on("message", async (msg) => {
    try {
        if (msg.type === "preload") {
            logStage("preload starting");
            const tts = await loadModel();
            // Throwaway synthesis to take the one-time warmup cost.
            logStage("warmup synthesis starting");
            await tts.generate("Warming up.", { voice: VOICE, speed: SPEED });
            logStage("warmup synthesis finished");
            parentPort.postMessage({ type: "ready" });
            return;
        }
        if (msg.type === "synthesize") {
            logStage(`synthesis requested text=${JSON.stringify(msg.text)}`, msg.id);
            const tts = await loadModel();
            logStage("synthesis starting", msg.id);
            const audio = await tts.generate(msg.text, { voice: VOICE, speed: SPEED });
            logStage("synthesis finished", msg.id);
            logStage("audio saving", msg.id);
            await audio.save(msg.outPath);
            logStage("audio saved", msg.id);
            const durationMs = (audio.audio.length / audio.sampling_rate) * 1000;
            parentPort.postMessage({ type: "result", id: msg.id, durationMs });
        }
    } catch (error) {
        logStage(`request failed: ${String(error?.stack ?? error)}`, msg.id);
        parentPort.postMessage({ type: "error", id: msg.id, message: String(error?.stack ?? error) });
    }
});
