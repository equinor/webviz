import type { QueryClient } from "@tanstack/query-core";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";

import { QcCheckCleanupScope } from "./QcCheckCleanupScope";
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
    // Run in sequence; only realizations that succeeded in a step are carried into the next.
    // `any` since each step has its own metrics type.
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
    // Cleanup scopes of step invocations that haven't finished yet
    private _activeCleanupScopes: Set<QcCheckCleanupScope> = new Set();
    private _isRunning: boolean = false;
    private _requestedRealizations: readonly number[] = [];
    // Shared by every step
    private _params: TParams;
    // Cached so the snapshot stays referentially stable for `useSyncExternalStore`
    private _statusSnapshot: QcCheckRuntimeStatus | null = null;
    // Bumped on every run/cancel - a run whose generation is outdated stops and may no longer write results
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

    /** Swaps in a rebuilt instance of the same ensemble, keeping the results. */
    setEnsemble(ensemble: RegularEnsemble): void {
        this._ensemble = ensemble;
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
        this._scopedQueryController.cancelActiveFetch();
        for (const cleanupScope of Array.from(this._activeCleanupScopes)) {
            cleanupScope.run();
        }
    }

    // A scope for an outdated run is returned already run, so its callbacks are called right away
    private makeCleanupScope(generation: number): QcCheckCleanupScope {
        const cleanupScope = new QcCheckCleanupScope(() => this._activeCleanupScopes.delete(cleanupScope));
        if (generation !== this._runGeneration) {
            cleanupScope.run();
        } else {
            this._activeCleanupScopes.add(cleanupScope);
        }
        return cleanupScope;
    }

    private setIsRunning(isRunning: boolean): void {
        this._isRunning = isRunning;
        this._statusSnapshot = null;
        this._publishSubscribeDelegate.notifySubscribers(QcCheckRuntimeTopic.STATUS);
    }

    /** Cancels the currently running check, if any. */
    cancel(): void {
        // Also when not running, so no cleanup is left behind (e.g. when the session is destroyed)
        this.tidyUpFetchRelatedResources();
        if (!this._isRunning) {
            return;
        }
        this._runGeneration++;
        for (const stepRuntime of this._stepRuntimes) {
            stepRuntime.markStopped();
        }
        this.setIsRunning(false);
    }

    /** Never rejects, so it can be started without awaiting it. */
    async run(realizations: readonly number[]): Promise<void> {
        // Cancel a previous run, if any
        this.tidyUpFetchRelatedResources();

        this._runGeneration++;
        const generation = this._runGeneration;

        const createCleanupScope = () => this.makeCleanupScope(generation);
        // False once this run is cancelled or superseded
        const isCurrent = () => generation === this._runGeneration;

        this._requestedRealizations = realizations;
        this.setIsRunning(true);

        try {
            // Clear every step first, so no step keeps results from a previous run - even if updating a
            // step's coordinates below throws
            for (const stepRuntime of this._stepRuntimes) {
                stepRuntime.clearResults();
            }
            for (const stepRuntime of this._stepRuntimes) {
                stepRuntime.updateCoordinates(this._params);
            }

            let previousStepRuntime: QcCheckStepRuntime | null = null;

            for (const stepRuntime of this._stepRuntimes) {
                if (!isCurrent()) {
                    return;
                }

                await stepRuntime.run({
                    checkRealizations: realizations,
                    previousStepRuntime,
                    params: this._params,
                    ensemble: this._ensemble,
                    fetchQuery: this._scopedQueryController.fetchQuery.bind(this._scopedQueryController),
                    createCleanupScope,
                    isCurrent,
                });

                if (!isCurrent()) {
                    return;
                }

                previousStepRuntime = stepRuntime;
            }
        } catch (error) {
            // Errors thrown inside steps are already reported as exception results
            console.error(`QC check "${this._checkDefinition.name}" failed:`, error);
        } finally {
            // An outdated run must not change the state of the newer one
            if (isCurrent()) {
                this.setIsRunning(false);
            }
        }
    }
}
