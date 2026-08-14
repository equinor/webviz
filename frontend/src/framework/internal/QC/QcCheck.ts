import type { QueryClient } from "@tanstack/query-core";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";

import type { QcCheckStepDefinition } from "./QcCheckStep";
import { QcCheckStepRuntime } from "./QcCheckStep";

export type { QcCheckRealizationResult, QcCheckTemplateContext } from "./QcCheckStep";

export type QcCheckDefinition<TParams = void> = {
    name: string;
    defaultParams: TParams;
    settingsComponent?: React.ComponentType<{
        ensemble: RegularEnsemble;
        params: TParams;
        onParamsChange: (newParams: TParams) => void;
    }>;
    // Run in sequence, never in parallel (see `QcCheckRuntime.run`) - each step sees its
    // predecessor's per-realization results via `QcCheckStepRunContext.previousStepResults`, and
    // only realizations the predecessor reported as successful are carried into the next step.
    //
    // Steps are registered with their own concrete `TMetrics`, hence `any` here - each step
    // definition itself stays fully typed (see e.g. `HydrostaticEquilibriumGridPropertyCheckStep`).
    steps: QcCheckStepDefinition<any, TParams, any>[];
};

export enum QcCheckRuntimeTopic {
    STATUS = "status",
    PARAMS = "params",
}

export type QcCheckRuntimeStatus = {
    isRunning: boolean;
    requestedRealizations: readonly number[];
};

export type QcCheckRuntimeTopicPayloads<TParams> = {
    [QcCheckRuntimeTopic.STATUS]: QcCheckRuntimeStatus;
    [QcCheckRuntimeTopic.PARAMS]: TParams;
};

export class QcCheckRuntime<TParams = unknown> implements PublishSubscribe<QcCheckRuntimeTopicPayloads<TParams>> {
    private _id: string;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<QcCheckRuntimeTopicPayloads<TParams>>();
    private _ensemble: RegularEnsemble;
    private _checkDefinition: QcCheckDefinition<TParams>;
    private _scopedQueryController: ScopedQueryController;
    private _stepRuntimes: QcCheckStepRuntime[];
    private _onFetchCancelOrFinishFn: (() => void) | null = null;
    private _isRunning: boolean = false;
    private _requestedRealizations: readonly number[] = [];
    // The last-applied params for this check, seeded from its default and only ever replaced
    // wholesale via `setParams` - what a run without an explicit override uses. Shared by every
    // step, since a check's steps are all facets of the same underlying check.
    private _params: TParams;
    // `useSyncExternalStore` (via `usePublishSubscribeTopicValue`) requires `makeSnapshotGetter` to
    // return a referentially stable value when nothing has changed - invalidated (set to `null`)
    // only when the underlying state it represents actually changes.
    private _statusSnapshot: QcCheckRuntimeStatus | null = null;
    // Incremented on every `run()`/`cancel()` call - lets a run loop that's since been superseded
    // by a newer `run()`, or stopped by `cancel()`, notice (once its current step's `await`
    // resolves) that it should stop advancing to further steps.
    private _runGeneration: number = 0;

    constructor(
        id: string,
        checkDefinition: QcCheckDefinition<TParams>,
        ensemble: RegularEnsemble,
        queryClient: QueryClient,
    ) {
        this._id = id;
        this._ensemble = ensemble;
        this._checkDefinition = checkDefinition;
        this._scopedQueryController = new ScopedQueryController(queryClient);
        this._stepRuntimes = checkDefinition.steps.map((stepDefinition) => new QcCheckStepRuntime(stepDefinition));
        this._params = checkDefinition.defaultParams;
    }

    getId(): string {
        return this._id;
    }

    getEnsemble(): RegularEnsemble {
        return this._ensemble;
    }

    getCheckDefinition(): QcCheckDefinition<TParams> {
        return this._checkDefinition;
    }

