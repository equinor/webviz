import { CancelledError, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { QcCheckDefinition } from "@framework/internal/QC/QcCheck";
import { QcCheckRuntime } from "@framework/internal/QC/QcCheck";
import type { QcCheckStepDefinition, QcCheckStepRunContext } from "@framework/internal/QC/QcCheckStep";
import { QcCheckStepGroupTopic } from "@framework/internal/QC/QcCheckStep";
import { RegularEnsemble } from "@framework/RegularEnsemble";

const ENSEMBLE = new RegularEnsemble(
    "DROGON",
    ["DROGON"],
    "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "ens1",
    "sc",
    [0, 1, 2],
    [],
    null,
    null,
    "",
);

type Invocation = {
    cleanup: ReturnType<typeof vi.fn>;
    finish: () => void;
};

// Registers a cleanup callback, then waits for the test to call `finish` - ignoring cancellation, like a step doing
// work other than fetching. Succeeds for every realization, so the next step gets all of them.
function makeStep(
    name: string,
    invocations: Invocation[],
    matrixCoordinateKeys?: string[],
): QcCheckStepDefinition<void, void> {
    return {
        name,
        matrixCoordinates: matrixCoordinateKeys
            ? () => matrixCoordinateKeys.map((key) => ({ key, label: key }))
            : undefined,
        async run(context) {
            const cleanup = vi.fn();
            context.onFetchCancelOrFinish(cleanup);
            await new Promise<void>((resolve) => invocations.push({ cleanup, finish: resolve }));
            for (const realization of context.realizations) {
                context.reportRealizationResult(realization, { kind: "success", metrics: undefined });
            }
        },
    };
}

// Each previous coordinate's key, with the realizations it carries and their metrics
function summarizePreviousStepResults(
    previousStepResults: QcCheckStepRunContext<unknown, void, unknown>["previousStepResults"],
) {
    return (
        previousStepResults?.map(({ coordinate, results }) => ({
            coordinate: coordinate?.key ?? null,
            results: Array.from(results, ([realization, result]) => [
                realization,
                result.kind === "success" ? result.metrics : null,
            ]),
        })) ?? null
    );
}

type ReceivedInput = {
    realizations: number[];
    previousStepResults: ReturnType<typeof summarizePreviousStepResults>;
};

// Records what each of its invocations is given
function makeRecordingStep(received: ReceivedInput[]): QcCheckStepDefinition<void, void> {
    return {
        name: "Recording step",
        async run(context) {
            received.push({
                realizations: context.realizations,
                previousStepResults: summarizePreviousStepResults(context.previousStepResults),
            });
        },
    };
}

describe("QcCheckRuntime tests", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
    });

    afterEach(() => {
        queryClient.clear();
    });

    function makeCheckRuntime(steps: QcCheckDefinition<void>["steps"]): QcCheckRuntime<void> {
        const checkDefinition: QcCheckDefinition<void> = { name: "Test check", defaultParams: undefined, steps };
        return new QcCheckRuntime("test-check", checkDefinition, ENSEMBLE, queryClient);
    }

    test("should clean up each invocation once it finishes, for every step and coordinate", async () => {
        const invocations: Invocation[] = [];
        const checkRuntime = makeCheckRuntime([
            makeStep("Step 1", invocations),
            makeStep("Step 2", invocations, ["a", "b"]),
        ]);

        const run = checkRuntime.run([0, 1]);
        for (let i = 0; i < 3; i++) {
            await vi.waitFor(() => expect(invocations).toHaveLength(i + 1));
            expect(invocations[i].cleanup).not.toHaveBeenCalled();
            invocations[i].finish();
        }
        await run;

        for (const invocation of invocations) {
            expect(invocation.cleanup).toHaveBeenCalledTimes(1);
        }
    });

    test("should clean up the running invocation right away when cancelled", async () => {
        const invocations: Invocation[] = [];
        const checkRuntime = makeCheckRuntime([makeStep("Step 1", invocations)]);

        const run = checkRuntime.run([0, 1]);
        await vi.waitFor(() => expect(invocations).toHaveLength(1));

        checkRuntime.cancel();
        expect(invocations[0].cleanup).toHaveBeenCalledTimes(1);

        // Finishing afterwards doesn't clean up again
        invocations[0].finish();
        await run;
        expect(invocations[0].cleanup).toHaveBeenCalledTimes(1);
    });

    test("should not let a superseded invocation clean up the newer run's resources", async () => {
        const invocations: Invocation[] = [];
        const checkRuntime = makeCheckRuntime([makeStep("Step 1", invocations)]);

        const firstRun = checkRuntime.run([0, 1]);
        await vi.waitFor(() => expect(invocations).toHaveLength(1));
        const secondRun = checkRuntime.run([0, 1]);
        await vi.waitFor(() => expect(invocations).toHaveLength(2));
        const [superseded, current] = invocations;
        expect(superseded.cleanup).toHaveBeenCalledTimes(1);

        superseded.finish();
        await firstRun;
        expect(current.cleanup).not.toHaveBeenCalled();

        current.finish();
        await secondRun;
        expect(current.cleanup).toHaveBeenCalledTimes(1);
        expect(superseded.cleanup).toHaveBeenCalledTimes(1);
    });

    test("should clean up right away what an invocation registers after its run was cancelled", async () => {
        const lateCleanup = vi.fn();
        let finish = () => {};
        const checkRuntime = makeCheckRuntime([
            {
                name: "Late registering step",
                async run(context) {
                    await new Promise<void>((resolve) => (finish = resolve));
                    context.onFetchCancelOrFinish(lateCleanup);
                },
            },
        ]);

        const run = checkRuntime.run([0, 1]);
        checkRuntime.cancel();
        finish();
        await run;

        expect(lateCleanup).toHaveBeenCalledTimes(1);
    });

    test("should run the remaining callbacks and finish the run when a callback throws", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const cleanup = vi.fn();
        const checkRuntime = makeCheckRuntime([
            {
                name: "Step with a failing cleanup",
                async run(context) {
                    context.onFetchCancelOrFinish(() => {
                        throw new Error("Cleanup failed");
                    });
                    context.onFetchCancelOrFinish(cleanup);
                },
            },
        ]);

        await checkRuntime.run([0, 1]);

        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(checkRuntime.isRunning()).toBe(false);
        expect(checkRuntime.getStepRuntimes()[0].getEntries()[0].runtime.isRunning()).toBe(false);
        consoleErrorSpy.mockRestore();
    });

    test("should not let a superseded invocation write results into or stop the newer run", async () => {
        const invocations: Invocation[] = [];
        const checkRuntime = makeCheckRuntime([makeStep("Step 1", invocations)]);
        // Reused by every run
        const matrixRuntime = checkRuntime.getStepRuntimes()[0].getEntries()[0].runtime;

        const firstRun = checkRuntime.run([0, 1, 2]);
        await vi.waitFor(() => expect(invocations).toHaveLength(1));
        const secondRun = checkRuntime.run([0]);
        await vi.waitFor(() => expect(invocations).toHaveLength(2));

        invocations[0].finish();
        await firstRun;
        expect(matrixRuntime.getResults().size).toBe(0);
        expect(matrixRuntime.isRunning()).toBe(true);

        invocations[1].finish();
        await secondRun;
        expect(Array.from(matrixRuntime.getResults().keys())).toEqual([0]);
        expect(matrixRuntime.isRunning()).toBe(false);
    });

    test("should stop a cancelled invocation right away and ignore what it reports afterwards", async () => {
        const invocations: Invocation[] = [];
        const checkRuntime = makeCheckRuntime([makeStep("Step 1", invocations)]);
        const matrixRuntime = checkRuntime.getStepRuntimes()[0].getEntries()[0].runtime;

        const run = checkRuntime.run([0, 1]);
        await vi.waitFor(() => expect(invocations).toHaveLength(1));
        expect(matrixRuntime.isRunning()).toBe(true);

        checkRuntime.cancel();
        expect(matrixRuntime.isRunning()).toBe(false);

        invocations[0].finish();
        await run;
        expect(matrixRuntime.getResults().size).toBe(0);
    });

    test("should not start the remaining coordinates of a cancelled run", async () => {
        const invocations: Invocation[] = [];
        const checkRuntime = makeCheckRuntime([makeStep("Step 1", invocations, ["a", "b"])]);

        const run = checkRuntime.run([0, 1]);
        await vi.waitFor(() => expect(invocations).toHaveLength(1));
        checkRuntime.cancel();
        invocations[0].finish();
        // Lets the run carry on as far as it would
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(invocations).toHaveLength(1);
        await run;
    });

    test("should only pass the predecessor's successful results to the next step", async () => {
        const received: ReceivedInput[] = [];
        const checkRuntime = makeCheckRuntime([
            {
                name: "Mixed outcome step",
                async run(context) {
                    context.reportRealizationResult(0, { kind: "success", metrics: "ok" });
                    context.reportRealizationResult(1, { kind: "failure", metrics: "too high", reason: "Failed" });
                    context.reportRealizationResult(2, { kind: "exception", errorMessage: "Errored" });
                },
            },
            makeRecordingStep(received),
        ]);

        await checkRuntime.run([0, 1, 2]);

        expect(received).toEqual([
            { realizations: [0], previousStepResults: [{ coordinate: null, results: [[0, "ok"]] }] },
        ]);
    });

    test("should fan a non-matrixed step in after several coordinates", async () => {
        const received: ReceivedInput[] = [];
        const checkRuntime = makeCheckRuntime([
            {
                name: "Per-grid step",
                matrixCoordinates: () => [
                    { key: "a", label: "A" },
                    { key: "b", label: "B" },
                ],
                async run(context) {
                    const gridKey = context.matrixCoordinate?.key;
                    for (const realization of context.realizations) {
                        if (gridKey === "b" && realization === 1) {
                            context.reportRealizationResult(realization, {
                                kind: "failure",
                                metrics: gridKey,
                                reason: "Failed",
                            });
                        } else {
                            context.reportRealizationResult(realization, { kind: "success", metrics: gridKey });
                        }
                    }
                },
            },
            makeRecordingStep(received),
        ]);

        await checkRuntime.run([0, 1, 2]);

        // Realization 1 failed for grid "b", so it isn't carried over at all
        expect(received).toEqual([
            {
                realizations: [0, 2],
                previousStepResults: [
                    {
                        coordinate: "a",
                        results: [
                            [0, "a"],
                            [2, "a"],
                        ],
                    },
                    {
                        coordinate: "b",
                        results: [
                            [0, "b"],
                            [2, "b"],
                        ],
                    },
                ],
            },
        ]);
    });

    test("should report an exception for each realization a throwing step didn't report", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const checkRuntime = makeCheckRuntime([
            {
                name: "Throwing step",
                async run(context) {
                    context.reportRealizationResult(0, { kind: "success", metrics: undefined });
                    throw new Error("Step failed");
                },
            },
        ]);

        await expect(checkRuntime.run([0, 1, 2])).resolves.toBeUndefined();

        const results = checkRuntime.getStepRuntimes()[0].getEntries()[0].runtime.getResults();
        expect(Object.fromEntries(results)).toEqual({
            0: { kind: "success", metrics: undefined },
            1: { kind: "exception", errorMessage: "Step failed" },
            2: { kind: "exception", errorMessage: "Step failed" },
        });
        expect(checkRuntime.isRunning()).toBe(false);
        consoleErrorSpy.mockRestore();
    });

    test("should resolve without reporting anything when a cancelled step lets the cancellation escape", async () => {
        const checkRuntime = makeCheckRuntime([
            {
                name: "Fetching step",
                async run(context) {
                    await context.fetchQuery({
                        queryKey: ["never-resolving"],
                        queryFn: () => new Promise<never>(() => {}),
                    });
                },
            },
        ]);

        const run = checkRuntime.run([0, 1]);
        checkRuntime.cancel();

        await expect(run).resolves.toBeUndefined();
        expect(checkRuntime.getStepRuntimes()[0].getEntries()[0].runtime.getResults().size).toBe(0);
    });

    test("should resolve and log when the check fails outside its steps", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const checkRuntime = makeCheckRuntime([
            {
                name: "Step with failing coordinates",
                matrixCoordinates: () => {
                    throw new Error("No coordinates");
                },
                async run() {},
            },
        ]);

        await expect(checkRuntime.run([0, 1])).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(checkRuntime.isRunning()).toBe(false);
        consoleErrorSpy.mockRestore();
    });

    test("should clear every step's previous results when a re-run fails to get its coordinates", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        let failCoordinates = false;
        const succeedingRun: QcCheckStepDefinition<void, void>["run"] = async (context) => {
            for (const realization of context.realizations) {
                context.reportRealizationResult(realization, { kind: "success", metrics: undefined });
            }
        };
        const checkRuntime = makeCheckRuntime([
            { name: "Step 1", run: succeedingRun },
            {
                name: "Step 2",
                matrixCoordinates: () => {
                    if (failCoordinates) {
                        throw new Error("No coordinates");
                    }
                    return [{ key: "a", label: "A" }];
                },
                run: succeedingRun,
            },
        ]);

        await checkRuntime.run([0, 1]);
        failCoordinates = true;
        await checkRuntime.run([0, 1]);

        for (const stepRuntime of checkRuntime.getStepRuntimes()) {
            for (const entry of stepRuntime.getEntries()) {
                expect(entry.runtime.hasRun()).toBe(false);
                expect(entry.runtime.getResults().size).toBe(0);
            }
        }
        consoleErrorSpy.mockRestore();
    });

    test("should not let a superseded invocation start a request that cancels the newer run's", async () => {
        const outcomes: string[] = [];
        let invocationCount = 0;
        let resumeSuperseded = () => {};
        let resolveFetch: (value: number) => void = () => {};
        const checkRuntime = makeCheckRuntime([
            {
                name: "Fetching step",
                async run(context) {
                    const invocation = ++invocationCount;
                    if (invocation === 1) {
                        await new Promise<void>((resolve) => (resumeSuperseded = resolve));
                    }
                    try {
                        await context.fetchQuery({
                            queryKey: ["shared-key"],
                            queryFn: () => new Promise<number>((resolve) => (resolveFetch = resolve)),
                        });
                        outcomes.push(`${invocation}: fetched`);
                    } catch (error) {
                        outcomes.push(`${invocation}: ${error instanceof CancelledError ? "cancelled" : "failed"}`);
                    }
                },
            },
        ]);

        const firstRun = checkRuntime.run([0]);
        const secondRun = checkRuntime.run([0]);
        // The superseded invocation resumes while the newer one is fetching the same key
        resumeSuperseded();
        await firstRun;
        resolveFetch(1);
        await secondRun;

        expect(outcomes).toEqual(["1: cancelled", "2: fetched"]);
    });

    test("should only carry a single matrixed entry over to the same coordinate", async () => {
        const received: ReceivedInput[] = [];
        const checkRuntime = makeCheckRuntime([
            {
                name: "Grid A step",
                matrixCoordinates: () => [{ key: "a", label: "A" }],
                async run(context) {
                    for (const realization of context.realizations) {
                        context.reportRealizationResult(realization, { kind: "success", metrics: "a" });
                    }
                },
            },
            {
                ...makeRecordingStep(received),
                matrixCoordinates: () => [
                    { key: "a", label: "A" },
                    { key: "b", label: "B" },
                ],
            },
        ]);

        await checkRuntime.run([0, 1]);

        // Grid B has no matching entry in the previous step, so it's skipped rather than given grid A's results
        expect(received).toEqual([
            {
                realizations: [0, 1],
                previousStepResults: [
                    {
                        coordinate: "a",
                        results: [
                            [0, "a"],
                            [1, "a"],
                        ],
                    },
                ],
            },
        ]);
        const [, entryB] = checkRuntime.getStepRuntimes()[1].getEntries();
        expect(entryB.runtime.isSkipped()).toBe(true);
    });

    test("should not run a matrixed step without coordinates, nor the steps after it", async () => {
        const received: ReceivedInput[] = [];
        const checkRuntime = makeCheckRuntime([
            { ...makeRecordingStep(received), matrixCoordinates: () => [] },
            makeRecordingStep(received),
        ]);

        await checkRuntime.run([0, 1]);

        expect(received).toEqual([]);
        expect(checkRuntime.getStepRuntimes()[0].getEntries()).toEqual([]);
        expect(checkRuntime.getStepRuntimes()[1].getEntries()[0].runtime.isSkipped()).toBe(true);
    });

    test("should refresh a coordinate's label on re-run while keeping its runtime", async () => {
        let label = "Grid A";
        const receivedLabels: (string | undefined)[] = [];
        const checkRuntime = makeCheckRuntime([
            {
                name: "Per-grid step",
                matrixCoordinates: () => [{ key: "a", label }],
                async run(context) {
                    receivedLabels.push(context.matrixCoordinate?.label);
                },
            },
        ]);
        const stepRuntime = checkRuntime.getStepRuntimes()[0];

        await checkRuntime.run([0]);
        const runtimeBefore = stepRuntime.getEntries()[0].runtime;
        const onCoordinatesChange = vi.fn();
        stepRuntime.getPublishSubscribeDelegate().subscribe(QcCheckStepGroupTopic.COORDINATES, onCoordinatesChange);

        label = "Grid A (renamed)";
        await checkRuntime.run([0]);

        expect(receivedLabels).toEqual(["Grid A", "Grid A (renamed)"]);
        expect(stepRuntime.getEntries()[0].coordinate?.label).toBe("Grid A (renamed)");
        expect(stepRuntime.getEntries()[0].runtime).toBe(runtimeBefore);
        expect(onCoordinatesChange).toHaveBeenCalled();
    });

    test("should give each invocation its own copy of the realizations", async () => {
        const received: number[][] = [];
        const checkRuntime = makeCheckRuntime([
            {
                name: "Mutating step",
                matrixCoordinates: () => [
                    { key: "a", label: "A" },
                    { key: "b", label: "B" },
                ],
                async run(context) {
                    received.push([...context.realizations]);
                    context.realizations.splice(0);
                },
            },
        ]);
        const realizations = [0, 1, 2];

        await checkRuntime.run(realizations);

        expect(received).toEqual([
            [0, 1, 2],
            [0, 1, 2],
        ]);
        expect(realizations).toEqual([0, 1, 2]);
        expect(checkRuntime.getRequestedRealizations()).toEqual([0, 1, 2]);
    });

    test("should keep the params and ensemble a run was started with", async () => {
        let finishFirstStep = () => {};
        const received: { params: { threshold: number }; ensemble: RegularEnsemble }[] = [];
        const checkDefinition: QcCheckDefinition<{ threshold: number }> = {
            name: "Test check",
            defaultParams: { threshold: 1 },
            steps: [
                {
                    name: "Step 1",
                    async run(context) {
                        await new Promise<void>((resolve) => (finishFirstStep = resolve));
                        for (const realization of context.realizations) {
                            context.reportRealizationResult(realization, { kind: "success", metrics: undefined });
                        }
                    },
                },
                {
                    name: "Step 2",
                    async run(context) {
                        received.push({ params: context.params, ensemble: context.ensemble });
                    },
                },
            ],
        };
        const checkRuntime = new QcCheckRuntime("test-check", checkDefinition, ENSEMBLE, queryClient);
        const rebuiltEnsemble = new RegularEnsemble(
            "DROGON",
            ["DROGON"],
            "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
            "case",
            "ens1",
            "sc",
            [0, 1, 2],
            [],
            null,
            null,
            "",
        );

        const run = checkRuntime.run([0, 1]);
        checkRuntime.setParams({ threshold: 2 });
        checkRuntime.setEnsemble(rebuiltEnsemble);
        finishFirstStep();
        await run;

        expect(received).toHaveLength(1);
        expect(received[0].params).toEqual({ threshold: 1 });
        expect(received[0].ensemble).toBe(ENSEMBLE);
    });

    test("should retry a failed request on re-run instead of reusing its cached error", async () => {
        let attempts = 0;
        const outcomes: string[] = [];
        const checkRuntime = makeCheckRuntime([
            {
                name: "Fetching step",
                async run(context) {
                    try {
                        const value = await context.fetchQuery({
                            queryKey: ["flaky-key"],
                            queryFn: async () => {
                                attempts++;
                                if (attempts === 1) {
                                    throw new Error("Backend unavailable");
                                }
                                return "ok";
                            },
                            retry: false,
                        });
                        outcomes.push(value);
                    } catch (error) {
                        outcomes.push(error instanceof Error ? error.message : String(error));
                    }
                },
            },
        ]);

        await checkRuntime.run([0]);
        await checkRuntime.run([0]);

        expect(outcomes).toEqual(["Backend unavailable", "ok"]);
        expect(attempts).toBe(2);
    });
});
