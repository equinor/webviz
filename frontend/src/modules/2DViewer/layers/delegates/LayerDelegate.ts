import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { isDevMode } from "@lib/utils/devMode";
import { QueryClient } from "@tanstack/react-query";

import { SettingsContextDelegateTopic } from "./SettingsContextDelegate";

import { LayerManager, LayerManagerTopic } from "../LayerManager";
import { PublishSubscribe, PublishSubscribeHandler } from "../PublishSubscribeHandler";
import { SharedSetting } from "../SharedSetting";
import { Layer, LayerStatus, Settings, SettingsContext } from "../interfaces";

export enum LayerDelegateTopic {
    STATUS = "STATUS",
    DATA = "DATA",
}

export type LayerDelegatePayloads<TData> = {
    [LayerDelegateTopic.STATUS]: LayerStatus;
    [LayerDelegateTopic.DATA]: TData;
};
export class LayerDelegate<TSettings extends Settings, TData>
    implements PublishSubscribe<LayerDelegateTopic, LayerDelegatePayloads<TData>>
{
    private _owner: Layer<TSettings, TData>;
    private _settingsContext: SettingsContext<TSettings>;
    private _layerManager: LayerManager | null = null;
    private _unsubscribeFuncs: (() => void)[] = [];
    private _cancellationPending: boolean = false;
    private _publishSubscribeHandler = new PublishSubscribeHandler<LayerDelegateTopic>();
    private _queryKeys: unknown[][] = [];
    private _status: LayerStatus = LayerStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;

    constructor(owner: Layer<TSettings, TData>, settingsContext: SettingsContext<TSettings>) {
        this._owner = owner;
        this._settingsContext = settingsContext;
        this._settingsContext
            .getDelegate()
            .getPublishSubscribeHandler()
            .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(() => {
            this.handleSettingsChange();
        });
    }

    handleSettingsChange(): void {
        this._cancellationPending = true;
        if (this._settingsContext.areCurrentSettingsValid()) {
            this.maybeCancelQuery().then(() => {
                this.maybeRefetchData();
            });
        } else {
            this._cancellationPending = false;
        }
    }

    registerQueryKey(queryKey: unknown[]): void {
        this._queryKeys.push(queryKey);
    }

    getStatus(): LayerStatus {
        return this._status;
    }

    getData(): TData | null {
        return this._data;
    }

    getSettingsContext(): SettingsContext<TSettings> {
        return this._settingsContext;
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
        this._settingsContext.getDelegate().setLayerManager(layerManager);

        if (layerManager) {
            const unsubscribeFunc1 = layerManager
                .getPublishSubscribeHandler()
                .makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(() => {
                this.handleSharedSettingsChanged();
            });

            const unsubscribeFunc2 = layerManager
                .getPublishSubscribeHandler()
                .makeSubscriberFunction(LayerManagerTopic.SETTINGS_CHANGED)(() => {
                this.handleSharedSettingsChanged();
            });

            this._unsubscribeFuncs.push(unsubscribeFunc1);
            this._unsubscribeFuncs.push(unsubscribeFunc2);
        } else {
            this._unsubscribeFuncs.forEach((unsubscribeFunc) => {
                unsubscribeFunc();
            });
            this._unsubscribeFuncs = [];
        }
    }

    handleSharedSettingsChanged(): void {
        const parentGroup = this._owner.getItemDelegate().getParentGroup();
        if (parentGroup) {
            const sharedSettings: SharedSetting[] = parentGroup.getAncestorAndSiblingItems(
                (item) => item instanceof SharedSetting
            ) as SharedSetting[];
            const overriddenSettings: { [K in keyof TSettings]: TSettings[K] } = {} as {
                [K in keyof TSettings]: TSettings[K];
            };
            for (const setting of sharedSettings) {
                const type = setting.getWrappedSetting().getType();
                if (this._settingsContext.getDelegate().getSettings()[type] && overriddenSettings[type] === undefined) {
                    overriddenSettings[type] = setting.getWrappedSetting().getDelegate().getValue();
                }
            }
            this._settingsContext.getDelegate().setOverriddenSettings(overriddenSettings);
        }
    }

    getLayerManager(): LayerManager {
        if (this._layerManager === null) {
            throw new Error("LayerManager not set");
        }
        return this._layerManager;
    }

    makeSnapshotGetter<T extends LayerDelegateTopic>(topic: T): () => LayerDelegatePayloads<TData>[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerDelegateTopic.STATUS) {
                return this._status;
            }
            if (topic === LayerDelegateTopic.DATA) {
                return this._data;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<LayerDelegateTopic> {
        return this._publishSubscribeHandler;
    }

    getError(): StatusMessage | string | null {
        if (!this._error) {
            return null;
        }

        const name = this._owner.getItemDelegate().getName();

        if (typeof this._error === "string") {
            return `${name}: ${this._error}`;
        }

        return {
            ...this._error,
            message: `${name}: ${this._error.message}`,
        };
    }

    private setStatus(status: LayerStatus): void {
        this._status = status;
        this._layerManager?.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
        this._publishSubscribeHandler.notifySubscribers(LayerDelegateTopic.STATUS);
    }

    private getQueryClient(): QueryClient | null {
        return this._layerManager?.getQueryClient() ?? null;
    }

    private async maybeCancelQuery(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._queryKeys.length > 0) {
            for (const queryKey of this._queryKeys) {
                await queryClient.cancelQueries(
                    {
                        queryKey,
                        exact: true,
                        fetchStatus: "fetching",
                        type: "active",
                    },
                    {
                        silent: true,
                        revert: true,
                    }
                );
                await queryClient.invalidateQueries({ queryKey });
                queryClient.removeQueries({ queryKey });
            }
            this._queryKeys = [];
        }

        this._cancellationPending = false;
    }

    async maybeRefetchData(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._cancellationPending) {
            return;
        }

        this.setStatus(LayerStatus.LOADING);

        try {
            this._data = await this._owner.fechData(queryClient);
            if (this._queryKeys.length === null && isDevMode()) {
                console.warn(
                    "Did you forget to use 'setQueryKeys' in your layer implementation of 'fetchData'? This will cause the queries to not be cancelled when settings change and might lead to undesired behaviour."
                );
            }
            this._queryKeys = [];
            this._publishSubscribeHandler.notifySubscribers(LayerDelegateTopic.DATA);
            this.setStatus(LayerStatus.SUCCESS);
        } catch (error: any) {
            if (error.constructor?.name === "CancelledError") {
                this.setStatus(LayerStatus.IDLE);
                return;
            }
            const apiError = ApiErrorHelper.fromError(error);
            if (apiError) {
                this._error = apiError.makeStatusMessage();
            } else {
                this._error = "An error occurred";
            }
            this.setStatus(LayerStatus.ERROR);
        }
    }
}
