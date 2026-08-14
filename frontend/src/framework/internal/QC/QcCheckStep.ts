import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { Template } from "@framework/TemplateRegistry";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import type { ScopedQueryController } from "@lib/utils/ScopedQueryController";

export type QcCheckRealizationResult<TMetrics> =
    | {
          kind: "success";
          metrics: TMetrics;
      }
    | {
          kind: "error";
          errorMessage: string;
      };

// Used by `templates` - a step's realizations/results, as needed to tailor a template (e.g. seed a
// data provider's initial settings, or pre-constrain an elevated setting one of its modules
// consumes via `Template.applyElevatedSettings`) to this specific run rather than the step in the
// abstract.
export type QcCheckTemplateContext<TMetrics> = {
    realizations: readonly number[];
    results: ReadonlyMap<number, QcCheckRealizationResult<TMetrics>>;
};

// One point in a step's parameter matrix (e.g. one selected grid) - a step that declares
// `matrixCoordinates` runs once per coordinate, each with its own independent realization matrix
// (see `QcCheckStepRuntime`).
export type QcCheckMatrixCoordinate = {
    // Stable identity, used to correlate a coordinate's matrix runtime across re-runs, and to match
    // it up with the same coordinate in the previous step (see `QcCheckStepRuntime.run`).
    key: string;
    // Display label for this coordinate's own realization-matrix block in the UI.
    label: string;
};

export type QcCheckStepRunContext<TMetrics, TParams, TPreviousMetrics = unknown> = {
    ensemble: RegularEnsemble;
    realizations: number[];
    params: TParams;
    // The coordinate this invocation is running for - non-null exactly when the step definition
    // provides `matrixCoordinates` (one invocation per returned coordinate), `null` otherwise.
    matrixCoordinate: QcCheckMatrixCoordinate | null;
    fetchQuery: ScopedQueryController["fetchQuery"];
    onFetchCancelOrFinish: (callback: () => void) => void;
    setProgressMessage: (message: string, realization?: number) => void;
    reportRealizationResult: (realization: number, result: QcCheckRealizationResult<TMetrics>) => void;
    // The preceding step's per-realization results, for this same matrix coordinate (or the
    // predecessor's one shared result set if it wasn't itself matrixed) - `null` for a check's
    // first step. Only ever contains the realizations this step was itself asked to run:
    // `QcCheckStepRuntime.run` carries a realization forward into the next step only once the
    // current step reported it as a success, so a step never has to re-check whether a given
    // realization's predecessor result succeeded.
    previousStepResults: ReadonlyMap<number, QcCheckRealizationResult<TPreviousMetrics>> | null;
};

export type QcCheckStepDefinition<TMetrics = unknown, TParams = void, TPreviousMetrics = unknown> = {
    run(context: QcCheckStepRunContext<TMetrics, TParams, TPreviousMetrics>): Promise<void>;

    name: string;
    // Renders a single realization's successful result (e.g. as a table) in the realization-result
    // popover. Falls back to a generic JSON dump when a step doesn't provide one.
    resultComponent?: React.ComponentType<{ metrics: TMetrics }>;
    // A function (not a static array) since a template's initial module state can depend on the
    // specific run - e.g. seeding a 3D view's grid provider with the same t0/t1 timestep this step
    // itself compared. Each returned `Template` is responsible for its own elevated settings (see
    // `Template.applyElevatedSettings`) - e.g. restricting a picker to only the values this specific
    // run actually checked.
    templates?: (context: QcCheckTemplateContext<TMetrics>) => Template[];
    // When provided, this step runs once per returned coordinate (e.g. once per selected grid)
    // instead of once overall - each coordinate gets its own independent realization matrix, run in
    // sequence (never in parallel - see `QcCheckStepRuntime.run`). Steps in the same check that need
    // matching coordinates should derive them from the same params via a shared helper, so their
    // coordinate keys always line up.
    //
    // Declared with method shorthand (not as an arrow-typed property) so `TParams` is checked
    // bivariantly here, same as `run`'s own `context.params` - otherwise `QcCheckDefinition.steps`
    // (an array of differently-`TParams`-typed steps, see `QcCheck.ts`) couldn't assign into it.
    matrixCoordinates?(params: TParams): QcCheckMatrixCoordinate[];
};

export enum QcCheckStepTopic {
    RESULTS = "results",
    STATUS = "status",
}

export type QcCheckStepStatus = {
    isRunning: boolean;
    // `false` until this coordinate's parent check has kicked off a run that reached it at least
    // once - lets the UI tell "never run" apart from "ran and produced zero results".
    hasRun: boolean;
    // `true` when this coordinate didn't run because none of the realizations carried forward from
    // its predecessor succeeded (see `QcCheckStepRuntime.run`).
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
    onFetchCancelOrFinish: (callback: () => void) => void;
    previousStepResults: ReadonlyMap<number, QcCheckRealizationResult<TPreviousMetrics>> | null;
    matrixCoordinate: QcCheckMatrixCoordinate | null;
};

