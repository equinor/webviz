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
}

export type QcCheckRuntimeTopicPayloads<TMetrics> = {
    [QcCheckRuntimeTopic.RESULTS]: {
        realization: number;
        result: QcCheckRealizationResult<TMetrics>;
    }[];
};

export type QcCheckDefinition<TMetrics = unknown, TParams = void> = {
    run(context: QcCheckRunContext<TMetrics, TParams>): Promise<void>;

    defaultParams: TParams;
    name: string;
};

export class QcCheckRuntime<TMetrics = unknown, TParams = unknown> implements PublishSubscribe<
    QcCheckRuntimeTopicPayloads<TMetrics>
> {
    private _id: string;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<QcCheckRuntimeTopicPayloads<TMetrics>>();
    private _ensemble: RegularEnsemble;
    private _checkDefinition: QcCheckDefinition<TMetrics, TParams>;
    private _scopedQueryController: ScopedQueryController;
    private _results: Map<number, QcCheckRealizationResult<TMetrics>> = new Map<
        number,
        QcCheckRealizationResult<TMetrics>
    >();
    private _progressMessages: Map<number, string> = new Map<number, string>();
    private _onFetchCancelOrFinishFn: (() => void) | null = null;

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
    }

    getId(): string {
        return this._id;
    }

    getCheckDefinition(): QcCheckDefinition<TMetrics, TParams> {
        return this._checkDefinition;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<QcCheckRuntimeTopicPayloads<TMetrics>> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof QcCheckRuntimeTopicPayloads<TMetrics>>(
        topic: T,
    ): () => QcCheckRuntimeTopicPayloads<TMetrics>[T] {
        return () => {
            if (topic === QcCheckRuntimeTopic.RESULTS) {
                return Array.from(this._results.entries()).map(([realization, result]) => ({
                    realization,
                    result,
                })) as QcCheckRuntimeTopicPayloads<TMetrics>[T];
            }
            throw new Error(`Unknown topic: ${String(topic)}`);
        };
    }

    getResults(): Map<number, QcCheckRealizationResult<TMetrics>> {
        return this._results;
    }

    private tidyUpFetchRelatedResources(): void {
        // Cancel any resources related to the last ongoing fetch.
        this._scopedQueryController.cancelActiveFetch();
        this._onFetchCancelOrFinishFn?.();
        this._onFetchCancelOrFinishFn = null;
    }

    async run(realizations: readonly number[], params?: TParams): Promise<void> {
        const onFetchCancelOrFinish = (fnc: () => void) => {
            this._onFetchCancelOrFinishFn = fnc;
        };

        const context: QcCheckRunContext<TMetrics, TParams> = {
            ensemble: this._ensemble,
            realizations: realizations as number[],
            params: params ?? this._checkDefinition.defaultParams,
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
            },
        };

        await this._checkDefinition.run(context);
    }
}
