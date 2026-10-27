import { CancelledError } from "@tanstack/react-query";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { Template } from "@framework/TemplateRegistry";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import type { ScopedQueryController } from "@lib/utils/ScopedQueryController";

import type { QcCheckCleanupScope } from "./QcCheckCleanupScope";

export type QcCheckRealizationResult<TMetrics> =
    | {
          kind: "success";
          metrics: TMetrics;
      }
    // The check ran, but the realization didn't pass
    | {
          kind: "failure";
          metrics: TMetrics;
          reason: string;
      }
    // The check couldn't be completed for the realization (e.g. a backend error)
    | {
          kind: "exception";
          errorMessage: string;
      };

// A step's realizations and results, for tailoring templates to a specific run
export type QcCheckTemplateContext<TMetrics> = {
    realizations: readonly number[];
    results: ReadonlyMap<number, QcCheckRealizationResult<TMetrics>>;
};

// One item a matrixed step runs for (e.g. one grid)
export type QcCheckMatrixCoordinate = {
    // Matches coordinates across runs and between consecutive steps
    key: string;
    label: string;
};

// A step's results for one coordinate - `coordinate` is `null` for a non-matrixed step
export type QcCheckCoordinateResults<TMetrics> = {
    coordinate: QcCheckMatrixCoordinate | null;
    results: ReadonlyMap<number, QcCheckRealizationResult<TMetrics>>;
};

export type QcCheckStepRunContext<TMetrics, TParams, TPreviousMetrics = unknown> = {
    ensemble: RegularEnsemble;
    realizations: number[];
    params: TParams;
    // The coordinate being run, or `null` if the step isn't matrixed
    matrixCoordinate: QcCheckMatrixCoordinate | null;
    fetchQuery: ScopedQueryController["fetchQuery"];
    // Called once when this invocation finishes or is cancelled
    onFetchCancelOrFinish: (callback: () => void) => void;
    setProgressMessage: (message: string, realization?: number) => void;
    reportRealizationResult: (realization: number, result: QcCheckRealizationResult<TMetrics>) => void;
    // The previous step's results for `realizations` - `null` for the first step. One entry, or one per
    // coordinate when a non-matrixed step follows a step with several coordinates.
    previousStepResults: readonly QcCheckCoordinateResults<TPreviousMetrics>[] | null;
};

export type QcCheckStepDefinition<TMetrics = unknown, TParams = void, TPreviousMetrics = unknown> = {
    run(context: QcCheckStepRunContext<TMetrics, TParams, TPreviousMetrics>): Promise<void>;

    name: string;
    // Shows a realization's metrics in the result popover (falls back to JSON)
    resultComponent?: React.ComponentType<{ metrics: TMetrics }>;
    // Templates offered to investigate the results of a run
    templates?: (context: QcCheckTemplateContext<TMetrics>) => Template[];
    // Makes the step run once per returned coordinate (e.g. once per grid). Method shorthand, so
    // steps with different `TParams` can be assigned to `QcCheckDefinition.steps`.
    matrixCoordinates?(params: TParams): QcCheckMatrixCoordinate[];
};

export enum QcCheckStepTopic {
    RESULTS = "results",
    STATUS = "status",
}

export type QcCheckStepStatus = {
    isRunning: boolean;
    hasRun: boolean;
    // No realizations were carried over from the previous step
    skipped: boolean;
    requestedRealizations: readonly number[];
};

export type QcCheckStepTopicPayloads<TMetrics> = {
    [QcCheckStepTopic.RESULTS]: { realization: number; result: QcCheckRealizationResult<TMetrics> }[];
    [QcCheckStepTopic.STATUS]: QcCheckStepStatus;
};

export type QcCheckStepMatrixRunOptions<TParams, TPreviousMetrics> = {
    realizations: readonly number[];
    params: TParams;
    ensemble: RegularEnsemble;
    fetchQuery: ScopedQueryController["fetchQuery"];
    createCleanupScope: () => QcCheckCleanupScope;
    // False once the check run is cancelled or superseded - the invocation may then no longer change this matrix
    isCurrent: () => boolean;
    previousStepResults: readonly QcCheckCoordinateResults<TPreviousMetrics>[] | null;
    matrixCoordinate: QcCheckMatrixCoordinate | null;
};

// Runs a step for one matrix coordinate (e.g. one grid) and holds its result for each realization.
// A step that isn't matrixed has exactly one of these.
export class QcCheckStepMatrixRuntime<
    TMetrics = unknown,
    TParams = unknown,
    TPreviousMetrics = unknown,
