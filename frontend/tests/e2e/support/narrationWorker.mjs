// Runs Kokoro synthesis in a worker off the main thread, if not Playwright UI freezes.

import { parentPort } from "node:worker_threads";

import { KokoroTTS } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart";
const SPEED = 1;
const DTYPE = "q8";

let modelPromise = null;

function loadModel() {
    if (!modelPromise) {
        modelPromise = KokoroTTS.from_pretrained(MODEL_ID, { dtype: DTYPE, device: "cpu" });
    }
    return modelPromise;
}

parentPort.on("message", async (msg) => {
    try {
        if (msg.type === "preload") {
            const tts = await loadModel();
            // Throwaway synthesis to take the one-time warmup cost.
            await tts.generate("Warming up.", { voice: VOICE, speed: SPEED });
            parentPort.postMessage({ type: "ready" });
            return;
        }
        if (msg.type === "synthesize") {
            const tts = await loadModel();
            const audio = await tts.generate(msg.text, { voice: VOICE, speed: SPEED });
            await audio.save(msg.outPath);
            const durationMs = (audio.audio.length / audio.sampling_rate) * 1000;
            parentPort.postMessage({ type: "result", id: msg.id, durationMs });
        }
    } catch (error) {
        parentPort.postMessage({ type: "error", id: msg.id, message: String(error?.stack ?? error) });
    }
});
