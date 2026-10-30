import { mkdtempSync, rmSync } from "node:fs";
import type * as NodeFs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";

import { afterEach, expect, it, vi } from "vitest";

import { Narrator, preloadNarrationModel, terminateNarrationWorker } from "../e2e/support/narration";

vi.mock("node:worker_threads", async () => {
    const { EventEmitter } = await import("node:events");
    return {
        Worker: vi.fn(function () {
            return Object.assign(new EventEmitter(), {
                threadId: 1,
                postMessage: vi.fn(),
                terminate: vi.fn(async () => 1),
            });
        }),
    };
});

vi.mock("node:fs", async (importOriginal) => ({
    ...(await importOriginal<typeof NodeFs>()),
    copyFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

afterEach(async () => {
    await terminateNarrationWorker();
    vi.clearAllMocks();
});

it.each(["success", "failure"])("waits for native synthesis to finish on %s before terminating", async (outcome) => {
    const ready = preloadNarrationModel();
    const worker: Worker = vi.mocked(Worker).mock.results[0].value;
    worker.emit("message", { type: "ready" });
    await ready;
    const outputDir = mkdtempSync(join(tmpdir(), "webviz-narration-teardown-"));
    try {
        const narration = new Narrator(outputDir).narrate(`Teardown regression ${outputDir}.`);
        const result = outcome === "failure"
            ? expect(narration).rejects.toThrow("Synthesis failed")
            : expect(narration).resolves.toBeUndefined();
        const request = vi.mocked(worker.postMessage).mock.calls.at(-1)?.[0];
        const teardown = terminateNarrationWorker();
        await Promise.resolve();
        expect(worker.terminate).not.toHaveBeenCalled();

        worker.emit("message", outcome === "failure"
            ? { type: "error", id: request.id, message: "Synthesis failed" }
            : { type: "result", id: request.id, durationMs: 0 });

        await teardown;
        await result;
        expect(worker.terminate).toHaveBeenCalledOnce();
    } finally {
        rmSync(outputDir, { recursive: true, force: true });
    }
});