> implements PublishSubscribe<QcCheckStepTopicPayloads<TMetrics>> {
    private _stepDefinition: QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics>;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<QcCheckStepTopicPayloads<TMetrics>>();
    private _results: Map<number, QcCheckRealizationResult<TMetrics>> = new Map();
    private _progressMessages: Map<number, string> = new Map();
    private _isRunning: boolean = false;
    private _hasRun: boolean = false;
    private _skipped: boolean = false;
    private _requestedRealizations: readonly number[] = [];
    private _matrixCoordinate: QcCheckMatrixCoordinate | null = null;
    // Cached so the snapshots stay referentially stable for `useSyncExternalStore`
    private _resultsSnapshot: QcCheckStepTopicPayloads<TMetrics>[QcCheckStepTopic.RESULTS] | null = null;
    private _statusSnapshot: QcCheckStepStatus | null = null;

    constructor(stepDefinition: QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics>) {
        this._stepDefinition = stepDefinition;
    }

    getStepDefinition(): QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics> {
        return this._stepDefinition;
    }

    getMatrixCoordinate(): QcCheckMatrixCoordinate | null {
        return this._matrixCoordinate;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<QcCheckStepTopicPayloads<TMetrics>> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof QcCheckStepTopicPayloads<TMetrics>>(
        topic: T,
    ): () => QcCheckStepTopicPayloads<TMetrics>[T] {
        return () => {
            if (topic === QcCheckStepTopic.RESULTS) {
                if (!this._resultsSnapshot) {
                    this._resultsSnapshot = Array.from(this._results.entries()).map(([realization, result]) => ({
                        realization,
                        result,
                    }));
                }
                return this._resultsSnapshot as QcCheckStepTopicPayloads<TMetrics>[T];
            }
            if (topic === QcCheckStepTopic.STATUS) {
                if (!this._statusSnapshot) {
                    this._statusSnapshot = {
                        isRunning: this._isRunning,
                        hasRun: this._hasRun,
                        skipped: this._skipped,
                        requestedRealizations: this._requestedRealizations,
                    };
                }
                return this._statusSnapshot as QcCheckStepTopicPayloads<TMetrics>[T];
            }
            throw new Error(`Unknown topic: ${String(topic)}`);
        };
    }

    getResults(): ReadonlyMap<number, QcCheckRealizationResult<TMetrics>> {
        return this._results;
    }

    isRunning(): boolean {
        return this._isRunning;
    }

    hasRun(): boolean {
        return this._hasRun;
    }

    isSkipped(): boolean {
        return this._skipped;
    }

    getRequestedRealizations(): readonly number[] {
        return this._requestedRealizations;
    }

    private notifyStatus(): void {
        this._statusSnapshot = null;
        this._publishSubscribeDelegate.notifySubscribers(QcCheckStepTopic.STATUS);
    }

    /** Clears the results and marks the matrix as not run. */
    reset(): void {
        this._results.clear();
        this._resultsSnapshot = null;
        this._progressMessages.clear();
        this._isRunning = false;
        this._hasRun = false;
        this._skipped = false;
        this._requestedRealizations = [];
        this._publishSubscribeDelegate.notifySubscribers(QcCheckStepTopic.RESULTS);
        this.notifyStatus();
    }

    /** Marks the matrix as skipped, since no realizations were carried over from the previous step. */
    markSkipped(): void {
        this._skipped = true;
        this._hasRun = true;
        this.notifyStatus();
    }

    /** Marks the matrix as no longer running after the check run was cancelled. */
    markStopped(): void {
        if (!this._isRunning) {
            return;
        }
        this._isRunning = false;
        this.notifyStatus();
    }

    async run(options: QcCheckStepMatrixRunOptions<TParams, TPreviousMetrics>): Promise<void> {
        const {
            realizations,
            params,
            ensemble,
            fetchQuery,
            createCleanupScope,
            isCurrent,
            previousStepResults,
            matrixCoordinate,
        } = options;

        this._matrixCoordinate = matrixCoordinate;
        this._requestedRealizations = realizations;
        this._hasRun = true;
        this._isRunning = true;
        this.notifyStatus();

        const cleanupScope = createCleanupScope();

        const context: QcCheckStepRunContext<TMetrics, TParams, TPreviousMetrics> = {
            ensemble,
            realizations: realizations as number[],
            params,
            matrixCoordinate,
            fetchQuery,
            onFetchCancelOrFinish: (callback: () => void) => cleanupScope.add(callback),
            setProgressMessage: (message: string, realization?: number) => {
                if (!isCurrent()) {
                    return;
                }
                if (realization !== undefined) {
                    this._progressMessages.set(realization, message);
                    return;
                }
                realizations.forEach((r) => {
                    this._progressMessages.set(r, message);
                });
            },
            reportRealizationResult: (realization: number, result: QcCheckRealizationResult<TMetrics>) => {
                if (!isCurrent()) {
                    return;
                }
                this._results.set(realization, result);
                this._resultsSnapshot = null;
                this._publishSubscribeDelegate.notifySubscribers(QcCheckStepTopic.RESULTS);
            },
            previousStepResults,
        };

        try {
            await this._stepDefinition.run(context);
        } catch (error) {
            if (error instanceof CancelledError || !isCurrent()) {
                return;
            }

            // Report the realizations the step didn't get to as exceptions, so none is left without a result
            console.error(`QC check step "${this._stepDefinition.name}" failed:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            for (const realization of realizations) {
                if (!this._results.has(realization)) {
                    context.reportRealizationResult(realization, { kind: "exception", errorMessage });
                }
            }
        } finally {
            cleanupScope.run();
            // An outdated invocation must not stop a newer run
            if (isCurrent()) {
                this._isRunning = false;
                this.notifyStatus();
            }
        }
    }
}

export type QcCheckStepMatrixEntry<TMetrics = unknown, TParams = unknown, TPreviousMetrics = unknown> = {
    // `null` for a non-matrixed step
    coordinate: QcCheckMatrixCoordinate | null;
    runtime: QcCheckStepMatrixRuntime<TMetrics, TParams, TPreviousMetrics>;
};

export enum QcCheckStepGroupTopic {
    // Fires only when the set of coordinates changes between runs
    COORDINATES = "coordinates",
}

export type QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics> = {
    [QcCheckStepGroupTopic.COORDINATES]: QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics>[];
};

// Internal key for a non-matrixed step's single entry
const SINGLE_ENTRY_KEY = "__single__";

function entryKey(coordinate: QcCheckMatrixCoordinate | null): string {
    return coordinate?.key ?? SINGLE_ENTRY_KEY;
}

// What a step's entry gets from the previous step
type QcCheckCarriedInput<TPreviousMetrics> = Pick<
    QcCheckStepMatrixRunOptions<unknown, TPreviousMetrics>,
    "realizations" | "previousStepResults"
>;

function getSuccessfulRealizations(results: ReadonlyMap<number, QcCheckRealizationResult<unknown>>): number[] {
    const realizations: number[] = [];
    for (const [realization, result] of results) {
        if (result.kind === "success") {
            realizations.push(realization);
        }
    }
    return realizations;
}

// Only the given realizations' results
function pickResults<TMetrics>(
    results: ReadonlyMap<number, QcCheckRealizationResult<TMetrics>>,
    realizations: readonly number[],
): ReadonlyMap<number, QcCheckRealizationResult<TMetrics>> {
    const picked = new Map<number, QcCheckRealizationResult<TMetrics>>();
    for (const realization of realizations) {
        const result = results.get(realization);
        if (result) {
            picked.set(realization, result);
        }
    }
    return picked;
}

// One step of a check, with one entry per matrix coordinate (a single entry if the step isn't matrixed).
// Entries are reused across runs while their coordinate keys stay the same.
export class QcCheckStepRuntime<
    TMetrics = unknown,
    TParams = unknown,
    TPreviousMetrics = unknown,
> implements PublishSubscribe<QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>> {
    private _stepDefinition: QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics>;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<
        QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>
    >();
    private _entries: QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics>[];
    private _entriesSnapshot: QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics>[] | null = null;

    constructor(stepDefinition: QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics>) {
        this._stepDefinition = stepDefinition;
        this._entries = [{ coordinate: null, runtime: new QcCheckStepMatrixRuntime(stepDefinition) }];
    }

    getStepDefinition(): QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics> {
        return this._stepDefinition;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<
        QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>
    > {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>>(
        topic: T,
    ): () => QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>[T] {
        return () => {
            if (topic === QcCheckStepGroupTopic.COORDINATES) {
                if (!this._entriesSnapshot) {
                    this._entriesSnapshot = this._entries;
                }
                return this._entriesSnapshot as QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>[T];
            }
            throw new Error(`Unknown topic: ${String(topic)}`);
        };
    }

    /** The step's matrix entries - always at least one. */
    getEntries(): QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics>[] {
        return this._entries;
    }

    /** Rebuilds the entries from the params for a new run, reusing entries whose coordinate key is unchanged. */
    reset(params: TParams): void {
        const coordinates = this._stepDefinition.matrixCoordinates?.(params) ?? null;
        const nextCoordinates: (QcCheckMatrixCoordinate | null)[] =
            coordinates && coordinates.length > 0 ? coordinates : [null];
        const nextKeys = nextCoordinates.map(entryKey);
        const prevKeys = this._entries.map((entry) => entryKey(entry.coordinate));

        const keysChanged = nextKeys.length !== prevKeys.length || nextKeys.some((key, i) => key !== prevKeys[i]);

        if (!keysChanged) {
            this._entries.forEach((entry) => entry.runtime.reset());
            return;
        }

        const existingByKey = new Map(this._entries.map((entry) => [entryKey(entry.coordinate), entry]));
        this._entries = nextCoordinates.map((coordinate) => {
            const existing = existingByKey.get(entryKey(coordinate));
            if (existing) {
                existing.runtime.reset();
                return existing;
            }
            return {
                coordinate,
                runtime: new QcCheckStepMatrixRuntime<TMetrics, TParams, TPreviousMetrics>(this._stepDefinition),
            };
        });
        this._entriesSnapshot = null;
        this._publishSubscribeDelegate.notifySubscribers(QcCheckStepGroupTopic.COORDINATES);
    }

    private getEntryForCoordinateKey(
        key: string,
    ): QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics> | undefined {
        // A single entry matches any key
        if (this._entries.length === 1) {
            return this._entries[0];
        }
        return this._entries.find((entry) => entryKey(entry.coordinate) === key);
    }

    /**
     * What the next step's entry for `coordinate` gets: the realizations that succeeded here for the same
     * coordinate, with their results. A non-matrixed next step after several coordinates gets the realizations
     * that succeeded for every coordinate, with each coordinate's results.
     */
    getCarriedInput(coordinate: QcCheckMatrixCoordinate | null): QcCheckCarriedInput<TMetrics> {
        const sourceEntries =
            coordinate === null && this._entries.length > 1
                ? this._entries
                : [this.getEntryForCoordinateKey(entryKey(coordinate))].filter((entry) => entry !== undefined);

        const successfulSets = sourceEntries.map(
            (entry) => new Set(getSuccessfulRealizations(entry.runtime.getResults())),
        );
        const realizations = Array.from(successfulSets[0] ?? []).filter((realization) =>
            successfulSets.every((successful) => successful.has(realization)),
        );

        return {
            realizations,
            previousStepResults: sourceEntries.map((entry) => ({
                coordinate: entry.coordinate,
                results: pickResults(entry.runtime.getResults(), realizations),
            })),
        };
    }

    /** Marks every running entry as stopped after the check run was cancelled. */
    markStopped(): void {
        this._entries.forEach((entry) => entry.runtime.markStopped());
    }

    /**
     * Runs the entries one after another. The first step runs `checkRealizations`; later steps get their
     * realizations from the previous step.
     */
    async run(options: {
        checkRealizations: readonly number[];
        previousStepRuntime: QcCheckStepRuntime | null;
        params: TParams;
        ensemble: RegularEnsemble;
        fetchQuery: ScopedQueryController["fetchQuery"];
        createCleanupScope: () => QcCheckCleanupScope;
        isCurrent: () => boolean;
    }): Promise<void> {
        const { checkRealizations, previousStepRuntime, params, ensemble, fetchQuery, createCleanupScope, isCurrent } =
            options;

        for (const entry of this._entries) {
            // A cancelled entry can still return normally, so check before starting the next one
            if (!isCurrent()) {
                return;
            }

            const carriedInput = (previousStepRuntime?.getCarriedInput(entry.coordinate) ?? {
                realizations: checkRealizations,
                previousStepResults: null,
            }) as QcCheckCarriedInput<TPreviousMetrics>;

            if (carriedInput.realizations.length === 0) {
                entry.runtime.markSkipped();
                continue;
            }

            await entry.runtime.run({
                ...carriedInput,
                params,
                ensemble,
                fetchQuery,
                createCleanupScope,
                isCurrent,
                matrixCoordinate: entry.coordinate,
            });
        }
    }
}
