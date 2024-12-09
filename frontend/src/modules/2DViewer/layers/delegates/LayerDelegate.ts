import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { isDevMode } from "@lib/utils/devMode";
import { QueryClient, isCancelledError } from "@tanstack/react-query";

import { PublishSubscribe, PublishSubscribeDelegate } from "./PublishSubscribeDelegate";
import { SettingsContextDelegateTopic } from "./SettingsContextDelegate";
import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

import { LayerManager, LayerManagerTopic } from "../LayerManager";
import { SharedSetting } from "../SharedSetting";
import { BoundingBox, Layer, SerializedLayer, Settings, SettingsContext } from "../interfaces";

export enum LayerDelegateTopic {
    STATUS = "STATUS",
    DATA = "DATA",
    SUBORDINATED = "SUBORDINATED",
}

export enum LayerColoringType {
    NONE = "NONE",
    COLORSCALE = "COLORSCALE",
    COLORSET = "COLORSET",
}

export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
}

export type LayerDelegatePayloads<TData> = {
    [LayerDelegateTopic.STATUS]: LayerStatus;
    [LayerDelegateTopic.DATA]: TData;
    [LayerDelegateTopic.SUBORDINATED]: boolean;
};
export class LayerDelegate<TSettings extends Settings, TData>
    implements PublishSubscribe<LayerDelegateTopic, LayerDelegatePayloads<TData>>
{
    private _owner: Layer<TSettings, TData>;
    private _settingsContext: SettingsContext<TSettings>;
    private _layerManager: LayerManager;
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();
    private _cancellationPending: boolean = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayerDelegateTopic>();
    private _queryKeys: unknown[][] = [];
    private _status: LayerStatus = LayerStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;
    private _boundingBox: BoundingBox | null = null;
    private _valueRange: [number, number] | null = null;
    private _coloringType: LayerColoringType;
    private _isSubordinated: boolean = false;

    constructor(
        owner: Layer<TSettings, TData>,
        layerManager: LayerManager,
        settingsContext: SettingsContext<TSettings>,
        coloringType: LayerColoringType
    ) {
        this._owner = owner;
        this._layerManager = layerManager;
        this._settingsContext = settingsContext;
        this._coloringType = coloringType;

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "settings-context",
            this._settingsContext
                .getDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(() => {
                this.handleSettingsChange();
            })
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.SHARED_SETTINGS_CHANGED)(() => {
                this.handleSharedSettingsChanged();
            })
        );

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "layer-manager",
            layerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(() => {
                this.handleSharedSettingsChanged();
            })
        );
    }

    handleSettingsChange(): void {
        this._cancellationPending = true;
        this.maybeCancelQuery().then(() => {
            this.maybeRefetchData();
        });
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

    getBoundingBox(): BoundingBox | null {
        return this._boundingBox;
    }

    getColoringType(): LayerColoringType {
        return this._coloringType;
    }

    isSubordinated(): boolean {
        return this._isSubordinated;
    }

    setIsSubordinated(isSubordinated: boolean): void {
        if (this._isSubordinated === isSubordinated) {
            return;
        }
        this._isSubordinated = isSubordinated;
        this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.SUBORDINATED);
    }

    getValueRange(): [number, number] | null {
        return this._valueRange;
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
            for (const sharedSetting of sharedSettings) {
                const type = sharedSetting.getWrappedSetting().getType();
                const setting = this._settingsContext.getDelegate().getSettings()[type];
                if (setting && overriddenSettings[type] === undefined) {
                    if (
                        sharedSetting.getWrappedSetting().getDelegate().isInitialized() &&
                        sharedSetting.getWrappedSetting().getDelegate().isValueValid()
                    ) {
                        overriddenSettings[type] = sharedSetting.getWrappedSetting().getDelegate().getValue();
                    } else {
                        overriddenSettings[type] = null;
                    }
                }
            }
            this._settingsContext.getDelegate().setOverriddenSettings(overriddenSettings);
        }
    }

    getLayerManager(): LayerManager {
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
            if (topic === LayerDelegateTopic.SUBORDINATED) {
                return this._isSubordinated;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<LayerDelegateTopic> {
        return this._publishSubscribeDelegate;
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

    async maybeRefetchData(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._cancellationPending) {
            return;
        }

        if (this._isSubordinated) {
            return;
        }

        this.setStatus(LayerStatus.LOADING);
        this.invalidateBoundingBox();
        this.invalidateValueRange();

        try {
            this._data = await this._owner.fechData(queryClient);
            if (this._owner.makeBoundingBox) {
                this._boundingBox = this._owner.makeBoundingBox();
            }
            if (this._owner.makeValueRange) {
                this._valueRange = this._owner.makeValueRange();
            }
            if (this._queryKeys.length === null && isDevMode()) {
                console.warn(
                    "Did you forget to use 'setQueryKeys' in your layer implementation of 'fetchData'? This will cause the queries to not be cancelled when settings change and might lead to undesired behaviour."
                );
            }
            this._queryKeys = [];
            this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.DATA);
            this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
            this.setStatus(LayerStatus.SUCCESS);
        } catch (error: any) {
            if (isCancelledError(error)) {
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

    serializeState(): SerializedLayer<TSettings> {
        const itemState = this._owner.getItemDelegate().serializeState();
        return {
            ...itemState,
            type: "layer",
            layerClass: this._owner.constructor.name,
            settings: this._settingsContext.getDelegate().serializeSettings(),
        };
    }

    deserializeState(serializedLayer: SerializedLayer<TSettings>): void {
        this._owner.getItemDelegate().deserializeState(serializedLayer);
        this._settingsContext.getDelegate().deserializeSettings(serializedLayer.settings);
    }

    beforeDestroy(): void {
        this._settingsContext.getDelegate().beforeDestroy();
        this._unsubscribeHandler.unsubscribeAll();
    }

    private setStatus(status: LayerStatus): void {
        if (this._status === status) {
            return;
        }

        this._status = status;
        this._layerManager.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
        this._publishSubscribeDelegate.notifySubscribers(LayerDelegateTopic.STATUS);
    }

    private getQueryClient(): QueryClient | null {
        return this._layerManager?.getQueryClient() ?? null;
    }

    private invalidateBoundingBox(): void {
        this._boundingBox = null;
    }

    private invalidateValueRange(): void {
        this._valueRange = null;
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
}