// Owns exactly one realization matrix - either a whole (non-matrixed) step, or one coordinate of a
// matrixed step's parameter matrix. A check's steps run one after the other (never in parallel -
// see `QcCheckRuntime.run`), and so does each matrixed step's own coordinates (see
// `QcCheckStepRuntime.run`) - this class itself doesn't know or care which of those two cases it's
// in, it just publishes its own results/status to any subscribed UI.
export class QcCheckStepMatrixRuntime<TMetrics = unknown, TParams = unknown, TPreviousMetrics = unknown>
    implements PublishSubscribe<QcCheckStepTopicPayloads<TMetrics>>
{
    private _stepDefinition: QcCheckStepDefinition<TMetrics, TParams, TPreviousMetrics>;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<QcCheckStepTopicPayloads<TMetrics>>();
    private _results: Map<number, QcCheckRealizationResult<TMetrics>> = new Map();
    private _progressMessages: Map<number, string> = new Map();
    private _isRunning: boolean = false;
    private _hasRun: boolean = false;
    private _skipped: boolean = false;
    private _requestedRealizations: readonly number[] = [];
    private _matrixCoordinate: QcCheckMatrixCoordinate | null = null;
    // See the equivalent caches on `QcCheckRuntime` - `useSyncExternalStore` requires
    // `makeSnapshotGetter` to return a referentially stable value when nothing has changed.
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

    /** Clears this matrix's results/progress and marks it as not-yet-run, for a fresh check run. */
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

    /** Marks this matrix as skipped because none of its predecessor's realizations succeeded. */
    markSkipped(): void {
        this._skipped = true;
        this._hasRun = true;
        this.notifyStatus();
    }

    async run(options: QcCheckStepMatrixRunOptions<TParams, TPreviousMetrics>): Promise<void> {
        const { realizations, params, ensemble, fetchQuery, onFetchCancelOrFinish, previousStepResults, matrixCoordinate } =
            options;

        this._matrixCoordinate = matrixCoordinate;
        this._requestedRealizations = realizations;
        this._hasRun = true;
        this._isRunning = true;
        this.notifyStatus();

        const context: QcCheckStepRunContext<TMetrics, TParams, TPreviousMetrics> = {
            ensemble,
            realizations: realizations as number[],
            params,
            matrixCoordinate,
            fetchQuery,
            onFetchCancelOrFinish,
            setProgressMessage: (message: string, realization?: number) => {
                if (realization !== undefined) {
                    this._progressMessages.set(realization, message);
                    return;
                }
                realizations.forEach((r) => {
                    this._progressMessages.set(r, message);
                });
            },
            reportRealizationResult: (realization: number, result: QcCheckRealizationResult<TMetrics>) => {
                this._results.set(realization, result);
                this._resultsSnapshot = null;
                this._publishSubscribeDelegate.notifySubscribers(QcCheckStepTopic.RESULTS);
            },
            previousStepResults,
        };

        try {
            await this._stepDefinition.run(context);
        } finally {
            this._isRunning = false;
            this.notifyStatus();
        }
    }
}

export type QcCheckStepMatrixEntry<TMetrics = unknown, TParams = unknown, TPreviousMetrics = unknown> = {
    // `null` for a non-matrixed step's one implicit entry.
    coordinate: QcCheckMatrixCoordinate | null;
    runtime: QcCheckStepMatrixRuntime<TMetrics, TParams, TPreviousMetrics>;
};

export enum QcCheckStepGroupTopic {
    // Fires only when the step's set of matrix-coordinate entries actually changes (a coordinate
    // added or removed between runs) - not on every run. The common case (re-running with the same
    // coordinates, or a non-matrixed step) reuses the same `QcCheckStepMatrixRuntime` instances
    // across runs and never fires this; each entry's own RESULTS/STATUS topics (on
    // `QcCheckStepMatrixRuntime`) cover everything else.
    COORDINATES = "coordinates",
}

export type QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics> = {
    [QcCheckStepGroupTopic.COORDINATES]: QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics>[];
};

// A single well-known key for a non-matrixed step's one implicit coordinate - never exposed outside
// this file, just used internally to key `_entries` uniformly regardless of whether the step is
// matrixed.
const SINGLE_ENTRY_KEY = "__single__";

function entryKey(coordinate: QcCheckMatrixCoordinate | null): string {
    return coordinate?.key ?? SINGLE_ENTRY_KEY;
}

