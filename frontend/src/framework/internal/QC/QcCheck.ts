import type { QueryClient } from "@tanstack/query-core";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { ScopedQueryController } from "@lib/utils/ScopedQueryController";

export type QcCheckRealizationResult<TMetrics> =
    | {
          kind: "success";
          metrics: TMetrics;
      }
    | {
          kind: "error";
          errorMessage: string;
      };

export type QcCheckRunContext<TMetrics, TParams> = {
    ensemble: RegularEnsemble;
    realizations: number[];
    params: TParams;
    fetchQuery: ScopedQueryController["fetchQuery"];
    onFetchCancelOrFinish: (callback: () => void) => void;
    setProgressMessage: (message: string, realization?: number) => void;
    reportRealizationResult: (realization: number, result: QcCheckRealizationResult<TMetrics>) => void;
};

export enum QcCheckRuntimeTopic {
    RESULTS = "results",
    STATUS = "status",
    PARAMS = "params",
}

export type QcCheckRuntimeStatus = {
    isRunning: boolean;
    requestedRealizations: readonly number[];
};

export type QcCheckRuntimeTopicPayloads<TMetrics, TParams> = {
    [QcCheckRuntimeTopic.RESULTS]: {
        realization: number;
        result: QcCheckRealizationResult<TMetrics>;
    }[];
    [QcCheckRuntimeTopic.STATUS]: QcCheckRuntimeStatus;
    [QcCheckRuntimeTopic.PARAMS]: TParams;
};

export type QcCheckDefinition<TMetrics = unknown, TParams = void> = {
    run(context: QcCheckRunContext<TMetrics, TParams>): Promise<void>;

    defaultParams: TParams;
    name: string;
    settingsComponent?: React.ComponentType<{
        ensemble: RegularEnsemble;
        params: TParams;
        onParamsChange: (newParams: TParams) => void;
    }>;
    // Renders a single realization's successful result (e.g. as a table) in the realization-result
    // popover. Falls back to a generic JSON dump when a check doesn't provide one.
    resultComponent?: React.ComponentType<{ metrics: TMetrics }>;
};

export class QcCheckRuntime<TMetrics = unknown, TParams = unknown> implements PublishSubscribe<
    QcCheckRuntimeTopicPayloads<TMetrics, TParams>
> {
    private _id: string;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<QcCheckRuntimeTopicPayloads<TMetrics, TParams>>();
    private _ensemble: RegularEnsemble;
    private _checkDefinition: QcCheckDefinition<TMetrics, TParams>;
    private _scopedQueryController: ScopedQueryController;
    private _results: Map<number, QcCheckRealizationResult<TMetrics>> = new Map<
        number,
        QcCheckRealizationResult<TMetrics>
    >();
    private _progressMessages: Map<number, string> = new Map<number, string>();
    private _onFetchCancelOrFinishFn: (() => void) | null = null;
    private _isRunning: boolean = false;
    private _requestedRealizations: readonly number[] = [];
    // The last-applied params for this check, seeded from its default and only ever replaced
    // wholesale via `setParams` - what a run without an explicit override uses.
    private _params: TParams;
    // `useSyncExternalStore` (via `usePublishSubscribeTopicValue`) requires `makeSnapshotGetter` to
    // return a referentially stable value when nothing has changed - these caches are invalidated
    // (set to `null`) only when the underlying state they represent actually changes.
    private _resultsSnapshot: QcCheckRuntimeTopicPayloads<TMetrics, TParams>[QcCheckRuntimeTopic.RESULTS] | null =
        null;
    private _statusSnapshot: QcCheckRuntimeStatus | null = null;

    constructor(
        id: string,
        checkDefinition: QcCheckDefinition<TMetrics, TParams>,
        ensemble: RegularEnsemble,
        queryClient: QueryClient,
    ) {
        this._id = id;
        this._ensemble = ensemble;
        this._checkDefinition = checkDefinition;
        this._scopedQueryController = new ScopedQueryController(queryClient);
        this._results = new Map();
        this._params = checkDefinition.defaultParams;
    }

    getId(): string {
        return this._id;
    }

    getEnsemble(): RegularEnsemble {
        return this._ensemble;
    }

    getCheckDefinition(): QcCheckDefinition<TMetrics, TParams> {
        return this._checkDefinition;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<QcCheckRuntimeTopicPayloads<TMetrics, TParams>> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof QcCheckRuntimeTopicPayloads<TMetrics, TParams>>(
        topic: T,
    ): () => QcCheckRuntimeTopicPayloads<TMetrics, TParams>[T] {
        return () => {
            if (topic === QcCheckRuntimeTopic.RESULTS) {
                if (!this._resultsSnapshot) {
                    this._resultsSnapshot = Array.from(this._results.entries()).map(([realization, result]) => ({
                        realization,
                        result,
                    }));
                }
                return this._resultsSnapshot as QcCheckRuntimeTopicPayloads<TMetrics, TParams>[T];
            }
            if (topic === QcCheckRuntimeTopic.STATUS) {
                if (!this._statusSnapshot) {
                    this._statusSnapshot = {
                        isRunning: this._isRunning,
                        requestedRealizations: this._requestedRealizations,
                    };
                }
                return this._statusSnapshot as QcCheckRuntimeTopicPayloads<TMetrics, TParams>[T];
            }
            if (topic === QcCheckRuntimeTopic.PARAMS) {
                return this._params as QcCheckRuntimeTopicPayloads<TMetrics, TParams>[T];
            }
            throw new Error(`Unknown topic: ${String(topic)}`);
        };
    }

    getResults(): Map<number, QcCheckRealizationResult<TMetrics>> {
        return this._results;
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

    /** Cancels the currently running check, if any. */
    cancel(): void {
        if (!this._isRunning) {
            return;
        }
        this.tidyUpFetchRelatedResources();
        this.setIsRunning(false);
    }

    async run(realizations: readonly number[]): Promise<void> {
        // Cancel a previous in-flight run (if any) before starting a new one.
        this.tidyUpFetchRelatedResources();

        // Clear results/progress left over from a previous run, so realizations don't keep showing a
        // stale pass/fail status while this run is still working on them.
        this._results.clear();
        this._resultsSnapshot = null;
        this._progressMessages.clear();
        this._publishSubscribeDelegate.notifySubscribers(QcCheckRuntimeTopic.RESULTS);

        const onFetchCancelOrFinish = (fnc: () => void) => {
            this._onFetchCancelOrFinishFn = fnc;
        };

        this._requestedRealizations = realizations;
        this.setIsRunning(true);

        const context: QcCheckRunContext<TMetrics, TParams> = {
            ensemble: this._ensemble,
            realizations: realizations as number[],
            params: this._params,
            fetchQuery: this._scopedQueryController.fetchQuery.bind(this._scopedQueryController),
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
                this._publishSubscribeDelegate.notifySubscribers(QcCheckRuntimeTopic.RESULTS);
            },
        };

        try {
            await this._checkDefinition.run(context);
        } finally {
            this.setIsRunning(false);
        }
    }
}