    /** The check's steps, in the sequence they run in. */
    getStepRuntimes(): QcCheckStepRuntime[] {
        return this._stepRuntimes;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<QcCheckRuntimeTopicPayloads<TParams>> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof QcCheckRuntimeTopicPayloads<TParams>>(
        topic: T,
    ): () => QcCheckRuntimeTopicPayloads<TParams>[T] {
        return () => {
            if (topic === QcCheckRuntimeTopic.STATUS) {
                if (!this._statusSnapshot) {
                    this._statusSnapshot = {
                        isRunning: this._isRunning,
                        requestedRealizations: this._requestedRealizations,
                    };
                }
                return this._statusSnapshot as QcCheckRuntimeTopicPayloads<TParams>[T];
            }
            if (topic === QcCheckRuntimeTopic.PARAMS) {
                return this._params as QcCheckRuntimeTopicPayloads<TParams>[T];
            }
            throw new Error(`Unknown topic: ${String(topic)}`);
        };
    }

    isRunning(): boolean {
        return this._isRunning;
    }

    getRequestedRealizations(): readonly number[] {
        return this._requestedRealizations;
    }

    getParams(): TParams {
        return this._params;
    }

    /** Commits new params, which `run()` uses from then on. */
    setParams(params: TParams): void {
        this._params = params;
        this._publishSubscribeDelegate.notifySubscribers(QcCheckRuntimeTopic.PARAMS);
    }

    private tidyUpFetchRelatedResources(): void {
        // Cancel any resources related to the last ongoing fetch.
        this._scopedQueryController.cancelActiveFetch();
        this._onFetchCancelOrFinishFn?.();
        this._onFetchCancelOrFinishFn = null;
    }

    private setIsRunning(isRunning: boolean): void {
        this._isRunning = isRunning;
        this._statusSnapshot = null;
        this._publishSubscribeDelegate.notifySubscribers(QcCheckRuntimeTopic.STATUS);
    }

    /** Cancels the currently running check, if any - including any steps still to come. */
    cancel(): void {
        if (!this._isRunning) {
            return;
        }
        this._runGeneration++;
        this.tidyUpFetchRelatedResources();
        this.setIsRunning(false);
    }

    async run(realizations: readonly number[]): Promise<void> {
        // Cancel a previous in-flight run (if any) before starting a new one.
        this.tidyUpFetchRelatedResources();

        this._runGeneration++;
        const generation = this._runGeneration;

        // Clear results/progress left over from a previous run for every step (not just the ones
        // this run will reach), so a step further down the sequence doesn't keep showing stale
        // results from a previous run that got further than this one does. Also reconciles each
        // step's matrix-coordinate entries against the current params (see
        // `QcCheckStepRuntime.reset`).
        for (const stepRuntime of this._stepRuntimes) {
            stepRuntime.reset(this._params);
        }

        const onFetchCancelOrFinish = (fnc: () => void) => {
            this._onFetchCancelOrFinishFn = fnc;
        };

        this._requestedRealizations = realizations;
        this.setIsRunning(true);

        try {
            // Only a realization a step reported as a success (for a given matrix coordinate) is
            // carried into the next step for that same coordinate - a realization that errored out
            // (or was never reached because every realization ahead of it already failed) doesn't
            // get a further chance to succeed downstream. All of that bookkeeping - including
            // per-matrix-coordinate carry-forward - lives on `QcCheckStepRuntime` itself; this loop
            // just hands each step its predecessor and lets it figure out the rest.
            let previousStepRuntime: QcCheckStepRuntime | null = null;

            for (const stepRuntime of this._stepRuntimes) {
                if (generation !== this._runGeneration) {
                    return;
                }

                await stepRuntime.run({
                    checkRealizations: realizations,
                    previousStepRuntime,
                    params: this._params,
                    ensemble: this._ensemble,
                    fetchQuery: this._scopedQueryController.fetchQuery.bind(this._scopedQueryController),
                    onFetchCancelOrFinish,
                });

                if (generation !== this._runGeneration) {
                    return;
                }

                previousStepRuntime = stepRuntime;
            }
        } finally {
            // A stale/cancelled run's `cancel()` (or the newer `run()` that superseded it) has
            // already flipped `isRunning` off - don't flip a newer run's own state back off here.
            if (generation === this._runGeneration) {
                this.setIsRunning(false);
            }
        }
    }
}