// Orchestrates one check step: either a single realization matrix (the common case) or one per
// matrix coordinate (see `QcCheckStepDefinition.matrixCoordinates`) - uniformly represented as a
// list of `QcCheckStepMatrixEntry`, always with at least one entry. Runs its entries in sequence,
// never in parallel (see `run`), and reconciles entries across runs by coordinate key so a
// component already subscribed to an unchanged coordinate's matrix runtime doesn't need to
// re-subscribe when the check is simply re-run with the same selection.
export class QcCheckStepRuntime<TMetrics = unknown, TParams = unknown, TPreviousMetrics = unknown>
    implements PublishSubscribe<QcCheckStepGroupTopicPayloads<TMetrics, TParams, TPreviousMetrics>>
{
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

    /** The step's current matrix entries, in order - always at least one. */
    getEntries(): QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics>[] {
        return this._entries;
    }

    /**
     * Rebuilds this step's matrix entries from `matrixCoordinates?.(params)` for a fresh check run.
     * Coordinates that already have an entry keep their *same* `QcCheckStepMatrixRuntime` instance
     * (just `.reset()`), so already-subscribed UI doesn't need to re-subscribe for the common
     * "re-run with the same selection" case - only reassigns `_entries` and notifies COORDINATES
     * when the coordinate key set actually changed.
     */
    reset(params: TParams): void {
        const coordinates = this._stepDefinition.matrixCoordinates?.(params) ?? null;
        const nextCoordinates: (QcCheckMatrixCoordinate | null)[] = coordinates && coordinates.length > 0 ? coordinates : [null];
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
            return { coordinate, runtime: new QcCheckStepMatrixRuntime<TMetrics, TParams, TPreviousMetrics>(this._stepDefinition) };
        });
        this._entriesSnapshot = null;
        this._publishSubscribeDelegate.notifySubscribers(QcCheckStepGroupTopic.COORDINATES);
    }

    private getEntryForCoordinateKey(key: string): QcCheckStepMatrixEntry<TMetrics, TParams, TPreviousMetrics> | undefined {
        // A non-matrixed step (or one currently reduced to a single coordinate) shares its one
        // entry with any coordinate key a neighboring step asks for - lets a matrixed step read a
        // non-matrixed predecessor's one shared result set, and vice versa.
        if (this._entries.length === 1) {
            return this._entries[0];
        }
        return this._entries.find((entry) => entryKey(entry.coordinate) === key);
    }

    /** This step's own successful realizations for a given coordinate key - `[]` if unknown. */
    getSuccessfulRealizationsForCoordinateKey(key: string): readonly number[] {
        const entry = this.getEntryForCoordinateKey(key);
        if (!entry) {
            return [];
        }
        const realizations: number[] = [];
        for (const [realization, result] of entry.runtime.getResults()) {
            if (result.kind === "success") {
                realizations.push(realization);
            }
        }
        return realizations;
    }

    /** This step's own results for a given coordinate key - `null` if unknown. */
    getResultsForCoordinateKey(key: string): ReadonlyMap<number, QcCheckRealizationResult<TMetrics>> | null {
        return this.getEntryForCoordinateKey(key)?.runtime.getResults() ?? null;
    }

    /**
     * Runs every current entry in sequence (never in parallel - keeps a single in-flight fetch at a
     * time, matching `QcCheckRuntime`'s own single cancel-tracking slot). For the check's first step
     * (`previousStepRuntime === null`) every entry starts from `checkRealizations`; otherwise each
     * entry's carried realizations/previous results come from `previousStepRuntime`'s *same*
     * coordinate key - this is what gives each matrix coordinate its own independent realization
     * matrix end to end: one grid's realization failing never affects a different grid's same
     * realization.
     */
    async run(options: {
        checkRealizations: readonly number[];
        previousStepRuntime: QcCheckStepRuntime | null;
        params: TParams;
        ensemble: RegularEnsemble;
        fetchQuery: ScopedQueryController["fetchQuery"];
        onFetchCancelOrFinish: (callback: () => void) => void;
    }): Promise<void> {
        const { checkRealizations, previousStepRuntime, params, ensemble, fetchQuery, onFetchCancelOrFinish } = options;

        for (const entry of this._entries) {
            const key = entryKey(entry.coordinate);
            const carriedRealizations = previousStepRuntime
                ? previousStepRuntime.getSuccessfulRealizationsForCoordinateKey(key)
                : checkRealizations;

            if (carriedRealizations.length === 0) {
                entry.runtime.markSkipped();
                continue;
            }

            await entry.runtime.run({
                realizations: carriedRealizations,
                params,
                ensemble,
                fetchQuery,
                onFetchCancelOrFinish,
                previousStepResults: (previousStepRuntime?.getResultsForCoordinateKey(key) ??
                    null) as ReadonlyMap<number, QcCheckRealizationResult<TPreviousMetrics>> | null,
                matrixCoordinate: entry.coordinate,
            });
        }
    }
}
